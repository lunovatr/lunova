import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import api from "../../lib/api";

export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email) {
      alert("Email zorunludur");
      return;
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Geçerli bir email adresi girin");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/api/v1/accounts/auth/password-reset/', {
        email: email
      });

      console.log('Reset link gönderildi:', response.data);
      
      // Başarılı mesajı göster ve yönlendirme sayfasına git
      navigate('/reset-password-sent', { state: { email: email } });
      
    } catch (error: unknown) {
      console.error('Hata detayı:', error);

      const responseData = (error as { response?: { data?: unknown } })?.response?.data;

      if (responseData && typeof responseData === 'object') {
        let errorMessage = 'Şifre sıfırlama hatası:\n';
        Object.keys(responseData as Record<string, unknown>).forEach(key => {
          const value = (responseData as Record<string, unknown>)[key];
          if (Array.isArray(value)) {
            errorMessage += `${key}: ${(value as unknown[]).join(', ')}\n`;
          } else {
            errorMessage += `${key}: ${String(value)}\n`;
          }
        });
        alert(errorMessage);
      } else if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
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
                    disabled={isSubmitting}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Kayıtlı email adresinizi girin
                  </p>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
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