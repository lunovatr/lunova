from rest_framework import serializers
from .models import (
    Appointment, GroupSession, GroupSessionParticipant, GroupSessionParticipantStatus,
    GroupSessionStatus, GroupSessionWaitlist,
)
from .services import grant_appointment_access_if_paid
from mailer.services import send_appointment_created_email, send_payment_required_email, send_free_trial_ready_email
from notifications.services import create_payment_required_notification, create_free_trial_ready_notification
from availability.models import WeeklyAvailability, AvailabilityException
from accounts.models import ExpertProfile, User


def _default_individual_offering():
    """Booking akışı (uzman/danışan tarafından oluşturulan bireysel randevu)
    hâlâ sadece bireysel terapi üretiyor - Faz 2 (Frontend Yapılandırması
    planı). Var olan randevular zaten migration'la aynı şekilde işaretlenmişti
    (bkz. catalog app'i, appointments 0004 migration'ı); bu, yeni oluşturulan
    randevular için tutarlılığı korur. `catalog` app'i henüz feed edilmemişse
    (örn. taze bir test DB'si) None döner - Appointment.session_offering zaten
    nullable olduğu için bu sessizce eskisi gibi davranır."""
    from catalog.models import SessionOffering
    return SessionOffering.objects.filter(code='individual_therapy').first()


class AppointmentSerializer(serializers.ModelSerializer):
    expert_name = serializers.CharField(source='expert.get_full_name', read_only=True)
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    payment_status = serializers.SerializerMethodField()
    session_price = serializers.SerializerMethodField()
    session_currency = serializers.SerializerMethodField()
    # Faz 2 (Frontend Yapılandırması planı) - önceden hiç serialize edilmiyordu,
    # uzman panelinin randevu tablosunda "hangi hizmet" (bireysel/grup) ve
    # "hangi teslimat şekli" (online/yüz yüze) görünmesi için eklendi.
    session_type_name = serializers.CharField(source='session_type.name', read_only=True, default=None)
    session_offering_name = serializers.CharField(source='session_offering.name', read_only=True, default=None)
    # SADECE ilgili uzman kendi randevusuna baktığında dolar - danışan kendi
    # ödediği tutarı zaten session_price'tan görüyor, platformun payını/uzmanın
    # net kazancını GÖRMEMELİ (Faz 2, madde 6).
    expert_earning = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'expert', 'client', 'expert_name', 'client_name',
            'date', 'time', 'duration', 'is_confirmed', 'notes', 'status',
            'session_type', 'session_type_name', 'session_offering', 'session_offering_name',
            'zoom_start_url', 'zoom_join_url', 'zoom_meeting_id',
            'payment_status', 'session_price', 'session_currency', 'is_free_trial', 'expert_earning',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'zoom_start_url', 'zoom_join_url', 'zoom_meeting_id', 'created_at', 'updated_at',
            # sistem tarafından hesaplanan bir bayrak (payments.services.resolve_appointment_payment) -
            # client'ın PATCH /appointments/{id}/ ile doğrudan yazabilmesine izin verilmemeli.
            'is_free_trial',
        ]

    def get_expert_earning(self, obj):
        request = self.context.get('request')
        if request is None or not request.user.is_authenticated or request.user.id != obj.expert_id:
            return None
        from payments.models import Payment, PaymentStatus
        payment = Payment.objects.filter(
            appointment=obj, status=PaymentStatus.SUCCEEDED
        ).order_by('-created_at').first()
        return payment.expert_earning if payment is not None else None

    def get_payment_status(self, obj):
        """'not_applicable' (henüz confirmed/completed değil - ödeme sorusu
        gündemde değil), 'unpaid' (ödeme bekleniyor) ya da 'paid' (ücretsiz ilk
        seans dahil - amount=0 SUCCEEDED de 'paid' sayılır). bkz.
        payments/services.py::has_appointment_been_paid - appointments,
        payments'ı serbestçe import edebilir (tersi değil, bkz.
        payments/services.py modül docstring'i)."""
        if obj.status not in ('confirmed', 'completed'):
            return 'not_applicable'
        from payments.services import has_appointment_been_paid
        return 'paid' if has_appointment_been_paid(obj) else 'unpaid'

    def _resolve_display_price(self, obj):
        """Ödenmiş bir randevu için GERÇEKTEN tahsil edilen tutarı (Payment
        kaydı - ileride PricingRule değişse bile geçmiş doğru kalsın diye),
        ödenmemiş/uygulanamaz bir randevu için GÜNCEL fiyatı (Faz 2'nin
        PricingRule katmanından - bkz. payments.services.get_effective_price)
        döner. İkisi de tek bir noktadan (bu fonksiyon) geçtiği için
        session_price/session_currency birbirinden bağımsız iki ayrı sorguya
        düşmüyor - sonuç obj üzerinde önbelleklenir (aynı obj için bu ikisi
        art arda çağrıldığında tek sorgu yeterli olsun diye)."""
        cached = getattr(obj, '_display_price_cache', None)
        if cached is not None:
            return cached

        result = self._compute_display_price(obj)
        obj._display_price_cache = result
        return result

    def _compute_display_price(self, obj):
        if obj.status in ('confirmed', 'completed'):
            from payments.models import Payment, PaymentStatus
            payment = Payment.objects.filter(
                appointment=obj, status=PaymentStatus.SUCCEEDED
            ).order_by('-created_at').first()
            if payment is not None:
                return payment.amount, payment.currency

        expert_profile = getattr(obj.expert, 'expertprofile', None)
        if expert_profile is None:
            return None, None
        from payments.services import get_effective_price
        pricing = get_effective_price(expert_profile, session_offering=obj.session_offering)
        return pricing['amount'], pricing['currency']

    def get_session_price(self, obj):
        price, _ = self._resolve_display_price(obj)
        return price

    def get_session_currency(self, obj):
        _, currency = self._resolve_display_price(obj)
        return currency


