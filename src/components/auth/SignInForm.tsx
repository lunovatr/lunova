import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch } from "../../store/hooks";
import { fetchMe } from "../../store/authSlice";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Alert from "../ui/alert/Alert";
import api from "../../lib/api";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const registeredEmail = localStorage.getItem('registered_email');
    if (registeredEmail) {
      setFormData(prev => ({ ...prev, email: registeredEmail }));
      localStorage.removeItem('registered_email');
    }
    const registeredFlag = localStorage.getItem('registered_success');
    if (registeredFlag) {
      setRegisteredSuccess('Artık giriş yapabilirsiniz.');
      // temizle ki tekrar gösterilmesin
      localStorage.removeItem('registered_success');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    setGeneralError(null);

    if (!formData.email) newErrors.email = 'Email zorunludur';
    if (!formData.password) newErrors.password = 'Şifre zorunludur';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      // HTTP-only cookie ile login işlemi
      await api.post('/api/v1/accounts/login/', formData);
      
      // Login başarılı, fetchMe ile kullanıcı bilgilerini al
      try {
        await dispatch(fetchMe());
      } catch (error) {
        setGeneralError('Giriş başarılı ancak kullanıcı bilgileri alınamadı. Lütfen sayfayı yenileyin.');
        return;
      }

      // Başarılı giriş, yönlendirme yap
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from);
    } catch (err: any) {
      // API hata yanıtlarını işle
      if (err.response?.data) {
        const resp = err.response.data;
        
        // API'den dönen detail mesajını kontrol et
        if (resp.detail) {
          setGeneralError(resp.detail);
          return;
        }
        
        // Eğer başka formatta hata dönerse
        if (typeof resp === 'object') {
          const fieldErrors: Record<string, string> = {};
          
          // Form validation hataları için
          if (resp.email) {
            fieldErrors.email = Array.isArray(resp.email) ? resp.email[0] : resp.email;
          }
          if (resp.password) {
            fieldErrors.password = Array.isArray(resp.password) ? resp.password[0] : resp.password;
          }
          
          if (Object.keys(fieldErrors).length) {
            setErrors(fieldErrors);
            return;
          }
        }
      } else if (err.request) {
        // Network hatası veya sunucuya ulaşılamama durumu
        setGeneralError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
      } else {
        // Diğer hatalar
        setGeneralError('Giriş yapılamadı. Lütfen daha sonra tekrar deneyin.');
      }
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Giriş Yap</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Email ve şifrenizi girerek giriş yapın!</p>
          </div>

          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {generalError && (
                  <Alert
                    variant="error"
                    title="Giriş Başarısız"
                    message={generalError}
                  />
                )}

                  {registeredSuccess && (
                    <Alert
                      variant="success"
                      title="Kayıt Başarılı"
                      message={registeredSuccess}
                    />
                  )}

                <div>
                  <Label>
                    E-posta <span className="text-error-500">*</span>
                  </Label>
                  <Input type="email" name="email" placeholder="info@gmail.com" value={formData.email} onChange={handleChange} />
                  {errors.email && (
                    <Alert
                      variant="error"
                      title="Email Hatası"
                      message={errors.email}
                    />
                  )}
                </div>

                <div>
                  <Label>
                    Şifre <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} name="password" placeholder="Şifrenizi girin" value={formData.password} onChange={handleChange} />
                    <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                      {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                    </span>
                  </div>
                  {errors.password && (
                    <Alert
                      variant="error"
                      title="Şifre Hatası"
                      message={errors.password}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">Beni hatırla</span>
                  </div>
                  <Link to="/reset-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
                    Şifremi unuttum?
                  </Link>
                </div>

                <div>
                  <button type="submit" className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600">Giriş Yap</button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Hesabınız yok mu?{' '}
                <Link to="/signup" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                  Kayıt Ol
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}