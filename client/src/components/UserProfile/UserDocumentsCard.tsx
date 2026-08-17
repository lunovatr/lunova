import { useModal } from "../../hooks/useModal";
import { useAppSelector } from "../../store/hooks";
import api from "../../lib/api";
import { DOCUMENT_TYPE_LABELS, DocumentTypes } from "../../types/profile.types";
import { Document } from "../../types/profile.types";
import UploadDocumentModal from "./UploadDocumentModal";

export default function UserDocumentsCard() {
  const { userProfile: storeUser } = useAppSelector((s) => s.auth);
  const { isOpen, openModal, closeModal } = useModal();
  
  const getDocumentTypeLabel = (type: DocumentTypes | string): string => {
    return DOCUMENT_TYPE_LABELS[type as DocumentTypes] || 'Bilinmeyen Dosya';
  };

  const handleDeleteDocument = async (document: Document) => {
    console.log("Henüz silme desteklenmiyor: ", document.filename);
  };

  const handleDownload = async (url: string, filename: string) => {
    if (!url) return;

    try {
      const response = await api.get(url, {
        responseType: 'blob', 
      });
      const blob = new Blob([response.data as any]); 
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'belge');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Dosya indirilirken bir hata oluştu:", error);
    }
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900">
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
              .map((doc, index) => (
                <div key={doc.uid ?? index} className="group">
                  {/* E-posta Başlığı Formatı */}
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tight">
                    {getDocumentTypeLabel(doc.type)}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {doc.filename}
                        </p>
                        
                        {/* Durum Badge'i */}
                        <span className={`flex items-center gap-1 text-[10px] rounded-full font-bold px-2 py-0.5 ring-1 ring-inset ${
                          doc.verified 
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 ring-green-600/20' 
                            : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 ring-yellow-600/20'
                        }`}>
                          <span className={`w-1 h-1 rounded-full animate-pulse ${doc.verified ? 'bg-green-600 dark:bg-green-400' : 'bg-yellow-600 dark:bg-yellow-400'}`} />
                          {doc.verified ? 'Onaylı' : 'Onay Bekliyor'}
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
                        <p className="text-[11px] text-blue-500 dark:text-blue-400 font-medium">
                          Onay: {new Date(doc.verified_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Aksiyon İkonları */}
                    <div className="flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          if (doc.access_url) {
                            handleDownload(doc.access_url, doc.filename);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Dosyayı İndir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
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

    </div>
  );
}