class CreateAppointmentWithZoomSerializer(serializers.ModelSerializer):
    expert_name = serializers.CharField(source='expert.get_full_name', read_only=True)
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'expert', 'client', 'expert_name', 'client_name',
            'date', 'time', 'duration', 'is_confirmed', 'notes', 'status',
            'zoom_start_url', 'zoom_join_url', 'zoom_meeting_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['zoom_start_url', 'zoom_join_url', 'zoom_meeting_id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """
        Uzman randevu oluştururken gerekli validasyonlar
        """
        # Ek güvenlik kontrolü: Sadece uzmanlar randevu oluşturabilir
        user = self.context['request'].user
        if not hasattr(user, 'role') or user.role != 'expert':
            raise serializers.ValidationError("Sadece uzmanlar bu şekilde randevu oluşturabilir.")
        
        # Expert zorunlu
        if 'expert' not in data:
            raise serializers.ValidationError("Uzman seçimi zorunludur.")
        
        # Tarih ve saat zorunlu
        if 'date' not in data or 'time' not in data:
            raise serializers.ValidationError("Tarih ve saat bilgisi zorunludur.")
        
        # Aynı tarih+saat için uzmanın başka randevusu var mı kontrol et
        existing_appointment = Appointment.objects.filter(
            expert=data['expert'],
            date=data['date'],
            time=data['time'],
            status__in=['pending', 'waiting_approval', 'confirmed']
        ).exists()
        
        if existing_appointment:
            raise serializers.ValidationError(
                "Bu tarih ve saatte uzmanın başka bir randevusu bulunmaktadır."
            )
        
        return data
    
    def create(self, validated_data):
        """Create appointment; Zoom meeting is created only if the client has
        already paid (or still has their free first session) - bkz.
        appointments/services.py::grant_appointment_access_if_paid. Ödeme
        gerekiyorsa (28. tur) genel "randevu oluşturuldu" maili yerine ödeme
        talebi maili + bildirimi gönderilir."""
        validated_data.setdefault('session_offering', _default_individual_offering())
        appointment = Appointment.objects.create(**validated_data)

        if grant_appointment_access_if_paid(appointment):
            send_appointment_created_email(appointment)
        elif appointment.is_free_trial:
            send_free_trial_ready_email(appointment)
            create_free_trial_ready_notification(appointment)
        else:
            send_payment_required_email(appointment)
            create_payment_required_notification(appointment)

        return appointment


