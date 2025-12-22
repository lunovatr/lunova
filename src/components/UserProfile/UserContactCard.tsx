import { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import api from "../../lib/api";
import { fetchProfile } from "../../store/authSlice";
import { ProfileResponse } from "../../types/auth";

export default function UserSupportCard() {
  const dispatch = useAppDispatch();
  const { userProfile: storeUser } = useAppSelector((s) => s.auth);
  const { isOpen, openModal, closeModal } = useModal();
  
  // Form datayı ProfileResponse tipinde tutuyoruz
  const [formData, setFormData] = useState<Partial<ProfileResponse>>({});

  useEffect(() => {
    if (storeUser) {
      setFormData(storeUser);
    }
  }, [storeUser, isOpen]);

  const handleSave = async () => {
    try {
      // Yeni yapıya göre update paketini hazırlıyoruz
      // Not: Backend beklentisine göre user_data içindeki alanları 
      // direkt veya iç içe göndermen gerekebilir. Genelde patch düzleştirilmiş kabul eder:
      const updateData = {
        user_data: {
          phone_number: formData.user_data?.phone_number,
          country: formData.user_data?.country,
        }
        // timezone ana modelde mi yoksa user_data'da mı kontrol edilmeli
        // JSON örneğinde yoktu ama interface'de varsa ekleyebilirsin.
      };
      
      await api.patch('/api/v1/accounts/profile/', updateData);
      dispatch(fetchProfile());
      closeModal();
    } catch (error) {
      console.error("İletişim bilgileri güncelleme hatası:", error);
    }
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            İletişim ve Konum Bilgileri
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                E-posta Adresi
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {/* Email genelde user_data dışında, ana user objesinde olur */}
                {(storeUser as any)?.email || 'Belirtilmemiş'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Telefon Numarası
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {storeUser?.user_data?.phone_number || 'Eklenmemiş'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Ülke
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {storeUser?.user_data?.country || 'Belirtilmemiş'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Zaman Dilimi (Timezone)
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {/* JSON örneğinde timezone yoktu, varsayılan değer atandı */}
                {(storeUser as any)?.timezone || 'Europe/Istanbul'}
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

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              İletişim Bilgilerini Düzenle
            </h4>
          </div>
          
          <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
            <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                
                <div className="col-span-2">
                  <Label>E-posta Adresi</Label>
                  <Input
                    type="email"
                    value={(formData as any)?.email || ''}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label>Telefon Numarası</Label>
                  <Input 
                    type="text" 
                    value={formData.user_data?.phone_number || ''} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      user_data: { ...formData.user_data!, phone_number: e.target.value }
                    })}
                  />
                </div>

                <div>
                  <Label>Ülke</Label>
                  <Input 
                    type="text" 
                    value={formData.user_data?.country || ''} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      user_data: { ...formData.user_data!, country: e.target.value }
                    })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Zaman Dilimi (Timezone)</Label>
                  <Input 
                    type="text" 
                    value={(formData as any)?.timezone || ''} 
                    onChange={(e) => setFormData({...formData, [ 'timezone' as any]: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>Vazgeç</Button>
              <Button size="sm" onClick={handleSave}>Kaydet</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}