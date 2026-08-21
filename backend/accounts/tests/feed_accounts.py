"""
Database seeding script for accounts app
Run this script after migrations to populate initial data

Kullanım:
1. Projenizin ana dizininde olduğunuzdan emin olun.
2. 'python <script_path>/seed_accounts.py' komutunu çalıştırın.
"""
import os
import sys
import django

# Script nereden çalıştırılırsa çalışsın, proje kökünü bul
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))  # script dizini
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../"))  # 2 seviye yukarı backend
sys.path.insert(0, BACKEND_DIR)

# Django ayarlarını yükle
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lunova_backend.settings')  # settings.py konumuna göre değiştir
django.setup()

# Modelleri import et
from accounts.models import (
    User, UserRole, ExpertProfile, ClientProfile, AdminProfile,
    Service, AddictionType, University, DegreeLevel, Major,
    Specialization, Language, ApproachMethod, TargetGroup, SessionType,
    GenderChoices, Document, DocumentType
)
from django.core.files.base import ContentFile
from django.utils.text import slugify
from django.db.utils import IntegrityError
import random
from datetime import date, timedelta
from PIL import Image
from io import BytesIO


# ==============================================================================
# 1. Sabit Veriler (Dummy Data)
# ==============================================================================

TURKISH_FIRST_NAMES = [
    "Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Mustafa", "Emine", "Zeynep", "Elif"
]
ENGLISH_FIRST_NAMES = [
    "John", "Jane", "Michael", "Sarah", "David", "Emma", "William", "Olivia"
]
SURNAMES = [
    "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Smith", "Johnson", "Brown"
]

UNIVERSITIES_DATA = [
    "İstanbul Üniversitesi", "Ankara Üniversitesi", "Ege Üniversitesi",
    "Hacettepe Üniversitesi", "Boğaziçi Üniversitesi", "Ondokuz Mayıs Üniversitesi"
]

DEGREE_LEVELS_DATA = ["Lisans", "Yüksek Lisans", "Doktora", "Önlisans"]
MAJORS_DATA = ["Psikoloji", "Psikiyatri", "Sosyal Hizmetler", "Rehberlik ve Psikolojik Danışmanlık"]
SPECIALIZATIONS_DATA = ["Bağımlılık Terapisi", "Travma Odaklı Terapi", "Çift ve Aile Terapisi", "Cinsel Terapi"]
LANGUAGES_DATA = [{"name": "Türkçe", "code": "tr"}, {"name": "İngilizce", "code": "en"},
                  {"name": "Almanca", "code": "de"}]
APPROACH_METHODS_DATA = ["Bilişsel Davranışçı Terapi (BDT)", "Kabul ve Kararlılık Terapisi (ACT)", "EMDR",
                         "Psikodinamik Terapi"]
TARGET_GROUPS_DATA = ["Ergen", "Yetişkin", "Aile", "Çocuk"]
SESSION_TYPES_DATA = ["Online", "Yüz Yüze", "Karma"]

ABOUT_TEXTS = [
    "Uzman psikolog, bilişsel davranışçı terapi alanında 10+ yıllık deneyimli.",
    "Aile terapisi uzmanı, çift ve aile dinamikleri üzerine çalışıyorum.",
    "Çocuk ve ergen psikolojisi konusunda uzmanım, oyun terapisi uyguluyorum.",
    "Bağımlılık tedavisi ve rehabilitasyon süreçlerinde uzmanlaşmış terapistim.",
]

SERVICE_DATA = [
    {
        "name": "Bilişsel Terapi",
        "slug": "bilissel-terapi",
        "description": "Çok özel bir terapi türü."
    },
    {
        "name": "Bireysel Danışmanlık",
        "slug": "bireysel-danismanlik",
        "description": "Birebir psikolojik danışmanlık hizmetleri."
    },
    {
        "name": "Çift Terapisi",
        "slug": "cift-terapisi",
        "description": "Evlilik ve ilişki sorunlarına yönelik seanslar."
    },
    {
        "name": "Grup Terapisi",
        "slug": "grup-terapisi",
        "description": "Belirli konular üzerine grup seansları."
    },
    {
        "name": "Supervizyon",
        "slug": "supervizyon",
        "description": "Meslektaşlara yönelik süpervizyon hizmetleri."
    },
]


