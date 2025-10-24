import { Link, useLocation } from "react-router";
import { ChevronLeftIcon } from "../../icons";

export default function ResetPasswordSentContent() {
  const location = useLocation();
  const email = location.state?.email || "";

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Geri Dön
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/20">
              <svg 
                className="w-8 h-8 text-success-600 dark:text-success-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          <h1 className="mb-3 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Email Gönderildi!
          </h1>
          
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Şifre sıfırlama bağlantısı
            {email && (
              <>
                {" "}
                <span className="font-medium text-gray-800 dark:text-white">
                  {email}
                </span>
              </>
            )}
            {" "}adresine gönderildi.
          </p>

          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            Lütfen email kutunuzu kontrol edin ve şifrenizi sıfırlamak için bağlantıya tıklayın.
          </p>

          <div className="space-y-3">
            <Link
              to="/signin"
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
            >
              Giriş Sayfasına Dön
            </Link>

            <Link
              to="/reset-password"
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 transition bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Tekrar Gönder
            </Link>
          </div>

          <div className="mt-6">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Email gelmediyse spam/gereksiz klasörünüzü kontrol edin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}