# mailer/services.py
"""Sistem genelinde tüm mail gönderimlerinin tek geçiş noktası.

_dispatch() gerçek gönderim mekanizması - "gerçekten SMTP'ye mi gidilecek
yoksa sadece loglanacak mı" kararı (settings.ENVIRONMENT) SADECE burada
veriliyor. send_template_email() bunun üzerine, mailer/templates/mailer/
base_email.html ortak Lunova şablonuyla hem HTML hem düz metin gövdesi
üreten senkron katman; send_template_email_async() aynısını arka planda bir
thread'de çalıştırıp isteği hiç bloklamayan versiyonu.

Her mail "türü" için send_<tür>_email() adında ayrı bir sarmalayıcı fonksiyon
eklenir (bkz. send_password_reset_email, send_appointment_*_email) -
notifications/services.py'deki "her olay için ayrı bir fonksiyon" deseniyle
tutarlı. Appointment nesnesi bilinçli olarak type-hint'siz/duck-typed
bırakıldı (sadece .id/.date/.time/.status/.expert/.client okunuyor) -
notifications/services.py::create_message_notification()'daki "çağıran taraf
mailer'ı import eder, mailer hiçbir zaman appointments/accounts gibi domain
app'lerini import etmez" ilkesiyle aynı, mailer'ın bağımsız bir "leaf" app
olarak kalmasını sağlıyor.

Gönderim hâlâ kişisel/kurumsal bir Gmail hesabı üzerinden SMTP ile yapılıyor
(EMAIL_HOST_USER) - bu BİLİNÇLİ bir tercih, kullanıcı harici bir transaksiyonel
mail servisine (SendGrid/Mailgun/SES/Postmark vb.) şimdilik geçmek istemedi
(20. tur). Hacim arttıkça (özellikle otomatik randevu durumu mailleri gibi
sık gönderilen türler) Gmail SMTP'nin günlük gönderim limiti ve teslim
edilebilirlik riski (bkz. kök claude.md "🧭 Geliştirme Fikirleri") gündeme
gelebilir - o noktada bu servislerden birine geçiş değerlendirilmeli. _dispatch()
zaten tüm gönderimi TEK bir yerden yaptığı için bu geçiş (ileride gerekirse)
sadece burada, from_email/gönderim mekanizmasında yapılacak, çağıran taraflar
(appointments, accounts) hiç etkilenmeyecek.
"""
import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

# Alıcının gelen kutusunda "Kimden" adının önünde görünen etiket. Adresin
# kendisi (settings.EMAIL_HOST_USER) Gmail SMTP'nin giriş kimliğiyle eşleşmek
# zorunda olduğu için sabit kalıyor (bkz. _dispatch docstring) - değişebilen
# tek şey bu görünen isim, from_name parametresiyle mail türüne göre override
# edilebilir (örn. ileride bir duyuru maili "Lunova Duyuru" kullanmak isteyebilir).
DEFAULT_FROM_NAME = "Lunova Destek"


def _dispatch(to_email: str, subject: str, text_body: str, html_body: str | None, *,
              from_name: str, fail_silently: bool) -> bool:
    """Tüm gönderim yollarının (send_template_email ve dolayısıyla
    send_template_email_async) içeriden çağırdığı temel gönderici.

    Production dışında (settings.ENVIRONMENT != 'Production') gerçekten SMTP'ye
    gidilmez, mail içeriği konsola yazdırılır - dev ortamında gerçek mail
    atmadan konsoldan test edilebilmek için.

    From adresi her zaman settings.EMAIL_HOST_USER (Gmail SMTP, giriş kimliğiyle
    eşleşmek zorunda - farklı bir adrese geçmek deployment'ta sessiz bir teslim
    sorununa yol açabilir). from_name SADECE görünen ismi değiştirir, adresin
    kendisini değil - `"{from_name} <{EMAIL_HOST_USER}>"` şeklinde birleştirilir.

    fail_silently=True verilirse SMTP hatası caller'a exception olarak
    sızdırılmaz, sadece loglanıp False döner. send_template_email_async() bunu
    HER ZAMAN True zorluyor (arka plandaki thread'in zaten dinleyen bir çağıranı
    yok - fırlatılan bir exception sadece Python'un thread hook'una düşüp
    düzgün loglanmadan kaybolurdu). Senkron send_template_email() çağrıları için
    varsayılan False - örn. şifre sıfırlama maili başarısız olursa bunun
    PasswordResetRequestView'a 500 olarak yansıması GEREKİYOR, çünkü o istekte
    mail göndermek yan etki değil isteğin asıl amacı.
    """
    from_email = f"{from_name} <{settings.EMAIL_HOST_USER}>"

    if settings.ENVIRONMENT != 'Production':
        print(f"\n[mailer][dev] Gönderilecek mail (gerçekte gönderilmedi):")
        print(f"\tFrom: {from_email}")
        print(f"\tTo: {to_email}")
        print(f"\tSubject: {subject}")
        print(f"\n{text_body}\n")
        return True

    try:
        message = EmailMultiAlternatives(subject, text_body, from_email, [to_email])
        if html_body:
            message.attach_alternative(html_body, "text/html")
        message.send()
        return True
    except Exception:
        logger.exception("Mail gönderilemedi: to=%s subject=%r", to_email, subject)
        if fail_silently:
            return False
        raise


