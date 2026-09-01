from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone

from appointments.models import Appointment
from .models import Notification

# "2-3 gün içerisinde yaklaşan randevu" isteği - üst sınır 3 gün olarak seçildi.
UPCOMING_WINDOW = timedelta(days=3)
# Okunmuş bildirimler 20 gün sonra listeden (ve DB'den) kaldırılır.
READ_RETENTION = timedelta(days=20)


def _appointment_datetime(appointment):
    naive = datetime.combine(appointment.date, appointment.time)
    return timezone.make_aware(naive, timezone.get_default_timezone())


def _reminder_title(appointment, user):
    other_party = appointment.expert if appointment.client_id == user.id else appointment.client
    return f"Yaklaşan randevu: {other_party.get_full_name()}"


def _reminder_body(appointment):
    local_dt = timezone.localtime(_appointment_datetime(appointment))
    return f"{local_dt.strftime('%d.%m.%Y')} {local_dt.strftime('%H:%M')}"


def sync_appointment_reminders(user):
    """Kullanıcının önümüzdeki UPCOMING_WINDOW içindeki onaylanmış randevuları
    için (yoksa) bir Notification satırı oluşturur.

    `dedupe_key` üzerindeki unique constraint sayesinde `get_or_create`
    idempotent - bu fonksiyon her `GET /notifications/` çağrısında yeniden
    çalıştırılabilir, var olan (okunmuş ya da okunmamış) bir bildirimin
    üzerine yazmaz / read state'ini sıfırlamaz.
    """
    now = timezone.now()
    window_end = now + UPCOMING_WINDOW

    candidates = Appointment.objects.filter(
        Q(expert=user) | Q(client=user),
        status='confirmed',
        is_deleted=False,
        date__range=[now.date(), window_end.date()],
    )

    for appointment in candidates:
        appt_dt = _appointment_datetime(appointment)
        if not (now <= appt_dt <= window_end):
            continue

        Notification.objects.get_or_create(
            user=user,
            dedupe_key=f"appointment_reminder:{appointment.id}",
            defaults={
                'notification_type': 'appointment_reminder',
                'title': _reminder_title(appointment, user),
                'body': _reminder_body(appointment),
                'appointment': appointment,
            },
        )


def cleanup_old_read_notifications(user):
    """Okunma tarihinin üzerinden READ_RETENTION geçmiş bildirimleri siler."""
    cutoff = timezone.now() - READ_RETENTION
    Notification.objects.filter(
        user=user, is_read=True, read_at__lt=cutoff
    ).delete()


def create_message_notification(message):
    """messaging.Message oluşturulduktan hemen sonra çağrılır - alıcı için
    bir 'yeni not' bildirimi oluşturur.

    `message` parametresi bilinçli olarak type-hint'siz/duck-typed bırakıldı
    (sadece .id, .body, .sender_id, .sender, .conversation kullanılıyor) -
    messaging app'inin notifications'ı import etmesi gerekiyor (bildirim
    oluşturmak için), bu yüzden ters yönde bir import (notifications ->
    messaging) döngüsel bağımlılık yaratır.

    `dedupe_key=f"message:{message.id}"` sayesinde idempotent - aynı mesaj
    için tekrar çağrılırsa (örn. bir retry) ikinci bir bildirim oluşmaz.
    """
    conversation = message.conversation
    recipient_id = (
        conversation.client_id
        if message.sender_id == conversation.expert_id
        else conversation.expert_id
    )
    preview = message.body if len(message.body) <= 80 else message.body[:77] + "..."

    Notification.objects.get_or_create(
        user_id=recipient_id,
        dedupe_key=f"message:{message.id}",
        defaults={
            'notification_type': 'message',
            'title': f"Yeni not: {message.sender.get_full_name()}",
            'body': preview,
            'related_user_id': message.sender_id,
        },
    )