class ClientCreateAppointmentSerializer(serializers.ModelSerializer):
    """
    Danışanların randevu oluşturması için serializer
    """
    expert_name = serializers.CharField(source='expert.get_full_name', read_only=True)
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    client = serializers.HiddenField(default=serializers.CurrentUserDefault())
    expert_user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'expert', 'expert_user_id', 'client', 'expert_name', 'client_name',
            'date', 'time', 'duration', 'notes', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['expert', 'status', 'created_at', 'updated_at']
    
    def validate(self, data):
        """
        Danışan randevu oluştururken gerekli validasyonlar ve ID/Nesne dönüşümü
        """
        user = self.context['request'].user
        
        # Güvenlik ve Zorunluluk Kontrolleri
        if not hasattr(user, 'role') or user.role != 'client':
            raise serializers.ValidationError("Sadece danışanlar bu şekilde randevu talebi oluşturabilir.")

        expert_uid = data.get('expert_user_id')
        if not expert_uid:
            raise serializers.ValidationError("Uzman seçimi zorunludur.")
            
        if 'date' not in data or 'time' not in data:
            raise serializers.ValidationError("Tarih ve saat bilgisi zorunludur.")

        appointment_date = data['date']
        appointment_time = data['time']

        try:
            # ExpertProfile, User ID ile ilişkili olduğu için çekilir.
            expert_profile = ExpertProfile.objects.get(user_id=expert_uid)
        except ExpertProfile.DoesNotExist:
            raise serializers.ValidationError({"expert_user_id": "Seçilen ID ile eşleşen bir uzman profili bulunamadı."})
            
        # --- ADIM 2: User Nesnesini Çekme (Appointment kaydı için zorunlu) ---
        # Appointment.expert = User nesnesi beklediği için çekilir.
        try:
             expert_user_obj = User.objects.get(id=expert_uid)
        except User.DoesNotExist:
             raise serializers.ValidationError({"expert_user_id": "Kullanıcı bulunamadı."})

        # --- ADIM 3: Appointment Modeli için User Nesnesini Atama ---
        data['expert'] = expert_user_obj 

        # 1. Uzmanın başka randevusu var mı kontrol et (Appointment.expert -> User)
        existing_appointment = Appointment.objects.filter(
            expert_id=expert_uid,
            date=appointment_date,
            time=appointment_time,
            status='confirmed',
            is_deleted=False
        ).exists()

        if existing_appointment:
            raise serializers.ValidationError("Bu tarih ve saatte uzmanın başka bir randevusu bulunmaktadır.")

        # 2. Client'ın aynı saatte başka randevusu var mı kontrol et (Appointment.client -> User)
        existing_appointment = Appointment.objects.filter(
            client_id=user.id, # En güvenli ve direkt sorgulama yöntemi.
            date=appointment_date,
            time=appointment_time,
            is_deleted=False
        ).first()

        if existing_appointment:
            if existing_appointment.status == 'waiting_approval':
                raise serializers.ValidationError("Bu saat için onay bekleyen bir randevunuz var.")
            elif existing_appointment.status == 'pending':
                raise serializers.ValidationError("Bu saat için uzman onayı bekleyen başka bir randevunuz bulunuyor.")
            elif existing_appointment.status == 'confirmed':
                raise serializers.ValidationError("Bu saat için onaylanmış başka bir randevunuz var.")

        # 3. Uzmanın weekly availability kontrolü (WeeklyAvailability.expert -> ExpertProfile)
        day_of_week = appointment_date.weekday()

        # ExpertProfile nesnesini (expert_profile) kullanarak sorgu yapıyoruz.
        weekly_available = WeeklyAvailability.objects.filter(
            expert=expert_profile,
            day_of_week=day_of_week,
            start_time__lte=appointment_time,
            end_time__gt=appointment_time,
            is_active=True
        ).exists()

        if not weekly_available:
            raise serializers.ValidationError("Uzman bu tarih ve saatte müsait değildir (haftalık program).")

        # 4. Availability exceptions kontrolü (AvailabilityException.expert -> ExpertProfile)
        # Önce normal tarih için kontrol et
        exception = AvailabilityException.objects.filter(
            expert=expert_profile,
            date=appointment_date,
            exception_type='cancel'
        ).first()

        if exception:
            if (exception.start_time and exception.end_time and
                exception.start_time <= appointment_time < exception.end_time):
                raise serializers.ValidationError("Uzman bu tarih ve saatte müsait değildir (özel istisna).")
            elif not exception.start_time and not exception.end_time:
                raise serializers.ValidationError("Uzman bu tarihte müsait değildir (özel istisna).")

        # Tekrarlayan istisnalar için kontrol
        recurring_exceptions = AvailabilityException.objects.filter(
            expert=expert_profile,
            date__month=appointment_date.month,
            date__day=appointment_date.day,
            is_recurring=True,
            exception_type='cancel'
        )

        for rec_exception in recurring_exceptions:
            if (rec_exception.start_time and rec_exception.end_time and
                rec_exception.start_time <= appointment_time < rec_exception.end_time):
                raise serializers.ValidationError("Uzman bu tarih ve saatte müsait değildir (tekrarlayan istisna).")
            elif not rec_exception.start_time and not rec_exception.end_time:
                raise serializers.ValidationError("Uzman bu tarihte müsait değildir (tekrarlayan istisna).")

        return data
    
    def create(self, validated_data):
        """
        Danışan randevusu oluştur - waiting_approval durumunda
        """
        # Giriş amaçlı kullanılan expert_user_id tamsayısını kaldırıyoruz.
        validated_data.pop('expert_user_id')
        
        # 'expert' anahtarında User nesnesi mevcut.
        validated_data['status'] = 'waiting_approval'
        validated_data.setdefault('session_offering', _default_individual_offering())

        appointment = Appointment.objects.create(**validated_data)

        send_appointment_created_email(appointment)

        return appointment