ADDICTION_TYPE_DATA = [
    {"name": "Alkol Bağımlılığı", "slug": "alkol-bagimliligi"},
    {"name": "Madde Bağımlılığı", "slug": "madde-bagimliligi"},
    {"name": "Dijital Bağımlılık", "slug": "dijital-bagimlilik"},
    {"name": "Kumar Bağımlılığı", "slug": "kumar-bagimliligi"},
    {"name": "Yeme Bozuklukları", "slug": "yeme-bozukluklari"},
]

SUPPORT_GOALS = [
    "Bağımlılıktan kurtulmak ve sağlıklı bir yaşam sürdürmek.",
    "Aile içi sorunları çözmek ve iletişimi güçlendirmek.",
    "Stres yönetimi ve anksiyete ile başa çıkmak.",
    "İlişki sorunlarını çözmek ve daha mutlu bir yaşam sürmek.",
]

# ==============================================================================
# 1b. İsimlendirilmiş Ekip Hesapları (gerçek ekip üyeleri test edebilsin diye)
# ==============================================================================
# Her isim için BİR uzman (<isim>@mail.com) + o uzmana ATANMIŞ bir danışan
# (danisan_<isim>@mail.com) çifti oluşturulur - ekip üyeleri kendi isimleriyle
# giriş yapıp uzman/danışan iki tarafı da tek bir eşleşmiş çift üzerinden test
# edebilsin (özellikle Notlar/mesajlaşma özelliği bir eşleşmiş çift gerektirir).
# Diğer test kullanıcılarıyla aynı domain (mail.com) ve aynı şifre kullanılır.
NAMED_TEAM_MEMBERS = [
    "selin", "selen", "onur", "ece", "eslem", "gokcen", "niga", "mustafa", "yusuf",
]
NAMED_TEAM_SURNAMES = [
    "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Aydın", "Arslan", "Doğan",
]
TEAM_EMAIL_DOMAIN = "mail.com"
TEAM_PASSWORD = "password123"


# ==============================================================================
# 2. Besleme Fonksiyonları
# ==============================================================================

def safe_seed(model, data_list, unique_field, defaults_func=None):
    """Genel amaçlı basit modeller için besleme fonksiyonu."""
    model_name = model.__name__
    for data in data_list:
        if isinstance(data, str):
            defaults = {"name": data}
            filter_kwargs = {"name": data}
        elif isinstance(data, dict):
            filter_kwargs = {unique_field: data[unique_field]}
            defaults = data
            if defaults_func:
                defaults = defaults_func(data)
        else:
            print(f"⚠️ Bilinmeyen veri tipi: {data}")
            continue

        try:
            # Sadece filteleme alanını kullanıyoruz, slugify gibi işlemler defaults'ta.
            obj, created = model.objects.get_or_create(
                **filter_kwargs,
                defaults=defaults
            )
            if created:
                print(f"  ✓ {model_name} oluşturuldu: {getattr(obj, unique_field)}")
            else:
                print(f"  ○ {model_name} zaten mevcut: {getattr(obj, unique_field)}")
        except IntegrityError as e:
            print(f"  ❌ {model_name} oluşturulurken hata: {e} - Veri: {filter_kwargs}")


def seed_core_models():
    """Tüm basit yardımcı modelleri besler."""
    print("✨ Yardımcı (İlişkisel) Modeller Besleniyor...")

    print("\n-- Service --")
    safe_seed(Service, SERVICE_DATA, "slug", lambda d: d)

    print("\n-- AddictionType --")

    # Yeni, daha güvenli veri listesi:
    STATIC_ADDICTION_TYPES = [
        {"name": "Alkol Bağımlılığı", "slug": "alkol-bagimliligi"},
        {"name": "Madde Bağımlılığı", "slug": "madde-bagimliligi"},
        {"name": "Dijital Bağımlılık", "slug": "dijital-bagimlilik"},
        {"name": "Kumar Bağımlılığı", "slug": "kumar-bagimliligi"},
        {"name": "Yeme Bozuklukları", "slug": "yeme-bozukluklari"},
    ]

    # Tekil alan olarak 'slug'u kullan.
    safe_seed(AddictionType, STATIC_ADDICTION_TYPES, "slug", lambda d: d)

    print("\n-- University --")
    safe_seed(University, UNIVERSITIES_DATA, "name")

    print("\n-- DegreeLevel --")
    safe_seed(DegreeLevel, DEGREE_LEVELS_DATA, "name")

    print("\n-- Major --")
    safe_seed(Major, MAJORS_DATA, "name")

    print("\n-- Specialization --")
    safe_seed(Specialization, SPECIALIZATIONS_DATA, "name")

    print("\n-- Language --")
    safe_seed(Language, LANGUAGES_DATA, "code", lambda d: d)  # 'code' benzersiz alan

    print("\n-- ApproachMethod --")
    safe_seed(ApproachMethod, APPROACH_METHODS_DATA, "name")

    print("\n-- TargetGroup --")
    safe_seed(TargetGroup, TARGET_GROUPS_DATA, "name")

    print("\n-- SessionType --")
    safe_seed(SessionType, SESSION_TYPES_DATA, "name")


