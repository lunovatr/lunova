# mailer/services.py
"""Sistem genelinde tüm mail gönderimlerinin tek geçiş noktası.

send_email() genel amaçlı, mail türünden bağımsız gönderici - "gerçekten
SMTP'ye mi gidilecek yoksa sadece loglanacak mı" kararı (settings.ENVIRONMENT)
SADECE burada veriliyor. Önceden bu karar accounts/views/views.py içinde
PasswordResetRequestView'a özel yazılmıştı; artık her yeni mail türü (seans
hatırlatması, sistem/duyuru yayını, randevu talebi/iptali, danışan mesajı
bildirimi vb.) bu kontrolü kendi başına tekrarlamak zorunda değil.

Her mail "türü" için send_<tür>_email() adında ayrı bir sarmalayıcı fonksiyon
eklenir (bkz. send_password_reset_email) - notifications/services.py'deki
"her olay için ayrı bir fonksiyon" deseniyle tutarlı. Bilinçli olarak bir
EmailKind enum'u/registry'si veya Django email template'leri YOK: şu an tek
bir mail türü var, henüz ihtiyaç duyulmayan bir soyutlama eklemek yerine yeni
bir tür geldiğinde aynı desende bir fonksiyon daha eklenecek.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail as django_send_mail

logger = logging.getLogger(__name__)

# Alıcının gelen kutusunda "Kimden" adının önünde görünen etiket. Adresin
# kendisi (settings.EMAIL_HOST_USER) Gmail SMTP'nin giriş kimliğiyle eşleşmek
# zorunda olduğu için sabit kalıyor (bkz. send_email docstring) - değişebilen
# tek şey bu görünen isim, from_name parametresiyle mail türüne göre override
# edilebilir (örn. ileride bir duyuru maili "Lunova Duyuru" kullanmak isteyebilir).
DEFAULT_FROM_NAME = "Lunova Destek"


def send_email(to_email: str, subject: str, body: str, *, from_name: str = DEFAULT_FROM_NAME, fail_silently: bool = False) -> bool:
    """Tüm send_<tür>_email() sarmalayıcılarının içeriden çağırdığı temel gönderici.

    Production dışında (settings.ENVIRONMENT != 'Production') gerçekten SMTP'ye
    gidilmez, mail içeriği konsola yazdırılır - PasswordResetRequestView'daki
    orijinal davranışın (dev ortamında gerçek mail atmadan konsoldan test
    edilebilmesi) birebir korunmuş hali, artık tek bir view'a değil tüm mail
    türlerine uygulanıyor.

    From adresi her zaman settings.EMAIL_HOST_USER (Gmail SMTP, giriş kimliğiyle
    eşleşmek zorunda - farklı bir adrese geçmek deployment'ta sessiz bir teslim
    sorununa yol açabilir). from_name SADECE görünen ismi değiştirir, adresin
    kendisini değil - `"{from_name} <{EMAIL_HOST_USER}>"` şeklinde birleştirilir.

    fail_silently=True verilirse (örn. bir randevu/durum güncellemesi gibi
    kendi başına başarılı sayılması gereken bir işlemin YANINDA gönderilen
    bildirim maili) SMTP hatası caller'a exception olarak sızdırılmaz, sadece
    loglanıp False döner - ana işlemi bir mail sunucusu arızası yüzünden
    başarısız kılmamak için. Varsayılan (False) PasswordResetRequestView'ın
    orijinal davranışını korur: hata caller'a fırlatılır.
    """
    from_email = f"{from_name} <{settings.EMAIL_HOST_USER}>"

    if settings.ENVIRONMENT != 'Production':
        print(f"\n[mailer][dev] Gönderilecek mail (gerçekte gönderilmedi):")
        print(f"\tFrom: {from_email}")
        print(f"\tTo: {to_email}")
        print(f"\tSubject: {subject}")
        print(f"\n{body}\n")
        return True

    try:
        django_send_mail(subject, body, from_email, [to_email])
        return True
    except Exception:
        logger.exception("Mail gönderilemedi: to=%s subject=%r", to_email, subject)
        if fail_silently:
            return False
        raise


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """Şifre sıfırlama linkini içeren maili gönderir.
    accounts.views.views.PasswordResetRequestView tarafından çağrılır."""
    subject = "Lunova Şifre Sıfırlama İsteği"
    body = f"Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanabilirsiniz:\n\n{reset_url}\n\nLunova Ekibi"
    return send_email(to_email, subject, body)