def send_template_email(to_email: str, subject: str, *, heading: str, intro_paragraphs: list[str],
                         details: list[dict] | None = None, cta_text: str | None = None,
                         cta_url: str | None = None, from_name: str = DEFAULT_FROM_NAME,
                         fail_silently: bool = False) -> bool:
    """Ortak Lunova HTML şablonuyla (mailer/templates/mailer/base_email.html)
    senkron mail gönderir - aynı andan hem HTML hem düz metin (fallback)
    gövdesi üretir. Tüm send_<tür>_email() sarmalayıcılarının (send_password_reset_email
    dahil) çağırdığı ortak nokta budur - "seans ile ilgili durumlar" için
    kullanılan tasarım burada tek bir yerde, mail türüne göre sadece
    heading/intro_paragraphs/details/cta_* içerikleri değişiyor.

    details: [{"label": "Tarih", "value": "01.01.2026"}, ...] şeklinde, şablonda
    küçük bir bilgi kutusu olarak render edilir. cta_url verilirse bir buton
    eklenir (cta_text zorunlu olur).
    """
    context = {
        'subject': subject,
        'heading': heading,
        'intro_paragraphs': intro_paragraphs,
        'details': details or [],
        'cta_text': cta_text,
        'cta_url': cta_url,
    }
    html_body = render_to_string('mailer/base_email.html', context)

    text_lines = [heading, '']
    text_lines.extend(intro_paragraphs)
    if details:
        text_lines.append('')
        text_lines.extend(f"{row['label']}: {row['value']}" for row in details)
    if cta_url:
        text_lines.append('')
        text_lines.append(f"{cta_text}: {cta_url}")
    text_body = '\n'.join(text_lines)

    return _dispatch(to_email, subject, text_body, html_body, from_name=from_name, fail_silently=fail_silently)


def send_template_email_async(to_email: str, subject: str, **kwargs) -> None:
    """send_template_email()'i arka planda bir thread'de çalıştırır - çağıran
    taraf (appointments view/serializer'ları) SMTP round-trip'i kadar
    bloklanmaz, mail gönderimi bittiğini beklemeden yanıtını döner.

    fail_silently HER ZAMAN True'ya zorlanır (üstteki not, bkz. _dispatch) -
    dışarıdan verilse bile görmezden gelinir. Şablon render'ında (render_to_string)
    veya thread başlamadan önce oluşabilecek beklenmeyen bir hata için de ayrıca
    dıştan bir try/except var - _dispatch'in kendi try/except'i sadece SMTP
    gönderimini kapsıyor, olası bir template/context hatası _dispatch'e hiç
    ulaşmadan patlayabilir; thread içindeki HERHANGİ bir hatanın loglanmadan
    kaybolmaması için (Python'un varsayılan thread exception hook'u konsola
    yazar ama logger'a düşmez) bu ek katman eklendi.

    Bilinçli olarak Celery/kuyruk kullanılmadı - proje şu an hiçbir arka plan
    görev altyapısına (Redis/broker) sahip değil, bu boyutta bir sistem için
    threading.Thread yeterli. Bilinen kısıt: uygulama süreci mail gönderilmeden
    ÖNCE çökerse/yeniden başlarsa o mail kaybolur, retry mekanizması yok - kabul
    edilebilir görüldü çünkü mail burada ana veri kaynağı değil (randevu durumu
    zaten DB'ye senkron olarak yazıldı), sadece bir bilgilendirme.
    """
    kwargs['fail_silently'] = True

    def _run():
        try:
            send_template_email(to_email, subject, **kwargs)
        except Exception:
            logger.exception("Async mail gönderimi sırasında beklenmeyen hata: to=%s subject=%r", to_email, subject)

    threading.Thread(target=_run, daemon=True).start()


