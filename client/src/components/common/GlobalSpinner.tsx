import { useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';

export default function GlobalSpinner() {
  const loading = useAppSelector((s) => s.auth.loading);

  // GlobalSpinner App.tsx'te hep mount halinde (loading'e göre null döner),
  // hiç unmount olmuyor — bu yüzden overflow'u "loading" değişince (dependency
  // array'de) resetlemek gerekiyor; sadece unmount cleanup'ına güvenmek
  // (önceki hâli) loading true->false geçişinde body'yi kalıcı olarak
  // scroll'suz bırakıyordu (ilk girişten sonra ana sayfada scroll çalışmıyordu).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = loading ? 'hidden' : 'unset';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [loading]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 dark:bg-black/50">
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <svg className="w-6 h-6 animate-spin text-brand-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span className="font-medium text-gray-900 dark:text-white">Yükleniyor...</span>
      </div>
    </div>
  );
}
