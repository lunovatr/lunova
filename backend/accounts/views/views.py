from rest_framework import generics
from ..serializers.serializers import (ExpertRegisterSerializer,
                                      ClientRegisterSerializer,
                                      AdminRegisterSerializer)
from ..serializers.serializers import (LoginSerializer,
                                      PasswordResetRequestSerializer,
                                      PasswordResetConfirmSerializer,
                                      ExpertListSerializer,
                                      ClientListSerializer)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.contrib.auth import get_user_model, authenticate
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.password_validation import validate_password
from django.middleware.csrf import get_token
from django.db.models import Q
from ..models import UserRole, ExpertProfile, ClientProfile, Document, DocumentType
from accounts.serializers.document_serializers import DocumentSerializer
from mailer.services import send_password_reset_email

User = get_user_model()


def set_auth_cookies(response, access_token, refresh_token):
    """
    access_token/refresh_token'ı httpOnly cookie olarak set eder. Süreler
    settings.SIMPLE_JWT'den okunur (tek doğruluk kaynağı) — böylece
    ACCESS_TOKEN_LIFETIME/REFRESH_TOKEN_LIFETIME değiştiğinde cookie'nin
    tarayıcı tarafındaki max_age'i otomatik senkron kalır. LoginView ve
    TokenRefreshView tarafından ortak kullanılır.
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

    response.set_cookie(key="access_token", value=access_token, max_age=access_max_age, **cookie_params)
    response.set_cookie(key="refresh_token", value=refresh_token, max_age=refresh_max_age, **cookie_params)


class ExpertRegisterView(generics.CreateAPIView):
    serializer_class = ExpertRegisterSerializer


class ClientRegisterView(generics.CreateAPIView):
    serializer_class = ClientRegisterSerializer


class AdminRegisterView(generics.CreateAPIView):
    serializer_class = AdminRegisterSerializer


class LoginView(APIView):
    serializer_class = LoginSerializer
    """
    POST /login/ endpointi artık email ve password bekler.
    {
        "email": "kullanici@ornek.com",
        "password": "sifre"
    }
    """
    def post(self, request):
        # Önce frontend tipini belirle
        frontend_type = request.META.get('HTTP_X_FRONTEND_TYPE', '')
        
        # Eğer header yoksa, referer header'ından kontrol et
        if not frontend_type:
            referer = request.META.get('HTTP_REFERER', '')
            
            # Expert frontend domain'lerini kontrol et
            expert_domains = [
                'expert.lunova.tr',
                'localhost:5173',  # Expert frontend dev port (Vite default)
                '127.0.0.1:5173',  # Localhost alternatif
            ]
            
            # Client frontend domain'lerini kontrol et
            client_domains = [
                'client.lunova.tr',
                'lunova.tr',  # Ana domain
                'localhost:5174',  # Client frontend dev port (farklı port)
                '127.0.0.1:5174',  # Localhost alternatif
            ]
            
            if any(domain in referer for domain in expert_domains):
                frontend_type = 'expert'
            elif any(domain in referer for domain in client_domains):
                frontend_type = 'client'
        
        is_expert_frontend = frontend_type == 'expert'
        is_client_frontend = frontend_type == 'client'
        
        # Email'e göre kullanıcıyı bul
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                "detail": "Geçersiz e-posta veya şifre."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Rol kontrolü yap (sadece frontend tipi belirlenmişse)
        if is_expert_frontend and user.role == 'client':
            return Response({
                "detail": "Bu arayüz sadece uzmanlar için tasarlanmıştır. Lütfen danışan arayüzünü kullanın."
            }, status=status.HTTP_403_FORBIDDEN)
        
        if is_client_frontend and user.role == 'expert':
            return Response({
                "detail": "Bu arayüz sadece danışanlar için tasarlanmıştır. Lütfen uzman arayüzünü kullanın."
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Şimdi şifre kontrolü yap
        password = request.data.get('password')
        user = authenticate(email=user.email, password=password)
        if not user:
            return Response({
                "detail": "Geçersiz e-posta veya şifre."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normal login işlemi devam eder
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        # Profil fotoğrafını çek
        profile_photo = Document.objects.filter(
            user=user,
            type=DocumentType.PROFILE_PHOTO
        ).first()

        if profile_photo:
            serialized = DocumentSerializer(profile_photo, context={'request': request})
            profile_photo_url = serialized.data.get("access_url")
        else:
            profile_photo_url = None
        response = Response({
            "id": user.id,
            "role": user.role,
            "name": user.first_name,
            "surname": user.last_name,
            "email": user.email,
            "profile_photo": profile_photo_url,
            "gender": user.gender if user.gender else None
            # profil fotoğrafı yoksa front ona gender'a göre pp atasın.
        }, status=status.HTTP_200_OK)
        # JWT'yi httpOnly cookie olarak ekle (süreler settings.SIMPLE_JWT'den okunur)
        set_auth_cookies(response, access_token, refresh_token)
        # CSRF cookie'sini burada mint ediyoruz (get_token httpOnly OLMAYAN bir
        # 'csrftoken' cookie'si set eder) — frontend bunu okuyup sonraki
        # state-değiştiren isteklerde X-CSRFToken header'ı olarak geri gönderecek
        # (bkz. accounts/authentication.py -> enforce_csrf).
        get_token(request)
        return response


class TokenRefreshView(APIView):
    """
    POST /token/refresh/
    Body gerekmez. Cookie'deki refresh_token kullanılarak yeni bir access_token
    (ve ROTATE_REFRESH_TOKENS=True olduğu için rotasyonlu yeni bir refresh_token)
    üretir; ikisi de httpOnly cookie olarak set edilir — refresh token hiçbir zaman
    JS'e/response body'sine sızmaz, login/logout ile aynı güvenlik modeli korunur.

    Bu, oturumun "sliding window" (kayan pencere) mantığıyla uzamasını sağlar:
    kullanıcı aktif oldukça (en az REFRESH_TOKEN_LIFETIME'da bir istek attıkça)
    oturum kendini yeniler; kullanıcı bu süre kadar tamamen hareketsiz kalırsa
    refresh token de süresi dolmuş sayılır ve bir sonraki istekte 401 alıp tekrar
    giriş yapması gerekir. REFRESH_TOKEN_LIFETIME (settings.py) bilinçli olarak
    1 saate ayarlandı: seanslar Zoom üzerinden yapılıyor ve bir görüşme sırasında
    kullanıcı sitede en fazla ~50 dakika (appointment_duration üst sınırı)
    hareketsiz kalabiliyor — 1 saatlik pencere bunu, gereksiz yere uzatmadan
    güvenli şekilde kapsıyor.
    """

    def post(self, request):
        raw_refresh = request.COOKIES.get("refresh_token")
        if not raw_refresh:
            raise InvalidToken("Refresh token bulunamadı. Lütfen tekrar giriş yapın.")

        serializer = TokenRefreshSerializer(data={"refresh": raw_refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        access_token = serializer.validated_data["access"]
        # ROTATE_REFRESH_TOKENS=True olduğu için serializer her zaman yeni bir
        # refresh de üretir; savunma amaçlı fallback olarak eskisi kullanılır.
        refresh_token = serializer.validated_data.get("refresh", raw_refresh)

        response = Response({"detail": "Oturum yenilendi."}, status=status.HTTP_200_OK)
        set_auth_cookies(response, access_token, refresh_token)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Cookie'den refresh token al
            refresh_token = request.COOKIES.get("refresh_token")
            if not refresh_token:
                return Response({"error": "Refresh token bulunamadı."}, status=status.HTTP_400_BAD_REQUEST)

            # Refresh token'ı blacklist'e ekle
            token = RefreshToken(refresh_token)
            token.blacklist()
                        
            response = Response({"detail": "Başarıyla çıkış yapıldı."}, status=status.HTTP_205_RESET_CONTENT)

            # Cookie parametreleri
            cookie_params = {'path': '/'}
            if getattr(settings, 'ENVIRONMENT', '').lower() == 'production':
                cookie_params['domain'] = 'lunova.tr'

            # Cookie'leri sil
            response.delete_cookie("access_token", **cookie_params)
            response.delete_cookie("refresh_token", **cookie_params)

            # Alternatif olarak expire tarihi ile de sıfırlayabilirsin (bazı tarayıcılarda daha uyumlu olabilir)
            response.set_cookie("access_token", value="", expires="Thu, 01 Jan 1970 00:00:00 GMT", **cookie_params)
            response.set_cookie("refresh_token", value="", expires="Thu, 01 Jan 1970 00:00:00 GMT", **cookie_params)

            return response

        except TokenError:
            return Response({"error": "Geçersiz veya süresi dolmuş token."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Çıkış işlemi sırasında hata oluştu: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Profil fotoğrafını çek
        profile_photo = Document.objects.filter(
            user=user,
            type=DocumentType.PROFILE_PHOTO
        ).first()

        if profile_photo:
            serialized = DocumentSerializer(profile_photo, context={'request': request})
            profile_photo_url = serialized.data.get("access_url")
        else:
            profile_photo_url = None

        # csrftoken cookie'si yoksa (örn. bu deploy'dan önce login olmuş, hâlâ
        # geçerli bir oturum) burada da mint ediliyor — frontend her açılışta
        # zaten /me/ çağırdığı için mevcut oturumlar tekrar login olmaya
        # zorlanmadan CSRF cookie'sine "backfill" ediliyor.
        get_token(request)

        return Response({
            "id": user.id,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "profile_photo": profile_photo_url,
            "gender": user.gender if user.gender else None
            # profil fotoğrafı yoksa front ona gender'a göre pp atasın.
        })


class ExpertListView(generics.ListAPIView):
    """
    GET /accounts/experts/ endpointi uzmanları listeler.
    Sadece kimliği doğrulanmış kullanıcılar erişebilir.
    Query parameter ile kategoriye göre filtreleme yapabilir: ?category=bilissel-terapi
    """
    serializer_class = ExpertListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ExpertProfile.objects.filter(approval_status=True).select_related('user')

        # Kategori filtresi
        category_slug = self.request.query_params.get('category', None)
        if category_slug:
            # Servis slug'una göre filtrele
            queryset = queryset.filter(
                Q(services__slug=category_slug)
            ).distinct()

        return queryset
    

class ClientListView(generics.ListAPIView):
    """
    GET /accounts/clients/ endpointi danışanları listeler.
    - Admin kullanıcılar tüm danışanları görebilir
    - Expert kullanıcılar sadece kendisiyle randevusu olan danışanları görebilir
    - Client kullanıcılar bu endpoint'e erişemez
    """
    serializer_class = ClientListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ClientProfile.objects.select_related('user', 'expert', 'expert__user').prefetch_related('substances_used')

        # Admin ise tüm client'ları göster
        if user.role == UserRole.ADMIN:
            return queryset

        # Expert ise sadece kendisine atanan client'ları göster
        if user.role == UserRole.EXPERT:
            try:
                expert_profile = user.expertprofile
                return queryset.filter(expert=expert_profile)
            except ExpertProfile.DoesNotExist:
                return queryset.none()

        # Client kullanıcılar için boş queryset döndür
        return queryset.none()


class PasswordResetRequestView(APIView):
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # For security, don't reveal if email exists or not
            # 3 nokta varsa kullanıcının girdiği mail, veritabanında yok demektir ;)
            # açıktan söylemeli miyiz mail adresinin sistemde varlığını?
            return Response({"message": "If the email exists, a reset link has been sent..."}, status=status.HTTP_200_OK)

        token_generator = PasswordResetTokenGenerator()
        token = token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Determine frontend URL based on role
        if user.role == UserRole.EXPERT:
            base_url = settings.FRONTEND_URLS.get('expert')
        elif user.role == UserRole.CLIENT:
            base_url = settings.FRONTEND_URLS.get('client')
        elif user.role == UserRole.ADMIN:
            base_url = settings.FRONTEND_URLS.get('admin')
        else:
            return Response({"error": "Invalid user role"}, status=status.HTTP_400_BAD_REQUEST)

        if not base_url:
            return Response({"error": "Frontend URL not configured for user role"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        frontend_url = f"{base_url}/reset-password?uid={uid}&token={token}"

        # Gönderim mailer app'i üzerinden yapılır (mailer.services.send_email,
        # settings.ENVIRONMENT != 'Production' iken gerçekten SMTP'ye gitmez,
        # konsola loglar - bkz. mailer/services.py).
        try:
            send_password_reset_email(email, frontend_url, first_name=user.first_name)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if settings.ENVIRONMENT != 'Production':
            print(f"\nPassword reset link for {email}:")
            print(f"\n\tDevelopment: {frontend_url}")
            print("\nDev. bağlantısını postman ile password göndererek  test edebilirsiniz.")
            print("Postman body örneği:")

            print(f'{{\n\t"uid": "{uid}",\n\t"token": "{token}",\n\t"new_password": "yenisifre123",\n\t"new_password_confirm": "yenisifre123"\n}}')


            # Aynı linkin production'da nasıl görüneceğini göster
            if user.role == UserRole.EXPERT:
                prod_base = "https://uzman.lunova.tr"
            elif user.role == UserRole.CLIENT:
                prod_base = "https://danisan.lunova.tr"
            elif user.role == UserRole.ADMIN:
                prod_base = "https://lunova.tr"

            production_url = f"{prod_base}/reset-password?uid={uid}&token={token}"
            print("\nProd linki sadece bağlantı domain kontrolü içindir. Çalışması beklenemez.")
            print(f"\n\tProduction:  {production_url}\n")

        return Response({"message": "If the email exists, a reset link has been sent."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid uid"}, status=status.HTTP_400_BAD_REQUEST)

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, token):
            return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        print(f"Password for user {user.email} has been reset.")

        return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