def create_document_status_notification(document):
    """accounts.Document onaylandığında/reddedildiğinde belge sahibine bir
    bildirim üretir - create_message_notification ile aynı 'duck-typed
    parametre' deseni (sadece .status/.uid/.user_id/.get_type_display()/
    .original_filename okunuyor, accounts modeline type-hint bağımlılığı yok).

    get_or_create DEĞİL update_or_create kullanılıyor: aynı belge birden
    fazla kez incelenirse (örn. reddedilip sonra tekrar onaylanırsa) var olan
    bildirim satırı güncellenir ve is_read sıfırlanır - kullanıcı en güncel
    kararı kaçırmaz (appointment_reminder/message'ın aksine burada 'ilk karar
    kalıcıdır' varsayımı geçerli değil, admin fikrini değiştirebilir).
    status='pending' için hiçbir bildirim üretilmez (henüz bir karar yok).
    """
    if document.status == 'approved':
        title = f"Belgeniz onaylandı: {document.get_type_display()}"
    elif document.status == 'rejected':
        title = f"Belgeniz reddedildi: {document.get_type_display()}"
    else:
        return None

    notification, _ = Notification.objects.update_or_create(
        user_id=document.user_id,
        dedupe_key=f"document_status:{document.uid}",
        defaults={
            'notification_type': 'document_status',
            'title': title,
            'body': document.original_filename,
            'is_read': False,
            'read_at': None,
        },
    )
    return notification


def create_payment_required_notification(appointment):
    """Bir randevu onaylandığında (ya da uzman tarafından oluşturulduğunda)
    ödeme gerektiği ama henüz ödenmediği durumda DANIŞANA bir bildirim üretir -
    appointments/views.py::status_update() ve appointments/serializers.py::
    CreateAppointmentWithZoomSerializer.create() tarafından, payments.services.
    resolve_appointment_payment() False dönünce çağrılır. Tıklanınca frontend
    "Ödemeler" sayfasına (?appointmentId=) gider - appointment_reminder ile aynı
    appointment FK'sini kullanıyor, yeni bir alan gerekmedi.
    """
    expert_name = appointment.expert.get_full_name()
    Notification.objects.get_or_create(
        user_id=appointment.client_id,
        dedupe_key=f"payment_required:{appointment.id}",
        defaults={
            'notification_type': 'payment_required',
            'title': "Ödeme bekleniyor",
            'body': f"{expert_name} ile olan seansınız için ödeme yapmanız gerekiyor.",
            'appointment': appointment,
        },
    )


def create_group_waitlist_spot_available_notification(waitlist_entry):
    """Bir grup seansında yer açıldığında (bir katılımcı iptal ettiğinde)
    bekleme listesindeki sıradaki kişiye bildirim üretir - bkz.
    payments/services.py::promote_next_from_waitlist(). dedupe_key
    waitlist_entry'nin kendi pk'sine bağlı, aynı bildirim tekrar üretilmez.
    Faz 2'de eklenen Notification.group_session FK'si ile artık tıklanınca
    ilgili gruba deep-link verilebiliyor."""
    group_session = waitlist_entry.group_session
    Notification.objects.get_or_create(
        user_id=waitlist_entry.client_id,
        dedupe_key=f"group_waitlist_spot_available:{waitlist_entry.id}",
        defaults={
            'notification_type': 'group_waitlist_spot_available',
            'title': "Grup seansında yeriniz açıldı",
            'body': f"{group_session.session_offering.name} grup seansında bir yer açıldı, "
                    "doğrudan katılımcı listesine eklendiniz. Ödeme yapmanız gerekiyor.",
            'group_session': group_session,
        },
    )


def create_group_join_requested_notification(participant):
    """Bir danışan bir grup seansına katılım talebi gönderdiğinde UZMANA
    bildirim üretir (Faz 1/2, Frontend Yapılandırması planı) -
    payments/services.py::request_join_group_session() tarafından çağrılır
    (pending_approval durumuna düşen talepler için - waitlist'e düşen bir
    talep için ÇAĞRILMAZ, uzmanın inceleyeceği bir şey yok)."""
    group_session = participant.group_session
    client_name = participant.client.get_full_name()
    Notification.objects.get_or_create(
        user_id=group_session.expert_id,
        dedupe_key=f"group_join_requested:{participant.id}",
        defaults={
            'notification_type': 'group_join_requested',
            'title': "Yeni grup seansı katılım talebi",
            'body': f"{client_name}, {group_session.session_offering.name} grup seansına katılmak istiyor.",
            'group_session': group_session,
        },
    )


