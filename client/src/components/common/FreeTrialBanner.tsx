// src/components/common/FreeTrialBanner.tsx
//
// Danışanın ömür boyu bir kez hakkı olan ücretsiz ilk seansını henüz
// kullanmadığını vurgulayan promosyon banner'ı - hem ana sayfada (Home.tsx)
// hem randevu alma akışında (Request.tsx) kullanılıyor, bu yüzden
// components/dashboard/ değil components/common/ altında (30. tur).
//
// GET /api/v1/payments/free-trial-eligibility/ kendi başına çeker - backend'in
// bu ucu ayrı tutmasının nedeni: eligibility danışanın TÜM Payment geçmişine
// bakıyor, ama Home.tsx/Request.tsx'in elindeki randevu listesi backend'in
// zorunlu tuttuğu tarih aralığıyla (en fazla 4 ay) sınırlı - bu bilgi var olan
// veriden güvenilir şekilde türetilemez.
import { useEffect, useState } from "react";
import api from "../../lib/api";

interface FreeTrialBannerProps {
  className?: string;
}

export default function FreeTrialBanner({ className = "" }: FreeTrialBannerProps) {
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ eligible: boolean }>("/api/v1/payments/free-trial-eligibility/")
      .then((res) => {
        if (!cancelled) setEligible(res.data.eligible);
      })
      .catch(() => {
        if (!cancelled) setEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!eligible) return null;

  return (
    <div
      className={`rounded-lg border border-success-200 bg-success-50 p-4 dark:border-success-500/30 dark:bg-success-500/10 ${className}`}
    >
      <p className="text-sm font-medium text-success-700 dark:text-success-400">
        🎁 İlk 15 dakikalık seansınız ücretsiz!
      </p>
      <p className="mt-1 text-xs text-success-600 dark:text-success-400/80">
        Henüz hiç ücretli seans almadınız - randevunuz onaylandığında ücretsiz ilk seans hakkınızı kullanabilirsiniz.
      </p>
    </div>
  );
}