def send_password_reset_email(to_email: str, reset_url: str, *, first_name: str | None = None) -> bool:
    """Şifre sıfırlama linkini içeren maili gönderir - BİLİNÇLİ OLARAK senkron
    (async değil): bu isteğin asıl amacı bu maili göndermek olduğu için,
    başarısız olursa PasswordResetRequestView bunu kullanıcıya 500 olarak
    yansıtmalı - randevu bildirimleri gibi arka planda "fire and forget"
    gönderilemez.
    accounts.views.views.PasswordResetRequestView tarafından çağrılır."""
    greeting = f"Merhaba {first_name}," if first_name else "Merhaba,"
    return send_template_email(
        to_email,
        subject="Lunova Şifre Sıfırlama İsteği",
        heading="Şifre sıfırlama isteği aldık",
        intro_paragraphs=[
            greeting,
            "Hesabınız için bir şifre sıfırlama talebinde bulunuldu. Aşağıdaki "
            "bağlantıya tıklayarak yeni bir şifre belirleyebilirsiniz.",
            "Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.",
        ],
        cta_text="Şifremi Sıfırla",
        cta_url=reset_url,
    )


def _appointment_date_time(appointment) -> tuple[str, str]:
    """Randevu tarih/saatini şablonda kullanılacak okunabilir formata çevirir -
    tüm send_appointment_*_email() fonksiyonlarının ortak kullandığı yardımcı."""
    return appointment.date.strftime('%d.%m.%Y'), appointment.time.strftime('%H:%M')


def send_appointment_created_email(appointment) -> None:
    """Yeni bir randevu oluşturulduğunda ASENKRON bir bilgilendirme maili
    gönderir. appointment.status'e göre iki farklı senaryoyu tek fonksiyonda
    ele alır (notifications/services.py::create_document_status_notification()'daki
    "tek fonksiyon, durum bazlı dallanma" deseniyle tutarlı):

    - 'waiting_approval' (danışan talep etti, appointments/serializers.py ->
      ClientCreateAppointmentSerializer.create()) -> uzmana bildirilir.
    - diğer her durum (uzman oluşturdu, model varsayılanı 'pending',
      appointments/serializers.py -> CreateAppointmentWithZoomSerializer.create())
      -> danışana bildirilir.
    """
    date_str, time_str = _appointment_date_time(appointment)

    if appointment.status == 'waiting_approval':
        client_name = appointment.client.get_full_name()
        base_url = settings.FRONTEND_URLS.get('expert')
        cta_url = f"{base_url}/reservations?appointmentId={appointment.id}" if base_url else None
        send_template_email_async(
            appointment.expert.email,
            subject="Yeni Randevu Talebi",
            heading="Yeni bir randevu talebiniz var",
            intro_paragraphs=[
                f"Merhaba {appointment.expert.first_name},",
                f"{client_name} sizden {date_str} {time_str} için bir randevu talep etti.",
                "Talebi onaylamak veya reddetmek için panelinize giriş yapabilirsiniz.",
            ],
            details=[
                {'label': 'Danışan', 'value': client_name},
                {'label': 'Tarih', 'value': date_str},
                {'label': 'Saat', 'value': time_str},
            ],
            cta_text="Talebi Görüntüle",
            cta_url=cta_url,
        )
    else:
        expert_name = appointment.expert.get_full_name()
        base_url = settings.FRONTEND_URLS.get('client')
        cta_url = f"{base_url}/appointments/{appointment.id}" if base_url else None
        send_template_email_async(
            appointment.client.email,
            subject="Yeni Randevu Oluşturuldu",
            heading="Sizin için bir randevu planlandı",
            intro_paragraphs=[
                f"Merhaba {appointment.client.first_name},",
                f"Uzmanınız {expert_name}, {date_str} {time_str} için sizinle bir randevu planladı.",
                "Onaylandığında ayrıca bilgilendirileceksiniz.",
            ],
            details=[
                {'label': 'Uzman', 'value': expert_name},
                {'label': 'Tarih', 'value': date_str},
                {'label': 'Saat', 'value': time_str},
            ],
            cta_text="Randevumu Görüntüle",
            cta_url=cta_url,
        )


