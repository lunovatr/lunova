import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    const registeredEmail = localStorage.getItem('registered_email');
    if (registeredEmail) {
      setFormData(prev => ({
        ...prev,
        email: registeredEmail
      }));
      localStorage.removeItem('registered_email');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validasyon
    if (!formData.email) {
      alert("Email zorunludur");
      return;
    }

    if (!formData.password) {
      alert("Şifre zorunludur");
      return;
    }

    const submitData = {
      email: formData.email,
      password: formData.password
    };

    console.log("Gönderilecek veri:", submitData);

    // Login isteği
    fetch('http://127.0.0.1:8000/api/v1/accounts/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Cookie'leri göndermek ve almak için
      body: JSON.stringify(submitData),
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          console.error('API Hatası:', err);
          let errorMessage = 'Giriş hatası:\n';
          Object.keys(err).forEach(key => {
            errorMessage += `${key}: ${err[key]}\n`;
          });
          throw new Error(errorMessage);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('Login response:', data);
      
      // Token varsa localStorage'a kaydet (opsiyonel - eğer API token döndürüyorsa)
      if (data.access) {
        localStorage.setItem('access_token', data.access);
      }
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      
      // Giriş başarılı, şimdi /me endpoint'ine istek at
      return fetch('http://127.0.0.1:8000/api/v1/accounts/me/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(data.access && { 'Authorization': `Bearer ${data.access}` })
        },
        credentials: 'include' // HTTP-only cookie'yi gönder
      });
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Kullanıcı bilgileri alınamadı');
      }
      return response.json();
    })
    .then(userData => {
      console.log('Kullanıcı bilgileri:', userData);
      
      // Kullanıcı bilgilerini localStorage'a kaydet
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      alert('Giriş başarılı!');
      
      // Dashboard'a yönlendir
      navigate('/');
    })
    .catch(error => {
      console.error('Hata detayı:', error);
      alert(error.message);
    });
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
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
              Giriş Yap
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Email ve şifrenizi girerek giriş yapın!
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    E-posta <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input 
                    type="email"
                    name="email"
                    placeholder="info@gmail.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label>
                    Şifre <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Şifrenizi girin"
                      value={formData.password}
                      onChange={handleChange}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Beni hatırla
                    </span>
                  </div>
                  <Link
                    to="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Şifremi unuttum?
                  </Link>
                </div>
                <div>
                  <button
                  type="submit"
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
                >
                  Giriş Yap
                </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Hesabınız yok mu? {""}
                <Link
                  to="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
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