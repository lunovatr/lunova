import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";

// İçerik henüz eklenmedi — bu sayfa sadece altyapı (route + görsel çerçeve)
// olarak hazırlandı. Gerçek "Gizlilik Politikası" metni ayrıca eklenecek.
export default function PrivacyPolicy() {
  return (
    <>
      <PageMeta
        title="Gizlilik Politikası | Lunova"
        description="Lunova gizlilik politikası."
      />
      <div className="mx-auto min-h-screen max-w-3xl px-6 py-12">
        <Link to="/" className="mb-8 inline-block">
          <img
            src="/images/logo/logo-black-red.png"
            alt="Lunova"
            width={120}
            height={32}
            className="h-8 w-auto dark:brightness-0 dark:invert"
          />
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-800 dark:text-white/90">
          Gizlilik Politikası
        </h1>

        <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          <p className="italic text-gray-400 dark:text-gray-500">
            İçerik yakında eklenecektir.
          </p>
        </div>

        <Link
          to="/"
          className="mt-10 inline-block text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          ← Ana sayfaya dön
        </Link>
      </div>
    </>
  );
}