def seed_admin_user():
    """Admin kullanıcısı oluşturur."""
    print("\n-- Admin Kullanıcısı --")
    email = "admin@lunova.com"
    try:
        if User.objects.filter(email=email).exists():
            print(f"  ○ Admin kullanıcısı ({email}) zaten mevcut.")
            admin_user = User.objects.get(email=email)
        else:
            admin_user = User.objects.create_superuser(
                email=email,
                password='adminpassword',
                first_name='Site',
                last_name='Admin',
                role=UserRole.ADMIN,
                username='siteadmin'  # AbstractUser'dan gelen username alanı için
            )
            # AdminProfile oluştur (OneToOneField)
            AdminProfile.objects.create(user=admin_user)
            print(f"  ✓ Admin kullanıcısı oluşturuldu: {email}")
        return admin_user
    except Exception as e:
        print(f"  ❌ Admin kullanıcısı oluşturulurken hata: {e}")
        return None


def seed_expert_profiles(count=20):
    """Örnek uzman profilleri oluşturur."""
    print(f"\n-- {count} Uzman Profili Oluşturuluyor --")

    # İlişkisel verileri önbelleğe al
    services = list(Service.objects.all())
    universities = list(University.objects.all())
    degree_levels = list(DegreeLevel.objects.all())
    majors = list(Major.objects.all())
    specializations = list(Specialization.objects.all())
    languages = list(Language.objects.all())
    approach_methods = list(ApproachMethod.objects.all())
    target_groups = list(TargetGroup.objects.all())
    session_types = list(SessionType.objects.all())

    # Eğer ilişkisel veri yoksa, besleme hatası olmaması için kontrol et
    if not all([universities, degree_levels, majors, specializations, languages, approach_methods, target_groups,
                session_types]):
        print("  ⚠️ Uzman profilleri için gerekli ilişkisel veriler eksik. Devam ediliyor...")
        if not services:
            print("  ❌ Hata: 'Service' modeli boş. Lütfen önce 'Service' modelini besleyin.")
            return

    for i in range(1, count + 1):
        try:
            # İsim ve e-posta oluşturma
            first_name = random.choice(TURKISH_FIRST_NAMES + ENGLISH_FIRST_NAMES)
            last_name = random.choice(SURNAMES)
            email = f"expert{i}@mail.com"

            # Doğum tarihi (25-65 yaş arası)
            today = date.today()
            birth_date = today - timedelta(days=random.randint(25 * 365, 65 * 365))

            # Rastgele 11 haneli TC Kimlik Numarası (Benzersizliği sağlamak için basitçe rastgele)
            # Django'nun validator'ını geçmesi için sadece rakam
            id_number = ''.join(random.choices('123456789', k=1) + random.choices('0123456789', k=10))

            user = User.objects.filter(email=email).first()
            if user:
                if ExpertProfile.objects.filter(user=user).exists():
                    print(f"  ○ Uzman profili zaten mevcut: {user.get_full_name()} ({email})")
                    continue
            else:
                user = User.objects.create_user(
                    email=email,
                    password='password123',
                    first_name=first_name,
                    last_name=last_name,
                    role=UserRole.EXPERT,
                    birth_date=birth_date,
                    gender=random.choice(GenderChoices.choices)[0],
                    id_number=id_number,
                    phone_number=f"+90{random.randint(5000000000, 5999999999)}"
                )

            # Uzman Profili oluştur
            expert_profile = ExpertProfile.objects.create(
                user=user,
                about=random.choice(ABOUT_TEXTS),
                approval_status=random.choice([True, True, False]),  # Çoğunlukla onaylı
                title=f"{random.choice(['Uzman', 'Klinik'])} {random.choice(['Psikolog', 'Terapist'])}",
                experience_years=random.randint(3, 20),
                session_price=random.uniform(300, 1500),
                video_intro_url=random.choice([
                    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    None,
                    "https://vimeo.com/420455802"
                ]),
                availability_status=random.choice(
                    [c[0] for c in ExpertProfile._meta.get_field('availability_status').choices]),
                rating_average=random.uniform(3.5, 5.0),
                rating_count=random.randint(10, 200),

                # İlişkisel alanları ata
                university=random.choice(universities) if universities else None,
                degree_level=random.choice(degree_levels) if degree_levels else None,
                major=random.choice(majors) if majors else None,
            )

            # ManyToMany alanları ata (Rastgele 1-3 adet)
            def set_random_m2m(manager, items):
                if items:
                    num_items = random.randint(1, min(3, len(items)))
                    manager.set(random.sample(items, num_items))

            set_random_m2m(expert_profile.services, services)
            set_random_m2m(expert_profile.specializations, specializations)
            set_random_m2m(expert_profile.languages, languages)
            set_random_m2m(expert_profile.approach_methods, approach_methods)
            set_random_m2m(expert_profile.target_groups, target_groups)
            set_random_m2m(expert_profile.session_types, session_types)

            print(f"\r\033[K  ✓ Uzman oluşturuldu: {user.get_full_name()} ({email}) - {expert_profile.title}", end='', flush=True)

        except Exception as e:
            print(f"  ❌ Uzman oluşturulurken hata ({email}): {e}")
            
    print(f"\r\033[K-- {count} Uzman Profili Oluşturuldu --")


