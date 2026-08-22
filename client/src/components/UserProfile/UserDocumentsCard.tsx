import { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../hooks/useToast";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchProfile } from "../../store/authSlice";
import api from "../../lib/api";
import { DOCUMENT_TYPE_LABELS, DocumentTypes, DOCUMENT_STATUS_LABELS } from "../../types/profile.types";
import { Document } from "../../types/profile.types";
import UploadDocumentModal from "./UploadDocumentModal";
import ToastContainer from "../common/ToastContainer";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";

export default function UserDocumentsCard() {
  const dispatch = useAppDispatch();
  const { userProfile: storeUser } = useAppSelector((s) => s.auth);
  const { isOpen, openModal, closeModal } = useModal();
  const deleteModal = useModal();
  const { toasts, showToast, removeToast } = useToast();
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getDocumentTypeLabel = (type: DocumentTypes | string): string => {
    return DOCUMENT_TYPE_LABELS[type as DocumentTypes] || 'Bilinmeyen Dosya';
  };

  const handleDeleteClick = (document: Document) => {
    setDocToDelete(document);
    deleteModal.openModal();
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/accounts/documents/${docToDelete.uid}/`);
      showToast("Belge silindi.", "success");
      deleteModal.closeModal();
      setDocToDelete(null);
      dispatch(fetchProfile());
    } catch (err: any) {
      // DocumentDeleteView, iş kuralı ihlallerini (onaylanmış/birincil belge)
      // DRF ValidationError ile fırlatıyor - düz string verildiğinde DRF bunu
      // {"detail": ...} DEĞİL, ham bir dizi ["mesaj"] olarak serialize ediyor.
      const errorData = err.response?.data;
      const message = Array.isArray(errorData) && errorData.length > 0
        ? errorData[0]
        : errorData?.detail || "Belge silinirken bir hata oluştu.";
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="flex flex-col gap-6">
        {/* Başlık ve Yeni Ekle Butonu */}
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Dosyalarım
          </h4>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Yeni Dosya Yükle
          </button>
        </div>

        <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-2 lg:gap-x-32">
          {storeUser?.documents && storeUser.documents.filter(d => d.type !== 'profile_photo').length > 0 ? (
            [...storeUser.documents]
              .filter(doc => doc.type !== 'profile_photo')
              .sort((a, b) => Object.keys(DOCUMENT_TYPE_LABELS).indexOf(a.type) - Object.keys(DOCUMENT_TYPE_LABELS).indexOf(b.type))
              .map((doc, index) => {
                // Backend, birincil bir belgenin silinmesini (pasifleştirilmesini)
                // reddediyor (bkz. DocumentDeleteView) - butonu baştan devre dışı
                // bırakıp kullanıcının her denemede hata almasını önlüyoruz.
                // Onaylanmış belgeler için aynı kısıtlama kullanıcı talebiyle
                // kaldırıldı (21. tur) - silme artık geri alınabilir bir
                // deactivate, "onaylanmış kanıtı geri dönüşsüz kaybetme" riski yok.
                const deleteBlockedReason = doc.is_primary
                  ? "Birincil belge silinemez."
                  : null;

                return (
                <div key={doc.uid ?? index} className="group">
                  {/* E-posta Başlığı Formatı */}
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tight">
                    {getDocumentTypeLabel(doc.type)}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {doc.original_filename}
                        </p>

                        {/* Durum Badge'i - 3 durumlu (pending/approved/rejected) */}
                        <span className={`flex items-center gap-1 text-[10px] rounded-full font-bold px-2 py-0.5 ring-1 ring-inset ${
                          doc.status === 'approved'
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 ring-green-600/20'
                            : doc.status === 'rejected'
                            ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 ring-red-600/20'
                            : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 ring-yellow-600/20'
                        }`}>
                          <span className={`w-1 h-1 rounded-full animate-pulse ${
                            doc.status === 'approved'
                              ? 'bg-green-600 dark:bg-green-400'
                              : doc.status === 'rejected'
                              ? 'bg-red-600 dark:bg-red-400'
                              : 'bg-yellow-600 dark:bg-yellow-400'
                          }`} />
                          {DOCUMENT_STATUS_LABELS[doc.status] ?? 'Onay Bekliyor'}
                        </span>
                      </div>

                      {/* Tarih Bilgisi */}
                      <p className="text-[11px] text-gray-400">
                        Yükleme: {new Date(doc.uploaded_at).toLocaleDateString('tr-TR')}
                      </p>

                      {/* Tarih Bilgisi */}
                      <p className="text-[11px] text-gray-400">
                        Son değişiklik: {new Date(doc.updated_at).toLocaleDateString('tr-TR')}
                      </p>

                      {/* Onay Bilgisi */}
                       {doc.verified_at && (
                        <p className={`text-[11px] font-medium ${
                          doc.status === 'rejected' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'
                        }`}>
                          {doc.status === 'rejected' ? 'Red' : 'Onay'}: {new Date(doc.verified_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Aksiyon İkonları */}
                    <div className="flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                      {doc.access_url && (
                        <a
                          href={doc.access_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Belgeyi Görüntüle"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteClick(doc)}
                        disabled={!!deleteBlockedReason}
                        title={deleteBlockedReason ?? "Belgeyi Sil"}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                );
              })
          ) : (
            <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
              <p className="text-sm text-gray-400 italic">Henüz bir döküman yüklenmemiş.</p>
            </div>
          )}
        </div>
      </div>

      <UploadDocumentModal
        isOpen={isOpen}
        onClose={closeModal}
      />

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          if (deleting) return;
          deleteModal.closeModal();
          setDocToDelete(null);
        }}
        className="max-w-[440px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900">
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Belgeyi Sil
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {docToDelete && (
              <>
                <span className="font-medium text-gray-700 dark:text-gray-300">{docToDelete.original_filename}</span>
                {" "}belgesini silmek istediğinize emin misiniz? Belge hemen kaldırılır, dosyanın kendisi
                sistemde saklanmaya devam eder.
              </>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                deleteModal.closeModal();
                setDocToDelete(null);
              }}
              disabled={deleting}
            >
              Vazgeç
            </Button>
            <Button onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Siliniyor..." : "Evet, Sil"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