def create_group_payment_required_notification(participant):
    """Bir katılımcının talebi onaylandığında (ya da bekleme listesinden
    terfi ettiğinde) DANIŞANA "ödeme gerekiyor" bildirimi üretir -
    payment_required'ın grup seansı karşılığı. update_or_create kullanılır -
    aynı katılımcı waitlist'ten terfi + doğrudan onay gibi iki farklı yoldan
    (teorik olarak) tekrar bu duruma düşerse bildirim metni güncellenir."""
    group_session = participant.group_session
    Notification.objects.update_or_create(
        user_id=participant.client_id,
        dedupe_key=f"group_payment_required:{participant.id}",
        defaults={
            'notification_type': 'group_payment_required',
            'title': "Grup seansı için ödeme bekleniyor",
            'body': f"{group_session.session_offering.name} grup seansına katılımınız onaylandı. "
                    "Yerinizi kesinleştirmek için ödeme yapmanız gerekiyor.",
            'group_session': group_session,
            'is_read': False,
            'read_at': None,
        },
    )


def create_group_join_rejected_notification(participant):
    """Uzman bir talebi reddettiğinde DANIŞANA bildirim üretir."""
    group_session = participant.group_session
    Notification.objects.get_or_create(
        user_id=participant.client_id,
        dedupe_key=f"group_join_rejected:{participant.id}",
        defaults={
            'notification_type': 'group_join_rejected',
            'title': "Grup seansı talebiniz reddedildi",
            'body': f"{group_session.session_offering.name} grup seansına katılım talebiniz uzman "
                    "tarafından reddedildi.",
            'group_session': group_session,
        },
    )


def create_group_payment_succeeded_notification(participant):
    """Bir grup seansı katılımcısının ödemesi tamamlandığında hem danışana
    hem uzmana bildirim üretir - create_payment_succeeded_notification'ın
    appointment=None olduğu için hiç çalışmadığı grup seansı akışı için
    ayrı bir fonksiyon (bkz. o fonksiyonun erken dönüşü)."""
    group_session = participant.group_session
    client_name = participant.client.get_full_name()

    Notification.objects.get_or_create(
        user_id=participant.client_id,
        dedupe_key=f"group_payment_succeeded_client:{participant.id}",
        defaults={
            'notification_type': 'payment_succeeded',
            'title': "Ödemeniz alındı",
            'body': f"{group_session.session_offering.name} grup seansı için ödemeniz tamamlandı.",
            'group_session': group_session,
        },
    )
    Notification.objects.get_or_create(
        user_id=group_session.expert_id,
        dedupe_key=f"group_payment_succeeded_expert:{participant.id}",
        defaults={
            'notification_type': 'payment_succeeded',
            'title': "Danışan grup seansı ödemesini tamamladı",
            'body': f"{client_name}, {group_session.session_offering.name} grup seansı için ödemesini tamamladı.",
            'group_session': group_session,
        },
    )


def create_group_session_cancelled_notification(client, group_session):
    """Bir grup seansı iptal edildiğinde (bkz. payments/services.py::
    cancel_group_session()) HEM onaylanmış (approved - "açıkta kalan")
    katılımcılara HEM bekleme listesindekilere gönderilir (kullanıcı kararı -
    waitlist'e de bilgilendirme gitsin, aktarma değil sadece haber). `client`
    bilinçli olarak bir User nesnesi (id DEĞİL) - waitlist kaydı silinmeden
    ÖNCE çağrılır ama katılımcı satırı silinmez, dedupe_key yine de
    client_id+group_session_id'ye bağlı (entry.id'ye değil - entry siliniyor)."""
    Notification.objects.get_or_create(
        user_id=client.id,
        dedupe_key=f"group_session_cancelled:{group_session.id}:{client.id}",
        defaults={
            'notification_type': 'group_session_cancelled',
            'title': "Grup seansı iptal edildi",
            'body': f"{group_session.session_offering.name} ({group_session.date.strftime('%d.%m.%Y')}) "
                    "grup seansı uzman tarafından iptal edildi.",
            'group_session': group_session,
        },
    )


