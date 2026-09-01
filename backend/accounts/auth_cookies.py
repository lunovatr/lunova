from django.conf import settings

FRONTEND_TYPE_CHOICES = ('expert', 'client')

LEGACY_ACCESS_COOKIE_NAME = 'access_token'
LEGACY_REFRESH_COOKIE_NAME = 'refresh_token'


def resolve_frontend_type(request) -> str:
    """
    İsteğin hangi frontend'den (uzman/danışan) geldiğini belirler. Önce
    X-Frontend-Type header'ına bakar, yoksa Referer'daki domain'e göre
    tahmin eder (LoginView'ın önceki, tek yerde yaşayan mantığının taşınmış
    hali - artık authentication.py + views.py arasında paylaşılıyor).

    Dönen değer HER ZAMAN 'expert' | 'client' | '' olur - header'daki ham
    değer asla doğrudan döndürülmez, çünkü bu değer cookie ADI üretiminde
    kullanılıyor (bkz. get_access_cookie_name/get_refresh_cookie_name);
    doğrulanmamış bir değerin cookie adına sızması geçersiz karakterli bir
    Set-Cookie header'ı üretip isteği hataya düşürebilir.
    """
    frontend_type = request.META.get('HTTP_X_FRONTEND_TYPE', '')
    if frontend_type not in FRONTEND_TYPE_CHOICES:
        frontend_type = ''

    if not frontend_type:
        referer = request.META.get('HTTP_REFERER', '')

        expert_domains = [
            'expert.lunova.tr',
            'uzman.lunova.tr',  # gerçek prod domain'i (backend/.env.production -> FRONTEND_URLS)
            'localhost:5173',  # Expert frontend dev port (Vite default)
            '127.0.0.1:5173',  # Localhost alternatif
        ]

        client_domains = [
            'client.lunova.tr',
            'danisan.lunova.tr',  # gerçek prod domain'i (backend/.env.production -> FRONTEND_URLS)
            'lunova.tr',  # Ana domain
            'localhost:5174',  # Client frontend dev port (farklı port)
            '127.0.0.1:5174',  # Localhost alternatif
        ]

        if any(domain in referer for domain in expert_domains):
            frontend_type = 'expert'
        elif any(domain in referer for domain in client_domains):
            frontend_type = 'client'

    return frontend_type


def get_access_cookie_name(frontend_type: str) -> str:
    if frontend_type in FRONTEND_TYPE_CHOICES:
        return f"{frontend_type}_access_token"
    return LEGACY_ACCESS_COOKIE_NAME


def get_refresh_cookie_name(frontend_type: str) -> str:
    if frontend_type in FRONTEND_TYPE_CHOICES:
        return f"{frontend_type}_refresh_token"
    return LEGACY_REFRESH_COOKIE_NAME


def set_auth_cookies(response, access_token, refresh_token, frontend_type: str) -> None:
    """
    access_token/refresh_token'ı httpOnly cookie olarak set eder. Süreler
    settings.SIMPLE_JWT'den okunur (tek doğruluk kaynağı) — böylece
    ACCESS_TOKEN_LIFETIME/REFRESH_TOKEN_LIFETIME değiştiğinde cookie'nin
    tarayıcı tarafındaki max_age'i otomatik senkron kalır. LoginView ve
    TokenRefreshView tarafından ortak kullanılır.

    Cookie ADI frontend_type'a göre ayrışır (expert_*/client_*) - aynı
    tarayıcıda hem uzman hem danışan paneli açıkken tek bir ortak
    access_token/refresh_token cookie'si üzerinden birbirinin oturumunu
    ezmesini önler (dev'de aynı host [localhost] portlar arası, prod'da
    aynı registrable domain [lunova.tr] subdomain'ler arası paylaşılıyordu).
    frontend_type çözülemezse (üçüncü taraf bir istemci) legacy sabit
    isimlere düşülür.
    """
    access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
    refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

    cookie_params = {
        'httponly': True,
        # [2026-08-17'de None'dan değiştirildi] Tüm frontend'ler backend ile aynı
        # "site" (lunova.tr / dev'de localhost) olduğu için Lax yeterli ve daha
        # güvenli — gerçek cross-site (başka bir domain'den) CSRF isteklerinde
        # tarayıcı bu cookie'yi artık göndermiyor. Detay: kök claude.md, CSRF bölümü.
        'samesite': 'Lax',
        'secure': True,
        'path': '/',
    }
    if getattr(settings, 'ENVIRONMENT', '').lower() == 'production':
        cookie_params['domain'] = 'lunova.tr'

    response.set_cookie(
        key=get_access_cookie_name(frontend_type),
        value=access_token,
        max_age=access_max_age,
        **cookie_params,
    )
    response.set_cookie(
        key=get_refresh_cookie_name(frontend_type),
        value=refresh_token,
        max_age=refresh_max_age,
        **cookie_params,
    )


def delete_auth_cookies(response, frontend_type: str) -> None:
    """
    LogoutView tarafından kullanılır. frontend_type'a karşılık gelen
    cookie'leri SİLER; ayrıca (bu değişiklikten önce set edilmiş olabilecek)
    legacy access_token/refresh_token'ı da her zaman siler - böylece deploy
    sonrası bir kez daha login olup normal şekilde logout eden kullanıcıların
    tarayıcısında kalmış eski cookie artıkları da temizlenmiş olur.
    """
    cookie_names = {
        get_access_cookie_name(frontend_type),
        get_refresh_cookie_name(frontend_type),
        LEGACY_ACCESS_COOKIE_NAME,
        LEGACY_REFRESH_COOKIE_NAME,
    }

    cookie_params = {'path': '/'}
    if getattr(settings, 'ENVIRONMENT', '').lower() == 'production':
        cookie_params['domain'] = 'lunova.tr'

    for name in cookie_names:
        response.delete_cookie(name, **cookie_params)
        # Alternatif olarak expire tarihi ile de sıfırlanıyor (bazı
        # tarayıcılarda delete_cookie'den daha uyumlu olabilir) - önceki
        # LogoutView'daki davranışla aynı.
        response.set_cookie(name, value="", expires="Thu, 01 Jan 1970 00:00:00 GMT", **cookie_params)
