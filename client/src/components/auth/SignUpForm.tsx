import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Alert from "../ui/alert/Alert";
import api from "../../lib/api";


export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isTurkishCitizen, setIsTurkishCitizen] = useState(true);
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const newErrors: Record<string,string> = {};
    setGeneralError(null);
    setSuccessMessage(null);

    if (!formData.first_name) newErrors.first_name = 'Ad zorunludur';
    if (!formData.last_name) newErrors.last_name = 'Soyad zorunludur';
    if (!formData.email) newErrors.email = 'Email zorunludur';
    if (!formData.password || !formData.password2) newErrors.password = 'Şifre alanları zorunludur';
    if (formData.password && formData.password2 && formData.password !== formData.password2) newErrors.password2 = 'Şifreler eşleşmiyor';
    if (!formData.phone_number) newErrors.phone_number = 'Telefon numarası zorunludur';
    if (formData.phone_number && (formData.phone_number.length !== 11 || !formData.phone_number.startsWith('0'))) newErrors.phone_number = 'Telefon numarası 0 ile başlamalı ve 11 haneli olmalıdır (örn: 05321234567)';
    
    // TC vatandaşı kontrolü
    if (isTurkishCitizen) {
      if (!formData.id_number) newErrors.id_number = 'TC Kimlik numarası zorunludur';
      else if (formData.id_number.length !== 11) newErrors.id_number = 'TC Kimlik numarası 11 haneli olmalıdır';
    } else {
      if (!formData.national_id) newErrors.national_id = 'Pasaport/Kimlik numarası zorunludur';
      if (!formData.country) newErrors.country = 'Ülke seçimi zorunludur';
    }
    
    if (!formData.birth_date) newErrors.birth_date = 'Doğum tarihi zorunludur';
    if (!formData.gender_id) newErrors.gender_id = 'Cinsiyet seçimi zorunludur';
    if (!formData.support_goal) newErrors.support_goal = 'Destek hedefi zorunludur';
    if (!isChecked) newErrors.terms = 'Lütfen kullanım şartlarını kabul edin';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const submitData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      password: formData.password,
      password2: formData.password2,
      phone_number: formData.phone_number,
      birth_date: formData.birth_date,
      gender_id: parseInt(formData.gender_id),
      support_goal: formData.support_goal,
      received_service_before: formData.received_service_before,
      country: isTurkishCitizen ? "TR" : formData.country,
      ...(isTurkishCitizen 
        ? { id_number: formData.id_number } 
        : { national_id: formData.national_id }
      )
    };

    console.log("Gönderilecek veri:", submitData);

    try {
      const response = await api.post('/api/v1/accounts/register/client/', submitData);
      
      console.log('Kayıt başarılı:', response.data);
      // Başarılı kayıt mesajı göster ve 4 saniye bekledikten sonra
      // kullanıcıyı giriş sayfasına yönlendir. Ayrıca email'i ve
      // kayıt başarı bilgisini SignIn sayfasında kullanmak için kaydet.
      setSuccessMessage('Kayıt başarılı! 4 saniye içinde giriş sayfasına yönlendirileceksiniz.');
      localStorage.setItem('registered_email', formData.email);
      localStorage.setItem('registered_success', 'true');
      setTimeout(() => {
        navigate('/signin');
      }, 4000);
    } catch (error: unknown) {
      console.error('Hata detayı:', error);
      
      type AxiosErrorLike = { response?: { data?: Record<string, unknown> } };
      const axiosError = error as AxiosErrorLike;
      
      if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const data = axiosError.response.data as Record<string, unknown>;
        const fieldErrors: Record<string,string> = {};
        let general: string[] = [];
        Object.keys(data).forEach(key => {
          const val = data[key];
          if (Array.isArray(val)) {
            const msg = (val as unknown[]).map(v => String(v)).join(' ');
            // if key corresponds to a form field, set as field error
            fieldErrors[key] = msg;
          } else {
            general.push(String(val));
          }
        });
        setErrors(fieldErrors);
        if (general.length) setGeneralError(general.join(' '));
      } else {
        setGeneralError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
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
                {generalError && (
                  <div className="p-3 mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded">{generalError}</div>
                )}
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
                    {errors.first_name && <p className="mt-1 text-sm text-red-500">{errors.first_name}</p>}
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
                    {errors.last_name && <p className="mt-1 text-sm text-red-500">{errors.last_name}</p>}
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
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
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
                  {errors.phone_number && <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>}
                  <p className="mt-1 text-xs text-gray-500">Format: 05321234567 (11 rakam)</p>
                </div>

                {/* TC Vatandaşlığı Checkbox */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={!isTurkishCitizen}
                    onChange={(checked) => {
                      setIsTurkishCitizen(!checked);
                      // Checkbox durumu değiştiğinde ilgili alanları temizle
                      if (checked) {
                        setFormData(prev => ({...prev, id_number: "", country: "", national_id: ""}));
                      } else {
                        setFormData(prev => ({...prev, id_number: "", country: "TR", national_id: ""}));
                      }
                    }}
                  />
                  <p className="inline-block text-sm font-normal text-gray-500 dark:text-gray-400">
                    TC vatandaşı değilim
                  </p>
                </div>

                {/* Koşullu Alan: TC Kimlik No veya Pasaport/Kimlik No */}
                {isTurkishCitizen ? (
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
                    {errors.id_number && <p className="mt-1 text-sm text-red-500">{errors.id_number}</p>}
                    <p className="mt-1 text-xs text-gray-500">11 haneli olmalıdır</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>
                        Pasaport/Kimlik No<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        name="national_id"
                        placeholder="Pasaport veya kimlik numaranızı girin"
                        value={formData.national_id}
                        onChange={handleChange}
                      />
                      {errors.national_id && <p className="mt-1 text-sm text-red-500">{errors.national_id}</p>}
                    </div>
                    <div>
                      <Label>
                        Ülke<span className="text-error-500">*</span>
                      </Label>
                      <select
                        name="country"
                        aria-label="Ülke"
                        value={formData.country}
                        onChange={handleSelectChange}
                        className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Ülke seçin</option>
                        <option value="US">Amerika Birleşik Devletleri</option>
                        <option value="GB">Birleşik Krallık</option>
                        <option value="DE">Almanya</option>
                        <option value="FR">Fransa</option>
                        <option value="IT">İtalya</option>
                        <option value="ES">İspanya</option>
                        <option value="NL">Hollanda</option>
                        <option value="BE">Belçika</option>
                        <option value="SE">İsveç</option>
                        <option value="NO">Norveç</option>
                        <option value="DK">Danimarka</option>
                        <option value="FI">Finlandiya</option>
                        <option value="GR">Yunanistan</option>
                        <option value="SY">Suriye</option>
                        <option value="IQ">Irak</option>
                        <option value="AF">Afganistan</option>
                        <option value="PK">Pakistan</option>
                        <option value="SA">Suudi Arabistan</option>
                        <option value="AE">Birleşik Arap Emirlikleri</option>
                      </select>
                      {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country}</p>}
                    </div>
                  </>
                )}

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
                    {errors.birth_date && <p className="mt-1 text-sm text-red-500">{errors.birth_date}</p>}
                  </div>
                  <div className="sm:col-span-1">
                    <Label >
                      Cinsiyet<span className="text-error-500">*</span>
                    </Label>
                    <select
                      name="gender_id"
                      aria-label="Cinsiyet"
                      value={formData.gender_id}
                      onChange={handleSelectChange}
                      className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Cinsiyet seçin</option>
                      <option value="1">Kadın</option>
                      <option value="2">Erkek</option>
                      <option value="3">Diğer</option>
                      <option value="4">Belirtmek istemiyorum</option>
                    </select>
                    {errors.gender_id && <p className="mt-1 text-sm text-red-500">{errors.gender_id}</p>}
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
                  {errors.support_goal && <p className="mt-1 text-sm text-red-500">{errors.support_goal}</p>}
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
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
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
                  {errors.password2 && <p className="mt-1 text-sm text-red-500">{errors.password2}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block text-sm font-normal text-gray-500 dark:text-gray-400">
                    Hesap oluştururken,{" "}
                    <Link
                      to="/terms"
                      target="_blank"
                      className="text-gray-800 underline hover:text-brand-500 dark:text-white/90"
                    >
                      Kullanım Şartları
                    </Link>
                    {"'nı "}
                    ve{" "}
                    <Link
                      to="/privacy"
                      target="_blank"
                      className="text-gray-800 underline hover:text-brand-500 dark:text-white"
                    >
                      Gizlilik Politikası
                    </Link>
                    {"'nı kabul ediyorum."}
                  </p>
                  {errors.terms && <p className="mt-1 text-sm text-red-500">{errors.terms}</p>}
                </div>

                {/* Başarılı kayıt bildirimi: SignIn ile aynı Alert bileşenini kullan */}
                {successMessage && (
                  <div className="mt-3">
                    <Alert
                      variant="success"
                      title="Kayıt Başarılı"
                      message={successMessage}
                    />
                  </div>
                )}

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