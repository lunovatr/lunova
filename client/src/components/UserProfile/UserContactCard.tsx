import { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import api from "../../lib/api";
import { fetchProfile } from "../../store/authSlice";
import { ProfileUpdatePayload } from "../../types/profile.payload";
import { mapProfileToUpdatePayload } from "../../mappers/profileMapper";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";

export default function UserSupportCard() {
  const dispatch = useAppDispatch();
  const { userProfile: storeUser } = useAppSelector((s) => s.auth);
  const { toasts, showToast, removeToast } = useToast();
  const { isOpen, openModal, closeModal } = useModal();
  
  // Form datayı ProfileResponse tipinde tutuyoruz
  const [formData, setFormData] = useState<Partial<ProfileUpdatePayload>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (storeUser) {
      setFormData(mapProfileToUpdatePayload(storeUser));
    }
  }, [storeUser, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        user_data: {
          phone_number: formData.user?.phone_number,
          country: formData.user?.country,
          timezone: formData.user?.timezone
        },
        emergency_contacts: formData.emergency_contacts
      };

      await api.patch('/api/v1/accounts/profile/', updateData);
      await dispatch(fetchProfile());
      closeModal();
      showToast("İletişim bilgileriniz güncellendi.", "success");
    } catch (error: any) {
      console.error("İletişim bilgileri güncelleme hatası:", error);
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "İletişim bilgileri güncellenemedi. Lütfen tekrar deneyin.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
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
                {storeUser?.user?.email || 'Belirtilmemiş'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Telefon Numarası
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {storeUser?.user?.phone_number || 'Eklenmemiş'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Ülke
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {storeUser?.user?.country || 'Belirtilmemiş'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Zaman Dilimi (Timezone)
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {storeUser?.user?.timezone || 'Europe/Istanbul'}
              </p>
            </div>

            <div className="space-y-3">
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Acil Durum Kişi Bilgileri
              </p>

              {storeUser?.emergency_contacts && storeUser.emergency_contacts.length > 0 ? (
                <div className="grid gap-2">
                  {storeUser.emergency_contacts.map((contact, index) => (
                    <div
                      key={contact.id ?? index}
                      className="group relative flex items-center "
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {contact.name}
                          </span>
                          {contact.relationship && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
                              {contact.relationship}
                            </span>
                          )}
                          {contact.is_primary && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full ring-1 ring-inset ring-blue-600/20">
                              <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                              BİRİNCİL
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          <span className="text-xs font-medium tabular-nums">
                            {contact.phone_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                  <span className="text-sm italic text-gray-400">Henüz acil durum kişisi eklenmemiş.</span>
                </div>
              )}
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
                    value={formData.user?.email || ''}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label>Telefon Numarası</Label>
                  <Input 
                    type="text" 
                    value={formData.user?.phone_number || ''} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      user: { ...formData.user!, phone_number: e.target.value }
                    })}
                  />
                </div>

                <div>
                  <Label>Ülke</Label>
                  <Input 
                    type="text" 
                    value={formData.user?.country || ''} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      user: { ...formData.user!, country: e.target.value }
                    })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Zaman Dilimi (Timezone)</Label>
                  <Input 
                    type="text" 
                    value={formData.user?.timezone || ''} 
                    onChange={(e) => setFormData({
                      ...formData,
                      user: { ...formData.user!, timezone: e.target.value }
                    })}
                  />
                </div>

                <div className="col-span-2 space-y-3">
                  <Label>Acil Durum Kişileri</Label>

                  {formData.emergency_contacts?.map((contact, index) => (
                    <div key={index} className="space-y-2 mb-8"> {/* Sadece alt alta dizilimi sağlayan temiz div */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ad Soyad"
                          value={contact.name}
                          onChange={(e) => {
                            const updated = [...(formData.emergency_contacts ?? [])];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setFormData({ ...formData, emergency_contacts: updated });
                          }}
                        />
                        <Input
                          placeholder="Telefon"
                          value={contact.phone_number}
                          onChange={(e) => {
                            const updated = [...(formData.emergency_contacts ?? [])];
                            updated[index] = { ...updated[index], phone_number: e.target.value };
                            setFormData({ ...formData, emergency_contacts: updated });
                          }}
                        />
                      </div>

                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Yakınlık (Örn: Kardeş)"
                          className="flex-1"
                          value={contact.relationship ?? ''}
                          onChange={(e) => {
                            const updated = [...(formData.emergency_contacts ?? [])];
                            updated[index] = { ...updated[index], relationship: e.target.value };
                            setFormData({ ...formData, emergency_contacts: updated });
                          }}
                        />
                  
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Birincil Seçim Kartı */}
                        <div
                          onClick={() => {
                            const updated = (formData.emergency_contacts ?? []).map((c, i) => ({
                              ...c,
                              is_primary: i === index ? !contact.is_primary : false
                            }));
                            setFormData({ ...formData, emergency_contacts: updated });
                          }}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition-colors h-[40px] ${
                            contact.is_primary
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600'
                              : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400'
                          }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full border ${
                            contact.is_primary ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`} />
                          <span className="text-xs font-medium select-none">Birincil</span>
                        </div>

                        {/* Kaldır Butonu */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (formData.emergency_contacts ?? []).filter((_, i) => i !== index);
                            setFormData({ ...formData, emergency_contacts: updated });
                          }}
                          className="flex items-center justify-center w-[40px] h-[40px] border border-red-100 dark:border-red-900/30 rounded-xl bg-red-50/50 dark:bg-red-500/5 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                          title="Kişiyi Kaldır"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                  </div>
                </div>
              </div>
                  ))}

                  {(formData.emergency_contacts?.length ?? 0) < 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          emergency_contacts: [
                            ...(formData.emergency_contacts ?? []),
                            { name: '', phone_number: '', relationship: '', is_primary: (formData.emergency_contacts?.length ?? 0) === 0 },
                          ],
                        })
                      }
                      className="text-sm text-blue-600 hover:text-blue-700 block mt-1"
                    >
                      + Acil Durum Kişisi Ekle
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} disabled={isSaving}>Vazgeç</Button>
              <Button size="sm" onClick={handleSave} isLoading={isSaving}>Kaydet</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}