def create_group_participant_reassigned_notification(participant, *, source_group_session, target_group_session):
    """Admin panelinden bir katılımcı başka bir grup seansına aktarıldığında
    (bkz. payments/services.py::reassign_group_participant()) DANIŞANA bir
    bildirim üretir - eski/yeni grup bilgisiyle. Bir danışan birden fazla kez
    aktarılabileceği için dedupe_key hedef+katılımcıya bağlı (her aktarım
    ayrı bir bildirim üretir, update_or_create DEĞİL get_or_create - geçmiş
    aktarım bildirimleri kaybolmasın)."""
    Notification.objects.get_or_create(
        user_id=participant.client_id,
        dedupe_key=f"group_participant_reassigned:{participant.id}:{target_group_session.id}",
        defaults={
            'notification_type': 'group_participant_reassigned',
            'title': "Başka bir grup seansına aktarıldınız",
            'body': f"İptal edilen {source_group_session.session_offering.name} grup seansındaki yeriniz, "
                    f"{target_group_session.date.strftime('%d.%m.%Y')} tarihli yeni bir gruba aktarıldı.",
            'group_session': target_group_session,
        },
    )


def create_free_trial_ready_notification(appointment):
    """Uzman onayladığında/randevu oluşturduğunda danışanın ömür boyu bir kez
    hakkı olan ücretsiz ilk seansı devreye girdiğinde (appointment.is_free_trial
    işaretlenince, henüz Payment oluşmadan) DANIŞANA bir bildirim üretir -
    create_payment_required_notification'ın "devam et" karşılığı, payments.
    services.confirm_free_trial() çağrılana kadar Zoom açılmaz. Tıklanınca
    frontend aynı "Ödemeler" sayfasına (?appointmentId=) gider - payment_required
    ile aynı appointment FK'sini kullanır.
    """
    expert_name = appointment.expert.get_full_name()
    Notification.objects.get_or_create(
        user_id=appointment.client_id,
        dedupe_key=f"free_trial_ready:{appointment.id}",
        defaults={
            'notification_type': 'free_trial_ready',
            'title': "Ücretsiz ilk seansınız onayınızı bekliyor",
            'body': f"{expert_name} ile olan seansınız ücretsiz ilk seans hakkınızla planlandı. "
                    "Devam etmek için onaylamanız gerekiyor.",
            'appointment': appointment,
        },
    )


def create_appointment_created_notification(appointment):
    """Bir randevu ilk oluşturulduğunda çağrılır - mailer.services.
    send_appointment_created_email()'in aynı durum-bazlı dallanmasını mirror
    eder (appointments/serializers.py -> ClientCreateAppointmentSerializer.
    create() ve CreateAppointmentWithZoomSerializer.create() tarafından,
    mail çağrısının hemen yanında çağrılır):

    - status == 'waiting_approval' (danışan talep etti) -> UZMANA
      ('appointment_requested' - incelemesi gereken yeni bir talep var).
    - diğer her durum (uzman doğrudan oluşturdu, model varsayılanı 'pending')
      -> DANIŞANA ('appointment_created' - kendisi için yeni bir randevu var).
    """
    date_str = appointment.date.strftime('%d.%m.%Y')
    time_str = appointment.time.strftime('%H:%M')

    if appointment.status == 'waiting_approval':
        client_name = appointment.client.get_full_name()
        Notification.objects.get_or_create(
            user_id=appointment.expert_id,
            dedupe_key=f"appointment_created:{appointment.id}",
            defaults={
                'notification_type': 'appointment_requested',
                'title': "Yeni bir randevu talebiniz var",
                'body': f"{client_name}, {date_str} {time_str} için bir randevu talep etti.",
                'appointment': appointment,
            },
        )
    else:
        expert_name = appointment.expert.get_full_name()
        Notification.objects.get_or_create(
            user_id=appointment.client_id,
            dedupe_key=f"appointment_created:{appointment.id}",
            defaults={
                'notification_type': 'appointment_created',
                'title': "Sizin için yeni bir randevu oluşturuldu",
                'body': f"{expert_name} ile {date_str} {time_str} tarihli bir randevunuz oluşturuldu.",
                'appointment': appointment,
            },
        )