def seed_client_profiles(count=100):
    """Örnek danışan profilleri oluşturur."""
    print(f"\n-- {count} Danışan Profili Oluşturuluyor --")

    addiction_types = list(AddictionType.objects.all())
    experts = list(ExpertProfile.objects.filter(approval_status=True).all())  # Onaylı uzmanları ata

    for i in range(1, count + 1):
        try:
            # İsim ve e-posta oluşturma
            first_name = random.choice(TURKISH_FIRST_NAMES + ENGLISH_FIRST_NAMES)
            last_name = random.choice(SURNAMES)
            email = f"client{i}@mail.com"

            # Doğum tarihi (18-70 yaş arası)
            today = date.today()
            birth_date = today - timedelta(days=random.randint(18 * 365, 70 * 365))

            # Rastgele 11 haneli TC Kimlik Numarası (Benzersizliği sağlamak için basitçe rastgele)
            id_number = ''.join(random.choices('123456789', k=1) + random.choices('0123456789', k=10))

            # Önce kullanıcı var mı kontrol et
            user = User.objects.filter(email=email).first()
            if user:
                # Eğer kullanıcı zaten varsa ve ClientProfile var mı kontrol et
                if ClientProfile.objects.filter(user=user).exists():
                    print(f"  ○ Danışan profili zaten mevcut: {user.get_full_name()} ({email})")
                    continue
            else:
                # Kullanıcı yoksa oluştur
                user = User.objects.create_user(
                    email=email,
                    password='password123',
                    first_name=first_name,
                    last_name=last_name,
                    role=UserRole.CLIENT,
                    birth_date=birth_date,
                    gender=random.choice(GenderChoices.choices)[0],
                    id_number=id_number,
                    phone_number=f"+90{random.randint(5000000000, 5999999999)}"
                )

            # Danışan Profili oluştur
            assigned_expert = random.choice(
                experts) if experts and random.random() < 0.7 else None  # %70 ihtimalle uzman ata
            client_profile = ClientProfile.objects.create(
                user=user,
                expert=assigned_expert,
                received_service_before=random.choice([True, False]),
                support_goal=random.choice(SUPPORT_GOALS),
                onboarding_complete=random.choice([True, True, False]),
                is_active_in_treatment=random.choice([True, True, True, False])
            )

            # Bağımlılık türleri ata (Rastgele 0-2 adet)
            if addiction_types:
                num_substances = random.randint(0, min(2, len(addiction_types)))
                if num_substances > 0:
                    selected_substances = random.sample(addiction_types, num_substances)
                    client_profile.substances_used.set(selected_substances)

            print(f"\r\033[K  ✓ Danışan oluşturuldu: {user.get_full_name()} ({email})", end='', flush=True)

        except Exception as e:
            print(f"  ❌ Danışan oluşturulurken hata ({email}): {e}")
            
    print(f"\r\033[K-- {count} Danışan Profili Oluşturuldu --")


