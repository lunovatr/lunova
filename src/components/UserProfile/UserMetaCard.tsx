import { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import api from "../../lib/api";
import { fetchProfile } from "../../store/authSlice";
import { ProfileResponse, Gender } from "../../types/auth";

export default function UserMetaCard() {
  const dispatch = useAppDispatch();
  const { userProfile: storeUser } = useAppSelector((s) => s.auth);
  const { isOpen, openModal, closeModal } = useModal();
  
  // Local state'i yeni ProfileResponse tipine göre yönetiyoruz
  const [formData, setFormData] = useState<Partial<ProfileResponse>>({});

  useEffect(() => {
    if (storeUser) {
      setFormData(storeUser);
    }
  }, [storeUser, isOpen]);

  const handleSave = async () => {
    try {
      // Backend beklentisine göre user_data içindeki alanları gönderiyoruz
      const updateData = {
        user_data: {
          gender: formData.user_data?.gender,
          birth_date: formData.user_data?.birth_date,
        }
        // id_number JSON örneğinde yoktu ama gerekirse user_data altına eklenebilir
      };
      
      await api.patch('/api/v1/accounts/profile/', updateData);
      dispatch(fetchProfile());
      closeModal();
    } catch (error) {
      console.error("Kimlik bilgileri güncelleme hatası:", error);
    }
  };

  // İsim ve Soyisim artık user_data içinde
  const fullName = `${storeUser?.user_data?.first_name || ''} ${storeUser?.user_data?.last_name || ''}`.trim() || "Kullanıcı";
  
  // Fotoğrafı documents dizisi içinden 'profile_photo' tipine göre buluyoruz
  const profileDoc = storeUser?.documents?.find(doc => doc.type === 'profile_photo');
  const profilePicture = profileDoc?.access_url || "/default-avatar.png";

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 bg-gray-50">
              <img 
                src={profilePicture} 
                alt={fullName}
                className="object-cover w-full h-full" 
                onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.png"; }}
              />
            </div>
            <div className="grow">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {fullName}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                   {storeUser?.user_data?.gender === 'male' ? 'Erkek' : storeUser?.user_data?.gender === 'female' ? 'Kadın' : 'Danışan'}
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                   {storeUser?.onboarding_complete ? 'Profil Tamamlandı' : 'Profil Eksik'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 lg:inline-flex lg:w-auto"
          >
            Düzenle
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Kimlik Bilgileri</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Temel profil bilgilerinizi buradan yönetebilirsiniz.</p>
          </div>

          <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
            <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                
                <div>
                  <Label>Adı</Label>
                  <Input 
                    type="text" 
                    value={formData.user_data?.first_name || ''} 
                    disabled 
                    className="bg-gray-50 cursor-not-allowed" 
                  />
                </div>

                <div>
                  <Label>Soyadı</Label>
                  <Input 
                    type="text" 
                    value={formData.user_data?.last_name || ''} 
                    disabled 
                    className="bg-gray-50 cursor-not-allowed" 
                  />
                </div>

                <div>
                  <Label>Doğum Tarihi</Label>
                  <Input 
                    type="date" 
                    value={formData.user_data?.birth_date || ''} 
                    onChange={(e) => setFormData({
                      ...formData,
                      user_data: { ...formData.user_data!, birth_date: e.target.value }
                    })}
                  />
                </div>

                <div>
                  <Label>Cinsiyet</Label>
                  <select 
                    value={formData.user_data?.gender || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      user_data: { ...formData.user_data!, gender: e.target.value as Gender }
                    })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    <option value="male">Erkek</option>
                    <option value="female">Kadın</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>İptal</Button>
              <Button size="sm" onClick={handleSave}>Değişiklikleri Kaydet</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}