def create_appointment_confirmed_notification(appointment, *, is_first_match=False):
    """Bir randevu status='confirmed' olduğunda (ödeme zaten yapılmış/gerekmiyor
    dalı - is_free_trial/payment_required dalları KENDİ bildirimlerini üretiyor,
    bkz. create_free_trial_ready_notification/create_payment_required_notification)
    DANIŞANA bildirim üretir - mailer.services.send_appointment_confirmed_email()'in
    in-app karşılığı. `is_first_match=True` ise (bu danışan-uzman çiftinin İLK
    onaylanan randevusu - bkz. appointments/views.py::status_update() içindeki
    hesaplama) body'e uzmanın artık atandığını belirten bir cümle eklenir."""
    date_str = appointment.date.strftime('%d.%m.%Y')
    time_str = appointment.time.strftime('%H:%M')
    expert_name = appointment.expert.get_full_name()

    body = f"{expert_name} ile {date_str} {time_str} tarihli randevunuz onaylandı."
    if is_first_match:
        body += f" {expert_name} artık uzmanınız olarak atandı."

    Notification.objects.get_or_create(
        user_id=appointment.client_id,
        dedupe_key=f"appointment_confirmed:{appointment.id}",
        defaults={
            'notification_type': 'appointment_confirmed',
            'title': "Randevunuz onaylandı",
            'body': body,
            'appointment': appointment,
        },
    )


def create_new_client_matched_notification(appointment):
    """SADECE bir danışan-uzman çiftinin İLK onaylanan randevusunda UZMANA
    bildirim üretir ("yeni bir danışanla eşleştiniz") - appointments/views.py::
    status_update()'teki is_first_match hesaplamasıyla gated, tekrarlanan
    (mevcut bir danışanın yeni bir randevusu onaylanan) durumlarda hiç
    çağrılmaz. dedupe_key randevuya değil DANIŞAN-UZMAN ÇİFTİNE bağlı - aynı
    çift için birden fazla randevu bu fonksiyonu tetiklemeye çalışsa bile
    (teorik olarak, is_first_match zaten bunu engelliyor) idempotent kalır."""
    client_name = appointment.client.get_full_name()
    Notification.objects.get_or_create(
        user_id=appointment.expert_id,
        dedupe_key=f"new_client_matched:{appointment.client_id}:{appointment.expert_id}",
        defaults={
            'notification_type': 'appointment_confirmed',
            'title': "Yeni bir danışanla eşleştiniz",
            'body': f"{client_name} ile ilk randevunuz onaylandı - artık danışanınız.",
            'appointment': appointment,
        },
    )


def create_appointment_cancellation_notification(appointment, *, actor):
    """Bir randevu status='cancel_requested' ya da 'cancelled' olduğunda
    çağrılır - mailer.services.send_appointment_cancellation_email()'in aynı
    dallanmasını mirror eder (appointments/views.py::status_update() ve
    appointments/services.py::cancel_appointment()'ın ikisinden de, mail
    çağrısının hemen yanında çağrılır):

    - status == 'cancel_requested' (sadece danışan tetikleyebilir) -> UZMANA.
    - status == 'cancelled' -> `actor` OLMAYAN tarafa (işlemi yapmayan taraf).

    dedupe_key appointment.status'ü de içeriyor - aynı randevuda önce
    cancel_requested sonra cancelled aşamalarının İKİSİ de ayrı birer
    bildirim olarak birikebilsin diye (appointment.id tek başına yetseydi
    ikinci durum ilkinin üzerine yazardı ya da get_or_create'te sessizce
    atlanırdı)."""
    date_str = appointment.date.strftime('%d.%m.%Y')
    time_str = appointment.time.strftime('%H:%M')

    if appointment.status == 'cancel_requested':
        client_name = appointment.client.get_full_name()
        Notification.objects.get_or_create(
            user_id=appointment.expert_id,
            dedupe_key=f"appointment_cancellation:{appointment.id}:cancel_requested",
            defaults={
                'notification_type': 'appointment_cancel_requested',
                'title': "Bir danışanınız randevusunu iptal etmek istiyor",
                'body': f"{client_name}, {date_str} {time_str} tarihli randevusu için iptal talebinde bulundu.",
                'appointment': appointment,
            },
        )
        return

    # status == 'cancelled' -> işlemi yapmayan taraf bilgilendirilir
    if actor.id == appointment.client_id:
        recipient_id, other_name = appointment.expert_id, appointment.client.get_full_name()
    else:
        recipient_id, other_name = appointment.client_id, appointment.expert.get_full_name()

    Notification.objects.get_or_create(
        user_id=recipient_id,
        dedupe_key=f"appointment_cancellation:{appointment.id}:cancelled",
        defaults={
            'notification_type': 'appointment_cancelled',
            'title': "Randevunuz iptal edildi",
            'body': f"{other_name} ile {date_str} {time_str} tarihli randevunuz iptal edildi.",
            'appointment': appointment,
        },
    )