def seed_named_team_accounts():
    """Ekip üyeleri için isimlendirilmiş, tahmin edilebilir test hesapları.

    NAMED_TEAM_MEMBERS'taki her isim için bir uzman + o uzmana ATANMIŞ bir
    danışan (aynı isim, "danisan_" önekiyle) oluşturulur. Uzmanlar bilinçli
    olarak approval_status=True ile oluşturulur (ekip ekstra bir admin onay
    adımına takılmadan test edebilsin). Fonksiyon idempotent: zaten var olan
    bir hesabı/profili tekrar oluşturmaz, sadece eksik olanı tamamlar.
    """
    print(f"\n-- {len(NAMED_TEAM_MEMBERS)} İsimlendirilmiş Ekip Hesabı (uzman + danışan çifti) Oluşturuluyor --")

    services = list(Service.objects.all())
    universities = list(University.objects.all())
    degree_levels = list(DegreeLevel.objects.all())
    majors = list(Major.objects.all())
    specializations = list(Specialization.objects.all())
    languages = list(Language.objects.all())
    approach_methods = list(ApproachMethod.objects.all())
    target_groups = list(TargetGroup.objects.all())
    session_types = list(SessionType.objects.all())
    addiction_types = list(AddictionType.objects.all())

    def set_random_m2m(manager, items, k=3):
        if items:
            manager.set(random.sample(items, min(k, len(items))))

    for i, name in enumerate(NAMED_TEAM_MEMBERS):
        surname = NAMED_TEAM_SURNAMES[i % len(NAMED_TEAM_SURNAMES)]
        first_name = name.capitalize()

        # --- Uzman tarafı ---
        expert_email = f"{name}@{TEAM_EMAIL_DOMAIN}"
        expert_user = User.objects.filter(email=expert_email).first()
        if expert_user and ExpertProfile.objects.filter(user=expert_user).exists():
            print(f"  ○ Ekip uzmanı zaten mevcut: {expert_email}")
            expert_profile = ExpertProfile.objects.get(user=expert_user)
        else:
            if not expert_user:
                today = date.today()
                birth_date = today - timedelta(days=random.randint(28 * 365, 55 * 365))
                id_number = ''.join(random.choices('123456789', k=1) + random.choices('0123456789', k=10))
                expert_user = User.objects.create_user(
                    email=expert_email,
                    password=TEAM_PASSWORD,
                    first_name=first_name,
                    last_name=surname,
                    role=UserRole.EXPERT,
                    birth_date=birth_date,
                    gender=random.choice(GenderChoices.choices)[0],
                    id_number=id_number,
                    phone_number=f"+90{random.randint(5000000000, 5999999999)}"
                )
            expert_profile = ExpertProfile.objects.create(
                user=expert_user,
                about=random.choice(ABOUT_TEXTS),
                approval_status=True,
                title=f"{random.choice(['Uzman', 'Klinik'])} {random.choice(['Psikolog', 'Terapist'])}",
                experience_years=random.randint(3, 20),
                session_price=random.uniform(300, 1500),
                availability_status="available",
                rating_average=random.uniform(4.0, 5.0),
                rating_count=random.randint(10, 200),
                university=random.choice(universities) if universities else None,
                degree_level=random.choice(degree_levels) if degree_levels else None,
                major=random.choice(majors) if majors else None,
            )
            set_random_m2m(expert_profile.services, services)
            set_random_m2m(expert_profile.specializations, specializations)
            set_random_m2m(expert_profile.languages, languages)
            set_random_m2m(expert_profile.approach_methods, approach_methods)
            set_random_m2m(expert_profile.target_groups, target_groups)
            set_random_m2m(expert_profile.session_types, session_types)
            print(f"  ✓ Ekip uzmanı oluşturuldu: {expert_email} ({first_name} {surname})")

        # --- Danışan tarafı (yukarıdaki uzmana ATANMIŞ) ---
        client_email = f"danisan_{name}@{TEAM_EMAIL_DOMAIN}"
        client_user = User.objects.filter(email=client_email).first()
        if client_user and ClientProfile.objects.filter(user=client_user).exists():
            print(f"  ○ Ekip danışanı zaten mevcut: {client_email}")
            client_profile = ClientProfile.objects.get(user=client_user)
            if client_profile.expert_id != expert_profile.id:
                client_profile.expert = expert_profile
                client_profile.save(update_fields=["expert"])
        else:
            if not client_user:
                today = date.today()
                birth_date = today - timedelta(days=random.randint(20 * 365, 60 * 365))
                id_number = ''.join(random.choices('123456789', k=1) + random.choices('0123456789', k=10))
                client_user = User.objects.create_user(
                    email=client_email,
                    password=TEAM_PASSWORD,
                    first_name=first_name,
                    last_name=surname,
                    role=UserRole.CLIENT,
                    birth_date=birth_date,
                    gender=random.choice(GenderChoices.choices)[0],
                    id_number=id_number,
                    phone_number=f"+90{random.randint(5000000000, 5999999999)}"
                )
            client_profile = ClientProfile.objects.create(
                user=client_user,
                expert=expert_profile,
                received_service_before=random.choice([True, False]),
                support_goal=random.choice(SUPPORT_GOALS),
                onboarding_complete=True,
                is_active_in_treatment=True,
            )
            if addiction_types:
                client_profile.substances_used.set(random.sample(addiction_types, min(2, len(addiction_types))))
            print(f"  ✓ Ekip danışanı oluşturuldu: {client_email} ({first_name} {surname}) -> uzman: {expert_email}")

    print(f"-- Ekip Hesapları Tamamlandı ({len(NAMED_TEAM_MEMBERS)} çift, şifre: {TEAM_PASSWORD}) --")


