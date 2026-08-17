import { useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';

export default function GlobalSpinner() {
  useEffect(() => {
    // Yükleme sırasında scroll'u engelle
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    
    // Cleanup: component unmount olduğunda scroll'u tekrar aktif et
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'unset';
      }
    };
  }, []);
  const loading = useAppSelector((s) => s.auth.loading);

  if (!loading) return null;

  // Yükleme sırasında scroll'u engelle
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }

  // Component unmount olduğunda scroll'u tekrar aktif et
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
