// src/pages/Packages/Packages.tsx
//
// Faz 7 (Frontend Yapılandırması planı, düşük öncelik) - PackageDefinition/
// PackagePurchase daha önce hiçbir frontend'i olmayan, backend'de tam
// çalışır durumdaki bir özellikti. Basit tutuldu: satın alma Payments.tsx'in
// onay modalı deseninin küçük bir kopyası (discount code dahil).
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import ToastContainer from "../../components/common/ToastContainer";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import api from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import { useModal } from "../../hooks/useModal";
import type { PackageDefinition, PackagePurchase } from "../../types/package";

interface CheckoutResponse {
  status: string;
  payment_page_url: string | null;
  mock?: boolean;
}

function formatPrice(pkg: PackageDefinition) {
  if (pkg.price == null) return "Fiyat belirtilmemiş";
  return `${pkg.price} ${pkg.currency ?? "TRY"}`;
}

export default function Packages() {
  const { toasts, showToast, removeToast } = useToast();
  const confirmModal = useModal();

  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [myPackages, setMyPackages] = useState<PackagePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PackageDefinition | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [packagesRes, mineRes] = await Promise.all([
        api.get<PackageDefinition[]>("/api/v1/payments/packages/"),
        api.get<PackagePurchase[]>("/api/v1/payments/packages/mine/"),
      ]);
      setPackages(packagesRes.data);
      setMyPackages(mineRes.data);
    } catch {
      showToast("Paketler yüklenirken hata oluştu.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openConfirm = (pkg: PackageDefinition) => {
    setSelected(pkg);
    setDiscountCode("");
    confirmModal.openModal();
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const response = await api.post<CheckoutResponse>(
        `/api/v1/payments/packages/${selected.id}/checkout/`,
        { discount_code: discountCode.trim() || undefined }
      );
      if (response.data.payment_page_url) {
        window.location.href = response.data.payment_page_url;
        return;
      }
      showToast("Paket satın alımınız tamamlandı.", "success");
      confirmModal.closeModal();
      setSelected(null);
      await fetchAll();
    } catch (err: any) {
      const message = err.response?.data?.detail || "Satın alma başlatılamadı.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta title="Paketler" description="Toplu seans paketlerini görüntüleyin ve satın alın" />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="mx-auto w-full max-w-screen-xl">
        <PageBreadCrumb pageTitle="Paketler" />

        <div className="mt-6 space-y-6">
          <ComponentCard title="Paketlerim">
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
            ) : myPackages.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Henüz satın aldığınız bir paket yok.</p>
            ) : (
              <div className="space-y-3">
                {myPackages.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-white/[0.05]"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {purchase.package_definition.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {purchase.package_definition.applies_to_offering_name}
                      </div>
                    </div>
                    <Badge size="sm" color={purchase.remaining_sessions > 0 ? "success" : "light"}>
                      {purchase.remaining_sessions} hak kaldı
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ComponentCard>

          <ComponentCard title="Satın Alınabilir Paketler">
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
            ) : packages.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Şu anda satın alınabilecek bir paket tanımlı değil.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="rounded-lg border border-gray-200 p-4 dark:border-white/[0.05]"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{pkg.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {pkg.session_count} seans · {pkg.applies_to_offering_name}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatPrice(pkg)}
                      </span>
                      <Button size="sm" onClick={() => openConfirm(pkg)}>
                        Satın Al
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ComponentCard>
        </div>
      </div>

      <Modal isOpen={confirmModal.isOpen} onClose={() => !submitting && confirmModal.closeModal()} className="max-w-[440px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900">
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Paket Satın Al</h4>
          {selected && (
            <>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">{selected.name}</span> için{" "}
                <span className="font-medium">{formatPrice(selected)}</span> tutarında ödeme yapılacak.
              </p>
              <div className="mb-6">
                <Label htmlFor="package_discount_code">İndirim Kodu (opsiyonel)</Label>
                <Input
                  id="package_discount_code"
                  type="text"
                  placeholder="Varsa indirim kodunuzu girin"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => confirmModal.closeModal()} disabled={submitting}>
              Vazgeç
            </Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Yönlendiriliyor..." : "Satın Almayı Tamamla"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
