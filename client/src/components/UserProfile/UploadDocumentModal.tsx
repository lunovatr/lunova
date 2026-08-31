import { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import api from "../../lib/api";
import { useAppDispatch } from "../../store/hooks";
import { fetchProfile, fetchMe } from "../../store/authSlice";
import { DOCUMENT_TYPE_LABELS, DocumentTypes } from "../../types/profile.types";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProfilePhoto?: boolean;
}

export default function UploadDocumentModal({ isOpen, onClose, isProfilePhoto }: UploadDocumentModalProps) {
  const dispatch = useAppDispatch();
  // Eğer isProfilePhoto true ise başlangıç değerini 'profile_photo' yapıyoruz
  const [documentType, setDocumentType] = useState<DocumentTypes | "">(
    isProfilePhoto ? 'profile_photo' : ""
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async () => {
    if (!selectedFile || !documentType) {
      setUploadError("Lütfen hem dosya tipini seçin hem de bir dosya yükleyin.");
      return;
    }

    setLoading(true);
    setUploadError(null);

    try {
      // 1. Backend'den presigned upload URL al (dosya henüz backend'e gitmiyor).
      const presignRes = await api.post("/api/v1/accounts/documents/presign-upload/", {
        type: documentType,
      });
      const { file_key, upload } = presignRes.data;

      // 2. Dosyayı doğrudan storage'a (presigned URL'e) yükle - backend'i bypass eder.
      const uploadRes = await fetch(upload.url, {
        method: upload.method || "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type },
      });
      if (!uploadRes.ok) {
        throw new Error(`Dosya depolamaya yüklenemedi (durum: ${uploadRes.status}).`);
      }

      // 3. Yükleme kaydını finalize et (Document satırı burada oluşuyor).
      await api.post("/api/v1/accounts/documents/", {
        type: documentType,
        file_key,
        original_filename: selectedFile.name,
        is_primary: false,
      });

      dispatch(fetchProfile());
      handleClose(); // Başarılıysa temizle ve kapat

      // fetchMe() sadece header'daki avatarı besleyen user.profile_photo alanını
      // dolduruyor (fetchProfile zaten documents listesini güncelliyor) - AYRICA
      // fetchMe.pending, RequireAuth'un tüm AppLayout'u tam ekran GlobalSpinner'a
      // çevirmesine sebep oluyor (bkz. store/authSlice.ts + App.tsx). Bu yüzden
      // sadece gerçekten profil fotoğrafı değiştiyse tetikleniyor - diğer belge
      // tiplerinde (CV/diploma/vb.) sayfa "yenileniyormuş" gibi hissettirmiyor.
      if (documentType === 'profile_photo') {
        // backend'te işlem tamamlanmadan hemen me/ çağırırsan güncellemeyi yakalayamazsın.
        await new Promise(resolve => setTimeout(resolve, 2000));
        await dispatch(fetchMe());
      }

    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      // 1. Yetki Hatası Kontrolü (401 Unauthorized)
      if (status === 401 || errorData?.detail === "Authentication credentials were not provided.") {
        setUploadError("Oturum süreniz dolmuş. Lütfen tekrar giriş yapmak için sayfayı yenileyin.");
        // İstersen 2 saniye sonra sayfayı otomatik yenileyebilirsin:
        // setTimeout(() => window.location.reload(), 2000);
        return;
      }

      // 2. Validasyon Hataları (finalize serializer'ının döndürdüğü gerçek alan adları)
      if (errorData?.file_key && Array.isArray(errorData.file_key) && errorData.file_key.length > 0) {
        setUploadError(errorData.file_key[0]);
      }
      else if (errorData?.type && Array.isArray(errorData.type) && errorData.type.length > 0) {
        setUploadError(errorData.type[0]);
      }
      // 3. presign adımının döndürdüğü düz {"detail": "..."} hataları
      else if (typeof errorData?.detail === "string") {
        setUploadError(errorData.detail);
      }
      // 4. Diğer Hatalar (örn. storage PUT başarısızlığı)
      else if (error.message) {
        setUploadError(error.message);
      }
      else {
        setUploadError("Yükleme sırasında teknik bir sorun oluştu.");
      }

      console.error("Hata Detayı:", status, errorData);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDocumentType("");
    setSelectedFile(null);
    setUploadError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Dosya Yükle</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Lütfen yüklenecek dosya tipini seçin ve dosyanızı seçin.
          </p>
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/30 rounded-lg text-sm text-red-600 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {uploadError}
          </div>
        )}

        <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
          <div className="px-2 space-y-5">
            <div>
              <Label>Dosya Tipi</Label>
              <select
                  className={`w-full mt-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white text-gray-800 focus:ring-2 outline-none dark:text-white dark:bg-gray-800 ${
                    isProfilePhoto ? "bg-gray-100 cursor-not-allowed opacity-70" : ""
                  }`}
                  value={documentType}
                  disabled={isProfilePhoto} // Profil fotoğrafı ise değiştirilemez
                  onChange={(e) => setDocumentType(e.target.value as DocumentTypes)}
                >
                  {isProfilePhoto ? (
                    // Profil fotoğrafı modunda sadece bu seçeneği göster
                    <option value="profile_photo">Profil Fotoğrafı</option>
                  ) : (
                    // Normal döküman modunda listeyi göster
                    <>
                      <option value="">Seçiniz...</option>
                      {Object.entries(DOCUMENT_TYPE_LABELS)
                        .filter(([value]) => !['profile_photo', 'consent_form'].includes(value as DocumentTypes))
                        .map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                    </>
                  )}
                </select>
              {documentType === "recovery_proof" && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Bu belge onaylandığında "ex-user" olarak doğrulanırsınız ve sadece
                  ex-user'lara açık grup seanslarına katılabilirsiniz.
                </p>
              )}
            </div>

            <div>
              <Label>Dosya Seçin</Label>
              <div className="relative mt-1.5">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf" 
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
                      if (!allowedTypes.includes(file.type)) {
                        setUploadError("Yalnızca JPG, PNG veya PDF dosyaları yükleyebilirsiniz.");
                        setSelectedFile(null);
                        return;
                      }
                      setUploadError(null);
                      setSelectedFile(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-8 px-4 transition-colors ${
                  selectedFile 
                    ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10" 
                    : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30"
                } hover:bg-gray-100 dark:hover:bg-gray-800/50`}>
                  <svg className={`w-8 h-8 mb-2 ${selectedFile ? "text-blue-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {selectedFile ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    )}
                  </svg>
                  <span className={`text-sm text-center ${selectedFile ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-600 dark:text-gray-400"}`}>
                    {selectedFile ? selectedFile.name : "Dosyayı buraya sürükleyin veya tıklayın"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 mt-8 lg:justify-end">
            <Button size="sm" variant="outline" onClick={handleClose} disabled={loading}>
              İptal
            </Button>
            <Button 
              size="sm" 
              onClick={handleFileUpload}
              disabled={!selectedFile || !documentType || loading}
            >
              {loading ? "Yükleniyor..." : "Yüklemeyi Başlat"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}