class AppointmentStatusSerializer(serializers.Serializer):
    """
    Randevu durumu güncelleme için yeni serializer
    """
    status = serializers.ChoiceField(
        choices=[
            ('pending', 'Beklemede'),
            ('waiting_approval', 'Onay Bekliyor'),
            ('confirmed', 'Onaylandı'),
            ('cancel_requested', 'İptal Talep Edildi'),
            ('cancelled', 'İptal Edildi'),
            ('completed', 'Tamamlandı'),
        ],
        required=True
    )


class ExpertAppointmentSummarySerializer(serializers.ModelSerializer):
    """
    Expert appointments summary for clients - shows only essential info
    danışan, randevu oluştururken bu uzmanın o tarih saatte müsaitliğini
    görüp ona göre randevu isteği göndermesi için tasarlandı.
    """
    start_time = serializers.TimeField(source='time', read_only=True)
    end_time = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = ['id', 'date', 'start_time', 'end_time', 'status']

    def get_end_time(self, obj):
        from datetime import datetime, timedelta
        # Buffer süreleri: 30->15, 45->20, 60->30 dakika
        """
            30 -> 20
            50 -> 30
            randevu süresi ve mola süresi önerilen olarakk böyle.
            iki tip seansımızın olması uygun gözüküyor. daha sonra rezervasyon oluşturma
            ksımında bir kısıt oluştururuz.
        """
        buffer_minutes = {30:20, 45: 20, 60: 30}.get(obj.duration, 0)
        total_minutes = obj.duration + buffer_minutes

        # Randevu başlangıç datetime
        start_datetime = datetime.combine(obj.date, obj.time)
        # Bitiş datetime
        end_datetime = start_datetime + timedelta(minutes=total_minutes)

        return end_datetime.time()


# ---------------------------------------------------------------------------
# Grup Seansları (Faz 1, Frontend Yapılandırması planı) - "müsaitlik -> talep
# -> onay -> ödeme" akışı. GroupSessionParticipantSerializer BİLİNÇLİ OLARAK
# group_session'ı NESTED ETMEZ (GroupSessionSerializer.get_participants zaten
# bunu kullanıyor - karşılıklı nesting sonsuz döngüye girerdi); "Grup
# Seanslarım" sayfası için tam tersi yönde nesting yapan ayrı bir
# MyGroupParticipationSerializer aşağıda tanımlı.
# ---------------------------------------------------------------------------

class GroupSessionParticipantSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    client_recovery_status = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = GroupSessionParticipant
        fields = [
            'id', 'client', 'client_name', 'client_email', 'client_recovery_status',
            'status', 'payment_status', 'joined_at', 'reviewed_at',
        ]

    def get_client_recovery_status(self, obj):
        client_profile = getattr(obj.client, 'clientprofile', None)
        return client_profile.recovery_status if client_profile else None

    def get_payment_status(self, obj):
        if obj.status != GroupSessionParticipantStatus.APPROVED:
            return 'not_applicable'
        from payments.services import has_group_participant_been_paid
        return 'paid' if has_group_participant_been_paid(obj) else 'unpaid'


class GroupSessionSerializer(serializers.ModelSerializer):
    expert_name = serializers.CharField(source='expert.get_full_name', read_only=True)
    session_offering_name = serializers.CharField(source='session_offering.name', read_only=True)
    session_type_name = serializers.CharField(source='session_type.name', read_only=True, default=None)
    variant_label = serializers.CharField(source='variant.variant_label', read_only=True, default=None)
    approved_count = serializers.SerializerMethodField()
    remaining_spots = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    zoom_join_url = serializers.SerializerMethodField()
    my_participation = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    waitlist = serializers.SerializerMethodField()

    class Meta:
        model = GroupSession
        fields = [
            'id', 'expert', 'expert_name', 'session_offering', 'session_offering_name',
            'session_type', 'session_type_name', 'variant', 'variant_label',
            'date', 'time', 'duration', 'capacity', 'status',
            'approved_count', 'remaining_spots', 'price', 'currency',
            'zoom_join_url', 'my_participation', 'participants', 'waitlist',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'created_at', 'updated_at']

    def _approved_qs(self, obj):
        return obj.participants.filter(status=GroupSessionParticipantStatus.APPROVED)

    def get_approved_count(self, obj):
        return self._approved_qs(obj).count()

    def get_remaining_spots(self, obj):
        return max(obj.capacity - self.get_approved_count(obj), 0)

    def _pricing(self, obj):
        from payments.services import get_effective_price
        expert_profile = getattr(obj.expert, 'expertprofile', None)
        if expert_profile is None:
            return {'amount': None, 'currency': 'TRY'}
        return get_effective_price(expert_profile, session_offering=obj.session_offering, variant=obj.variant)

    def get_price(self, obj):
        return self._pricing(obj)['amount']

    def get_currency(self, obj):
        return self._pricing(obj)['currency']

    def _request_user(self):
        request = self.context.get('request')
        if request is None or not request.user.is_authenticated:
            return None
        return request.user

    def _my_participant(self, obj):
        user = self._request_user()
        if user is None:
            return None
        return obj.participants.filter(client=user).first()

    def get_zoom_join_url(self, obj):
        # Admin Panel Dokümantasyon/Güvenlik turunda düzeltilen bulgu (Sağlık
        # Kontrolü turunda tespit edilmişti): iptal edilmiş bir grubun Zoom
        # linki önceden hâlâ dönüyordu - obj.status hiç kontrol edilmiyordu.
        if obj.status == GroupSessionStatus.CANCELLED:
            return None
        user = self._request_user()
        if user is None:
            return None
        if user.id == obj.expert_id:
            return obj.zoom_join_url

        participant = self._my_participant(obj)
        if participant is None or participant.status != GroupSessionParticipantStatus.APPROVED:
            return None
        from payments.services import has_group_participant_been_paid
        if not has_group_participant_been_paid(participant):
            return None
        return obj.zoom_join_url

    def get_my_participation(self, obj):
        user = self._request_user()
        if user is None or getattr(user, 'role', None) != 'client':
            return None

        participant = self._my_participant(obj)
        if participant is not None:
            return GroupSessionParticipantSerializer(participant, context=self.context).data

        waitlist_entry = obj.waitlist_entries.filter(client=user).first()
        if waitlist_entry is not None:
            return {'id': waitlist_entry.id, 'status': 'waiting', 'payment_status': 'not_applicable'}
        return None

    def get_participants(self, obj):
        """Uzman (grubun sahibi) TÜM katılımcıları (pending_approval/rejected
        dahil) görür; danışanlar SADECE approved olanları görür ("grup
        arkadaşları") - kimse başka bir danışanın bekleyen talebini görmez."""
        user = self._request_user()
        if user is None:
            return []
        qs = obj.participants.select_related('client', 'client__clientprofile')
        if user.id != obj.expert_id:
            qs = qs.filter(status=GroupSessionParticipantStatus.APPROVED)
        return GroupSessionParticipantSerializer(qs, many=True, context=self.context).data

    def get_waitlist(self, obj):
        """Bekleme listesi SADECE grubun sahibi uzmana görünür (Sağlık
        Kontrolü turunda EKLENDİ - önceden uzman panelinde bekleme listesi
        hiç görünmüyordu, salt-okunur bir görünürlük, sıra FIFO
        joined_waitlist_at'e göre)."""
        user = self._request_user()
        if user is None or user.id != obj.expert_id:
            return []
        entries = obj.waitlist_entries.select_related('client').order_by('joined_waitlist_at')
        return [
            {
                'id': entry.id,
                'client': entry.client_id,
                'client_name': entry.client.get_full_name(),
                'client_email': entry.client.email,
                'position': index + 1,
                'joined_waitlist_at': entry.joined_waitlist_at,
                'notified_at': entry.notified_at,
            }
            for index, entry in enumerate(entries)
        ]


