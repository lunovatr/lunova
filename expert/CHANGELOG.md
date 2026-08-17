# Changelog

### ✨ Yeni Özellikler
- **Backend API Entegrasyonu**: Gerçek authentication sistemi eklendi
- **Auth Guard**: Sayfa erişim kontrolü ve otomatik yönlendirme

### 🔧 Teknik Değişiklikler
- **Sign-up Formu**: İsim, soyisim, telefon, TC kimlik alanları eklendi
- **API Endpoints**: `/register`, `/login`, `/me`, `/logout` entegrasyonu
- **Cache Sistemi**: 5 dakika kullanıcı bilgileri cache'lenir (redux ile değişecek. /me endpointine istek atılıp global state ile yönetilecek)
- **State Management**: Zustand ile auth state yönetimi

### 🛡️ Güvenlik
- **Protected Routes**: Giriş yapmadan sayfa erişimi engellendi
- **Session Control**: Her sayfa yüklendiğinde oturum kontrolü
- **Auto Logout**: Geçersiz oturumda otomatik çıkış

### 📁 Yeni Dosyalar
- `src/lib/api.ts` - API yapılandırması
- `src/hooks/use-auth-guard.ts` - Authentication guard

### ⚠️ Breaking Changes
- Sign-up formu artık daha fazla alan gerektiriyor
- Authentication olmadan sayfa erişimi engellendi

### 📝 Notlar
- Backend API çalışır durumda olmalı
- `VITE_API_BASE_URL` environment variable ile API URL değiştirilebilir
- **Redux entegrasyonu gelecek sürümlerde planlanmaktadır (büyük ekip ve karmaşık state logic gerektiğinde)**