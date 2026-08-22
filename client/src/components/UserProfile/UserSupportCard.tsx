import { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import api from "../../lib/api";
import { fetchProfile } from "../../store/authSlice";
import { ADDICTION_TYPES } from "../../types/profile.types";
import { ProfileUpdatePayload } from "../../types/profile.payload";
import { mapProfileToUpdatePayload } from "../../mappers/profileMapper";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";

export default function UserTreatmentCard() {
  const dispatch = useAppDispatch();
  const { userProfile: storeUser } = useAppSelector((s) => s.auth);
  const { toasts, showToast, removeToast } = useToast();
  const { isOpen, openModal, closeModal } = useModal();
  
  const [formData, setFormData] = useState<Partial<ProfileUpdatePayload>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (storeUser) {
      setFormData(mapProfileToUpdatePayload(storeUser));
    }
  }, [storeUser, isOpen]);

  const handleToggleAddiction = (id: number) => {
    const currentSubstances = formData.substances_used || [];
    if (currentSubstances.includes(id)) {
      setFormData({
        ...formData,
        substances_used: currentSubstances.filter((sid) => sid !== id),
      });
    } else {
      setFormData({
        ...formData,
        substances_used: [...currentSubstances, id],
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        support_goal: formData.support_goal,
        received_service_before: formData.received_service_before,
        substances_used: formData.substances_used, // ID listesini gönderiyoruz
      };

      await api.patch('/api/v1/accounts/profile/', updateData);
      await dispatch(fetchProfile());
      closeModal();
      showToast("Süreç bilgileriniz güncellendi.", "success");
    } catch (error: any) {
      console.error("Profil detayları güncelleme hatası:", error);
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Süreç bilgileri güncellenemedi. Lütfen tekrar deneyin.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* Görüntüleme Kartı */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Terapi ve Destek Hedefleri
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div className="col-span-1 lg:col-span-2">
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Atanan Uzmanınız</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {storeUser?.expert?.full_name || 'Henüz bir hedef belirtilmedi.'}
                </p>
              </div>


              <div className="col-span-1 lg:col-span-2">
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Destek Hedefi</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {storeUser?.support_goal || 'Henüz bir hedef belirtilmedi.'}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Bağımlılık Durumu</p>
                <div className="flex flex-wrap gap-2">
                  {storeUser?.substances_used && storeUser.substances_used.length > 0 ? (
                    storeUser.substances_used.map((addiction) => (
                      <span
                        key={addiction.id}
                        className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-md dark:bg-blue-500/10 dark:text-blue-400"
                      >
                        {addiction.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">Belirtilmedi</p>
                  )}

                </div>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Daha Önce Hizmet Alındı mı?</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {storeUser?.received_service_before ? 'Evet' : 'Hayır'}
                </p>
              </div>
            </div>
          </div>

          <button onClick={openModal} className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 lg:inline-flex lg:w-auto">
            Düzenle
          </button>
        </div>
      </div>

      {/* Düzenleme Modali */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <h4 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white/90">Süreci Güncelle</h4>
          
          <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
            <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-y-6">
                
                {/* Destek Hedefi */}
                <div>
                  <Label>Destek Hedefiniz</Label>
                  <textarea
                    rows={3}
                    value={formData.support_goal || ''}
                    onChange={(e) => setFormData({...formData, support_goal: e.target.value})}
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500"
                    placeholder="Neyi başarmak istiyorsunuz?"
                  />
                </div>

                {/* Bağımlılık Seçimi */}
                <div>
                  <Label>Bağımlılık Türleri / Konular</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {ADDICTION_TYPES.map((type) => (
                      <div 
                        key={type.id}
                        onClick={() => handleToggleAddiction(type.id)}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                          formData.substances_used?.includes(type.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                            : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.substances_used?.includes(type.id) || false}
                          readOnly
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {type.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hizmet Alma Durumu */}
                <div className="flex items-center gap-3 p-1">
                  <input
                    type="checkbox"
                    id="received_service"
                    checked={formData.received_service_before || false}
                    onChange={(e) => setFormData({...formData, received_service_before: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="received_service" className="!mb-0 cursor-pointer">
                    Daha önce profesyonel bir yardım aldım.
                  </Label>
                </div>

              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-8 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} disabled={isSaving}>İptal</Button>
              <Button size="sm" onClick={handleSave} isLoading={isSaving}>Değişiklikleri Kaydet</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}