class GroupSessionCreateSerializer(serializers.ModelSerializer):
    """Sadece uzman tarafından, yeni bir grup seansı slotu açmak için
    kullanılır - `expert` view içinde `request.user` olarak set edilir."""

    class Meta:
        model = GroupSession
        fields = ['id', 'session_offering', 'session_type', 'variant', 'date', 'time', 'duration', 'capacity']
        read_only_fields = ['id']

    def validate_session_offering(self, value):
        if not value.requires_multi_participant:
            raise serializers.ValidationError(
                "Seçilen seans tipi grup seansı için uygun değil (bireysel bir hizmet)."
            )
        return value

    def validate_capacity(self, value):
        # Sağlık Kontrolü turunda bulunan bug: capacity PositiveIntegerField
        # olduğu için Django'da 0 pozitif sayılır, model seviyesinde
        # reddedilmiyordu - approved_count(0) >= capacity(0) her zaman doğru
        # olduğu için İLK talep bile hiç incelenmeden doğrudan bekleme
        # listesine düşüyordu. Bir "grup" tanım gereği en az 2 kişilik olmalı.
        if value < 2:
            raise serializers.ValidationError("Bir grup seansının kapasitesi en az 2 olmalıdır.")
        return value

    def validate(self, data):
        variant = data.get('variant')
        session_offering = data.get('session_offering')
        if variant is not None and session_offering is not None and variant.session_offering_id != session_offering.id:
            raise serializers.ValidationError({'variant': "Seçilen varyant, seçilen seans tipine ait değil."})
        return data

    def to_representation(self, instance):
        return GroupSessionSerializer(instance, context=self.context).data


class GroupSessionWaitlistSerializer(serializers.ModelSerializer):
    group_session = GroupSessionSerializer(read_only=True)

    class Meta:
        model = GroupSessionWaitlist
        fields = ['id', 'group_session', 'joined_waitlist_at', 'notified_at']


class MyGroupParticipationSerializer(serializers.ModelSerializer):
    """"Grup Seanslarım" sayfasının tek veri kaynağı - group_session'ı TAM
    (grup arkadaşları/approved katılımcılar dahil) nested eder."""
    group_session = GroupSessionSerializer(read_only=True)
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = GroupSessionParticipant
        fields = ['id', 'group_session', 'status', 'payment_status', 'joined_at', 'reviewed_at']

    def get_payment_status(self, obj):
        if obj.status != GroupSessionParticipantStatus.APPROVED:
            return 'not_applicable'
        from payments.services import has_group_participant_been_paid
        return 'paid' if has_group_participant_been_paid(obj) else 'unpaid'