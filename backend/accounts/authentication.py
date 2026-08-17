from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.COOKIES.get('access_token')
        else:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None

        try:
            # Token'ı validate et
            validated_token = self.get_validated_token(raw_token)

            # Token blacklist kontrolü yap - bu çok önemli
            if BlacklistedToken.objects.filter(token__jti=validated_token['jti']).exists():
                return None  # Blacklist'te varsa authentication başarısız

            user = self.get_user(validated_token)
        except Exception:
            return None

        # Token cookie'den geldiyse (header yoksa) CSRF doğrulaması zorunlu.
        # Authorization header ile gelen istekler (Postman/backend script'leri gibi)
        # tarayıcı cookie'sine güvenmediği için CSRF riski taşımaz, muaf tutulur.
        if header is None:
            self.enforce_csrf(request)

        return user, validated_token

    def enforce_csrf(self, request):
        """
        DRF'in SessionAuthentication.enforce_csrf()'i ile birebir aynı desen
        (rest_framework.authentication.CSRFCheck, Django'nun CsrfViewMiddleware'ini
        sarmalayan hazır bir yardımcı). GET/HEAD/OPTIONS gibi "safe" metodlar için
        CsrfViewMiddleware zaten iç mekanizmasında no-op'tur, sadece state-değiştiren
        metodlarda gerçek bir kontrol yapar.
        """
        def dummy_get_response(request):  # pragma: no cover
            return None

        check = CSRFCheck(dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied('CSRF doğrulaması başarısız: %s' % reason)