def seed_mock_documents_varied(count=150):
    """
    Kullanıcılara rastgele tiplerde dokümanlar yükler:
    - PROFILE_PHOTO -> 32x32 px JPEG
    - DEGREE / CV / CONSENT_FORM / OTHER -> basit text/pdf dummy dosya
    Her kullanıcıya 1-3 doküman atanır.
    """
    print("\n-- Mock Documents (Çeşitli Tipler) Yükleniyor --")
    users = list(User.objects.all()[1:count]) # admin kullanıcısını atla

    doc_types = [
        DocumentType.PROFILE_PHOTO, 
        DocumentType.DEGREE,
        DocumentType.CV, 
        DocumentType.CONSENT_FORM, 
        DocumentType.OTHER
    ]

    for user in users:
        # Her kullanıcıya rastgele 1-3 döküman tipi seç
        num_docs = random.randint(1, 3)
        chosen_types = random.sample(doc_types, num_docs)

        for doc_type in chosen_types:
            if doc_type == DocumentType.PROFILE_PHOTO:
                # Profil fotoğrafı üret (JPEG)
                img = Image.new(
                    "RGB", (32, 32),
                    color=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
                )
                buffer = BytesIO()
                img.save(buffer, format="JPEG")
                # Not: name parametresi upload_to fonksiyonuna 'filename' olarak gider.
                file_content = ContentFile(buffer.getvalue(), name="profile.jpg")
            else:
                # Diğerleri için dummy text/pdf içeriği
                dummy_text = f"İçerik: {doc_type} - Kullanıcı: {user.get_full_name()} (Role: {user.role})"
                file_content = ContentFile(dummy_text.encode('utf-8'), name=f"document.txt")

            # Mevcut aynı tip dökümanı temizle (get_or_create mantığına benzer temizlik)
            old_docs = Document.objects.filter(user=user, type=doc_type)
            for old_doc in old_docs:
                if old_doc.file:
                    old_doc.file.delete(save=False)
                old_doc.delete()

            # Yeni kaydı oluştur
            # Bu aşamada Document.upload_document_path tetiklenecek ve dosya
            # experts/{id}/... veya clients/{id}/... yoluna gidecektir.
            doc = Document.objects.create(
                user=user,
                type=doc_type,
                file=file_content,
                is_primary=random.choice([True, False])
            )

            print(f"  ✓ {user.role.upper()} | {doc_type} yüklendi: {user.get_full_name()} -> Path: {doc.file.name}")

def main():
    """Ana besleme fonksiyonu"""
    print("🌱 Veritabanı Besleme Başlatılıyor (accounts app)...")
    print("=" * 60)

    try:
        # 1. Yardımcı modelleri besle
        seed_core_models()

        print("\n" + "=" * 60)

        # 2. Kullanıcı/Profil modellerini besle
        seed_admin_user()
        seed_expert_profiles(count=15)  # Uzman sayısını artırdım
        seed_named_team_accounts()      # Ekip için isimlendirilmiş uzman+danışan çiftleri (bkz. NAMED_TEAM_MEMBERS)
        seed_client_profiles(count=80)  # Danışan sayısını artırdım
        # seed_mock_documents_varied(count=150)

        print("\n" + "=" * 60)
        print("✅ Veritabanı Besleme Başarıyla Tamamlandı!")

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ Besleme sırasında kritik hata: {type(e).__name__}: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()