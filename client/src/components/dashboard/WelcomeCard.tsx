import { Link } from "react-router";
import { useAppSelector } from "../../store/hooks";

export default function WelcomeCard() {
  const user = useAppSelector((s) => s.auth.user);
  const firstName = user?.first_name || "";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Hoş geldin{firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Randevularını ve profilini buradan takip edebilirsin.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/appointments/request"
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Randevu Talep Et
          </Link>
          <Link
            to="/profile"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Profili Düzenle
          </Link>
        </div>
      </div>
    </div>
  );
}
