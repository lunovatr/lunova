import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password2: "",
    phone_number: "",
    id_number: "",
    country: "TR",
    national_id: "",
    birth_date: "",
    gender_id: "",
    support_goal: "",
    received_service_before: false
  });

  const handleChange = ( e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name) {
      alert("Ad ve soyad zorunludur");
      return;
    }
    
    if (!formData.email) {
      alert("Email zorunludur");
      return;
    }
    
    if (!formData.password || !formData.password2) {
      alert("Şifre alanları zorunludur");
      return;
    }
    
    if (formData.password !== formData.password2) {
      alert("Şifreler eşleşmiyor");
      return;
    }
    
    if (!formData.phone_number) {
      alert("Telefon numarası zorunludur");
      return;
    }
    
    if (formData.phone_number.length !== 11 || !formData.phone_number.startsWith('0')) {
      alert("Telefon numarası 0 ile başlamalı ve 11 haneli olmalıdır (örn: 05321234567)");
      return;
    }
    
    if (!formData.id_number) {
      alert("TC Kimlik numarası zorunludur");
      return;
    }
    
    if (formData.id_number.length !== 11) {
      alert("TC Kimlik numarası 11 haneli olmalıdır");
      return;
    }
    
    if (!formData.birth_date) {
      alert("Doğum tarihi zorunludur");
      return;
    }
    
    if (!formData.gender_id) {
      alert("Cinsiyet seçimi zorunludur");
      return;
    }
    
    if (!formData.support_goal) {
      alert("Destek hedefi zorunludur");
      return;
    }
    
    if (!isChecked) {
      alert("Lütfen kullanım şartlarını kabul edin");
      return;
    }

    const submitData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      password: formData.password,
      password2: formData.password2,
      phone_number: formData.phone_number,
      id_number: formData.id_number,
      country: "TR",
      national_id: "",
      birth_date: formData.birth_date,
      gender_id: parseInt(formData.gender_id),
      support_goal: formData.support_goal,
      received_service_before: formData.received_service_before
    };

    console.log("Gönderilecek veri:", submitData);

    fetch('http://127.0.0.1:8000/api/v1/accounts/register/client/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitData),
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          console.error('API Hatası:', err);
          let errorMessage = 'Kayıt hatası:\n';
          Object.keys(err).forEach(key => {
            errorMessage += `${key}: ${err[key]}\n`;
          });
          throw new Error(errorMessage);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('Kayıt başarılı:', data);
      alert('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');
      
     
      localStorage.setItem('registered_email', formData.email);
      
      navigate('/signin');
    })
    .catch(error => {
      console.error('Hata detayı:', error);
      alert(error.message);
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
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
              Hesap Oluştur
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Hesap oluşturmak için bilgilerinizi girin.
              Zaten hesabınız var mı? {""}
                <Link
                  to="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Giriş Yap
                </Link>
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <Label>
                      Ad<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      name="first_name"
                      placeholder="Adınızı girin"
                      value={formData.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label>
                      Soyad<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      name="last_name"
                      placeholder="Soyadınızı girin"
                      value={formData.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <Label>
                    E-posta<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="E-posta adresinizi girin"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label>
                    Telefon Numarası<span className="text-error-500">*</span>
                  </Label>
                  <input
                    type="tel"
                    name="phone_number"
                    placeholder="05321234567"
                    value={formData.phone_number}
                    onChange={handleChange}
                    maxLength={11}
                    className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Format: 05321234567 (11 rakam)</p>
                </div>

                <div>
                  <Label>
                    TC Kimlik No<span className="text-error-500">*</span>
                  </Label>
                  <input
                    type="text"
                    name="id_number"
                    placeholder="12345678901"
                    value={formData.id_number}
                    onChange={handleChange}
                    maxLength={11}
                    className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">11 haneli olmalıdır</p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <Label>
                      Doğum Tarihi<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label>
                      Cinsiyet<span className="text-error-500">*</span>
                    </Label>
                    <select
                      name="gender_id"
                      value={formData.gender_id}
                      onChange={handleSelectChange}
                      className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Cinsiyet seçin</option>
                      <option value="1">Erkek</option>
                      <option value="2">Kadın</option>
                      <option value="3">Diğer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>
                    Destek Hedefi<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    name="support_goal"
                    placeholder="Örn: Bağımlılık tedavisi"
                    value={formData.support_goal}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={formData.received_service_before}
                    onChange={(checked) => setFormData(prev => ({...prev, received_service_before: checked}))}
                  />
                  <p className="inline-block text-sm font-normal text-gray-500 dark:text-gray-400">
                  Daha önce herhangi bir destek hizmeti aldınız mı?
                  </p>
                </div>

                <div>
                  <Label>
                    Şifre<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Şifrenizi girin"
                      type={showPassword ? "text" : "password"}
                      name="password"
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

                <div>
                  <Label>
                    Şifre (Tekrar)<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Şifrenizi tekrar girin"
                      type={showPassword2 ? "text" : "password"}
                      name="password2"
                      value={formData.password2}
                      onChange={handleChange}
                    />
                    <span
                      onClick={() => setShowPassword2(!showPassword2)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword2 ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block text-sm font-normal text-gray-500 dark:text-gray-400">
                    Hesap oluştururken,{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Kullanım Şartları,
                    </span>{" "}
                    ve{" "}
                    <span className="text-gray-800 dark:text-white">
                      Gizlilik Politikasını kabul ediyorum.
                    </span>
                  </p>
                </div>

                <div>
                  <button 
                    type="submit"
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
                  >
                    Kayıt Ol
                  </button>
                </div>
              </div>
            </form>
            <div className="mt-5">
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}