def send_appointment_confirmed_email(appointment) -> None:
    """Randevu status='confirmed' olduğunda ASENKRON olarak danışana bildirim
    maili gönderir (bu geçişi appointments/views.py::status_update() her zaman
    uzman yaptığı için her zaman danışana bildirilir - kendini bilgilendirmeye
    gerek yok)."""
    date_str, time_str = _appointment_date_time(appointment)
    expert_name = appointment.expert.get_full_name()
    base_url = settings.FRONTEND_URLS.get('client')
    cta_url = f"{base_url}/appointments/{appointment.id}" if base_url else None
    send_template_email_async(
        appointment.client.email,
        subject="Randevunuz Onaylandı",
        heading="Randevunuz onaylandı",
        intro_paragraphs=[
            f"Merhaba {appointment.client.first_name},",
            f"{expert_name} ile {date_str} {time_str} tarihli randevunuz onaylandı.",
            "Görüşme bağlantısı randevu saatine yakın panelinizde aktif olacaktır.",
        ],
        details=[
            {'label': 'Uzman', 'value': expert_name},
            {'label': 'Tarih', 'value': date_str},
            {'label': 'Saat', 'value': time_str},
        ],
        cta_text="Randevumu Görüntüle",
        cta_url=cta_url,
    )


def send_appointment_cancellation_email(appointment, *, actor) -> None:
    """Randevu status='cancel_requested' ya da 'cancelled' olduğunda ASENKRON
    bir bildirim maili gönderir - appointments/views.py::status_update()
    içinden, instance.save()'den SONRA (yeni status zaten appointment.status'te)
    çağrılır. `actor` bu değişikliği yapan User (request.user) - 'cancelled'
    durumunda kimin bilgilendirileceğini (işlemi YAPMAYAN taraf) belirlemek
    için kullanılır.
    """
    date_str, time_str = _appointment_date_time(appointment)

    if appointment.status == 'cancel_requested':
        # Sadece danışan tetikleyebilir (views.py'de zorunlu tutulan kural) -> uzmana bildir
        client_name = appointment.client.get_full_name()
        base_url = settings.FRONTEND_URLS.get('expert')
        cta_url = f"{base_url}/reservations?appointmentId={appointment.id}" if base_url else None
        send_template_email_async(
            appointment.expert.email,
            subject="Randevu İptal Talebi",
            heading="Bir danışanınız randevusunu iptal etmek istiyor",
            intro_paragraphs=[
                f"Merhaba {appointment.expert.first_name},",
                f"{client_name}, {date_str} {time_str} tarihli randevusu için iptal talebinde bulundu.",
                "Talebi onaylamak için panelinize giriş yapabilirsiniz.",
            ],
            details=[
                {'label': 'Danışan', 'value': client_name},
                {'label': 'Tarih', 'value': date_str},
                {'label': 'Saat', 'value': time_str},
            ],
            cta_text="Talebi Görüntüle",
            cta_url=cta_url,
        )
        return

    # appointment.status == 'cancelled' -> işlemi yapmayan taraf bilgilendirilir
    if actor.id == appointment.client_id:
        recipient, other_name = appointment.expert, appointment.client.get_full_name()
        base_url = settings.FRONTEND_URLS.get('expert')
        cta_url = f"{base_url}/reservations?appointmentId={appointment.id}" if base_url else None
    else:
        recipient, other_name = appointment.client, appointment.expert.get_full_name()
        base_url = settings.FRONTEND_URLS.get('client')
        cta_url = f"{base_url}/appointments/{appointment.id}" if base_url else None

    send_template_email_async(
        recipient.email,
        subject="Randevu İptal Edildi",
        heading="Randevunuz iptal edildi",
        intro_paragraphs=[
            f"Merhaba {recipient.first_name},",
            f"{other_name} ile {date_str} {time_str} tarihli randevunuz iptal edildi.",
        ],
        details=[
            {'label': 'Tarih', 'value': date_str},
            {'label': 'Saat', 'value': time_str},
        ],
        cta_text="Randevularımı Görüntüle",
        cta_url=cta_url,
    )
