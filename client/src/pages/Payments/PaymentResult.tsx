// src/pages/Payments/PaymentResult.tsx
// Backend'in payments/views.py::checkout_callback'inin iyzico Checkout Form
// sonrası kullanıcı tarayıcısını yönlendirdiği sonuç sayfası
// (?status=...&appointment_id=...). mock modda hiç ziyaret edilmez - mock
// checkout Payments.tsx içinde senkron tamamlanır, gerçek bir redirect yaşanmaz.
import { useSearchParams, Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const appointmentId = searchParams.get("appointment_id");
  const isSuccess = status === "succeeded";

  return (
    <>
      <PageMeta title="Ödeme Sonucu" description="Ödeme işleminizin sonucu" />
      <div className="mx-auto flex min-h-[60vh] w-full max-w-screen-sm flex-col items-center justify-center text-center">
        <div className="w-full rounded-xl border border-gray-200 bg-white p-8 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {isSuccess ? "Ödemeniz Alındı" : "Ödeme Tamamlanamadı"}
          </h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {isSuccess
              ? "Seansınız için ödemeniz başarıyla tamamlandı. Görüşme bağlantınız panelinizde hazır."
              : "Ödeme işlemi tamamlanamadı. Kartınızdan herhangi bir tutar çekilmediyse tekrar deneyebilirsiniz."}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {isSuccess && appointmentId && (
              <Link to={`/appointments/${appointmentId}`}>
                <Button>Randevumu Görüntüle</Button>
              </Link>
            )}
            <Link to="/payments">
              <Button variant="outline">Ödemelerime Dön</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