def create_form_submitted_notification(response):
    """Bir danışan bir form gönderdiğinde (forms/views.py::FormSubmitView.post())
    HER ZAMAN (risk seviyesinden bağımsız) danışanın atanmış uzmanına bildirim
    üretir - atanmış uzman yoksa (ClientProfile.expert boş) sessizce hiçbir
    şey yapmaz, bildirilecek belirli bir kişi yok (kullanıcı kararı).

    `response` parametresi diğer create_*_notification fonksiyonlarıyla aynı
    "duck-typed, ilgili app'i import etmeyen leaf-app" deseninde değil bu
    kez - forms zaten notifications'tan önce yükleniyor, döngü riski yok,
    ama yine de sadece .id/.user/.risk_level okunuyor."""
    from accounts.models import ClientProfile

    client_profile = ClientProfile.objects.filter(user_id=response.user_id).select_related('expert__user').first()
    if not client_profile or not client_profile.expert_id:
        return

    client_name = response.user.get_full_name()
    Notification.objects.get_or_create(
        user_id=client_profile.expert.user_id,
        dedupe_key=f"form_submitted:{response.id}",
        defaults={
            'notification_type': 'form_submitted',
            'title': "Yeni bir form gönderimi var",
            'body': f"{client_name}, {response.form.title} formunu doldurdu.",
        },
    )


def create_payment_succeeded_notification(payment):
    """Bir ödeme başarıyla tamamlandığında (Payment.status=SUCCEEDED) hem
    danışana hem uzmana ayrı birer bildirim üretir - payments/services.py'nin
    gerçek bir ödeme/onay akışının tamamlandığı noktalarından
    (_mock_complete_checkout, handle_checkout_callback'in DIRECT dalı,
    capture_preauth, confirm_free_trial) çağrılır. amount=0 + metadata.free_trial
    ise (ücretsiz ilk seans onayı) metin buna göre dallanır - "ödemeniz alındı"
    demek yanıltıcı olurdu.

    `payment` parametresi diğer create_*_notification fonksiyonlarıyla aynı
    "duck-typed, ilgili app'i import etmeyen leaf-app" deseninde (sadece
    .id/.amount/.metadata/.appointment okunuyor).
    """
    appointment = payment.appointment
    if appointment is None:
        return

    client_name = appointment.client.get_full_name()
    expert_name = appointment.expert.get_full_name()
    is_free_trial = payment.amount == 0 and payment.metadata.get('free_trial')

    if is_free_trial:
        client_title = "Ücretsiz ilk seansınız onaylandı"
        client_body = f"{expert_name} ile olan ücretsiz ilk seansınız onaylandı."
        expert_title = "Danışan ücretsiz ilk seansını onayladı"
        expert_body = f"{client_name} ücretsiz ilk seansını onayladı."
    else:
        client_title = "Ödemeniz alındı"
        client_body = f"{expert_name} ile olan seansınız için ödemeniz tamamlandı."
        expert_title = "Danışan ödemesi alındı"
        expert_body = f"{client_name} seansı için ödemesini tamamladı."

    Notification.objects.get_or_create(
        user_id=appointment.client_id,
        dedupe_key=f"payment_succeeded_client:{payment.id}",
        defaults={
            'notification_type': 'payment_succeeded',
            'title': client_title,
            'body': client_body,
            'appointment': appointment,
        },
    )
    Notification.objects.get_or_create(
        user_id=appointment.expert_id,
        dedupe_key=f"payment_succeeded_expert:{payment.id}",
        defaults={
            'notification_type': 'payment_succeeded',
            'title': expert_title,
            'body': expert_body,
            'appointment': appointment,
        },
    )
