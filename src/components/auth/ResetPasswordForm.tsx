// src/components/auth/ResetPasswordForm.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Alert from "../ui/alert/Alert";
import api from "../../lib/api";

export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // URL'den uid ve token al
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  
  // Sayfa modu: email veya password
  const mode: 'email' | 'password' = uid && token ? 'password' : 'email';  
  
  // Email formu
  const [email, setEmail] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  // Şifre formu
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Zamanlayıcı (5 dakika)
  const [timeLeft, setTimeLeft] = useState(300);

  // Zamanlayıcı - sadece password modunda çalışır
  useEffect(() => {
    if (mode !== 'password' || !uid || !token) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPasswordError('Oturum süresi doldu. Lütfen yeni bir sıfırlama bağlantısı isteyin.');
          setTimeout(() => {
            navigate('/signin');
          }, 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, uid, token, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

// Email gönderme
const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setEmailError(null);

  if (!email) {
    setEmailError('Email zorunludur');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setEmailError('Geçerli bir email adresi girin');
    return;
  }

  setIsSubmittingEmail(true);

  try {
    const response = await api.post('/api/v1/accounts/auth/password-reset/', { email });
    
    console.log('Backend response:', response.data);
    
    if (response.data && (response.data as any).message) {  // typescript bypass
      const message = (response.data as any).message;       // typescript bypass
      
      // ÖNEMLİ: Üç nokta kontrolü ÖNCE yapılmali!
      if (message.endsWith('...')) {
        console.log('❌ Email bulunamadı (üç nokta)');
        setEmailError('Bu email adresi sistemde kayıtlı değil');
      } 
      // Tek nokta ile bitiyorsa (ama üç nokta değilse)
      else if (message.endsWith('.')) {
        console.log('✅ Email bulundu (tek nokta), sent sayfasına yönlendiriliyor');
        navigate('/reset-password-sent', { state: { email } });
      } 
      else {
        console.log('⚠️ Beklenmeyen mesaj formatı:', message);
        setEmailError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } else {
      console.log('⚠️ Response message field yok');
      setEmailError('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
    
  } catch (error: any) {
    console.error('Backend error:', error);
    
    if (error.response?.data?.message) {
      const message = error.response.data.message;
      if (message.endsWith('...')) {
        setEmailError('Bu email adresi sistemde kayıtlı değil');
      } else {
        setEmailError(message);
      }
    } else {
      setEmailError('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  } finally {
    setIsSubmittingEmail(false);
  }
};

  // Şifre değiştirme
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || !confirmPassword) {
      setPasswordError('Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Şifre en az 8 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor');
      return;
    }

    if (!uid || !token) {
      setPasswordError('Geçersiz sıfırlama bağlantısı');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await api.post('/api/v1/accounts/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: newPassword,
        new_password_confirm: confirmPassword
      });
      
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.response?.status === 400) {
        setPasswordError('Geçersiz veya süresi dolmuş sıfırlama bağlantısı.');
      } else if (error.response?.data?.new_password) {
        setPasswordError(Array.isArray(error.response.data.new_password) 
          ? error.response.data.new_password[0] 
          : error.response.data.new_password);
      } else if (error.response?.data?.token) {
        setPasswordError('Sıfırlama bağlantısının süresi dolmuş.');
      } else if (error.response?.data?.detail) {
        setPasswordError(error.response.data.detail);
      } else {
        setPasswordError('Şifre sıfırlama başarısız. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Email modu
  if (mode === 'email') {
    return (
      <div className="flex flex-col flex-1">
        <div className="w-full max-w-md pt-10 mx-auto">
          <Link
            to="/signin"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ChevronLeftIcon className="size-5" />
            Geri Dön
          </Link>
        </div>
        
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Şifrenizi mi Unuttunuz?
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Endişelenmeyin! Email adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>
            </div>
            
            <div>
              <form onSubmit={handleEmailSubmit}>
                <div className="space-y-6">
                  {emailError && (
                    <Alert
                      variant="error"
                      title="Hata"
                      message={emailError}
                    />
                  )}
                  
                  <div>
                    <Label>
                      E-posta <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      name="email"
                      placeholder="info@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmittingEmail}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Kayıtlı email adresinizi girin
                    </p>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmittingEmail}
                      className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingEmail ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-5">
                <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                  Şifrenizi hatırladınız mı?{" "}
                  <Link
                    to="/signin"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Giriş Yap
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password modu
  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Geri Dön
        </Link>
      </div>
      
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Yeni Şifre Oluştur
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Hesabınız için yeni bir şifre belirleyin
            </p>
          </div>

          {/* Zamanlayıcı */}
          {!success && timeLeft > 0 && (
            <div className="mb-5 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Kalan süre:
                </p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                  {formatTime(timeLeft)}
                </p>
              </div>
            </div>
          )}
          
          <div>
            {success ? (
              <Alert
                variant="success"
                title="Başarılı"
                message="Şifreniz başarıyla değiştirildi! Giriş sayfasına yönlendiriliyorsunuz..."
              />
            ) : (
              <form onSubmit={handlePasswordSubmit}>
                <div className="space-y-6">
                  {passwordError && (
                    <Alert
                      variant="error"
                      title="Hata"
                      message={passwordError}
                    />
                  )}
                  
                  <div>
                    <Label>
                      Yeni Şifre <span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        placeholder="En az 8 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isSubmittingPassword || timeLeft === 0}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label>
                      Yeni Şifre (Tekrar) <span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        placeholder="Şifrenizi tekrar girin"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmittingPassword || timeLeft === 0}
                      />
                      <span
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showConfirmPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmittingPassword || timeLeft === 0}
                      className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingPassword ? 'Şifre Değiştiriliyor...' : 'Şifreyi Değiştir'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Şifrenizi hatırladınız mı?{" "}
                <Link
                  to="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Giriş Yap
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}