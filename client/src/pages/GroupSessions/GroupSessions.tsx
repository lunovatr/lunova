// src/pages/GroupSessions/GroupSessions.tsx
//
// Danışan tarafı grup seansı sayfası (Faz 5, Frontend Yapılandırması planı) -
// tek sayfa, iki sekme: "Keşfet" (uygun grup seanslarına talep gönder) ve
// "Katılımlarım" ("Grup Seanslarım" - talepler/aktif gruplar [grup arkadaşları
// dahil]/geçmiş). Ödeme BURADA alınmaz - onaylanmış-ama-ödenmemiş bir katılım
// için "Ödemeler" sayfasına yönlendirilir (tek bir "ödeme" yüzeyi ilkesi,
// bkz. Payments.tsx'in bu turda genelleşen listesi).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import ToastContainer from "../../components/common/ToastContainer";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import api from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import type {
  GroupSession,
  MyGroupParticipation,
  MyGroupSessionsResponse,
} from "../../types/groupSession";

function formatDateTime(date: string, time: string) {
  return `${new Date(date).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })} · ${time.slice(0, 5)}`;
}

function formatPrice(group: GroupSession) {
  if (group.price == null) return "Fiyat belirtilmemiş";
  return `${group.price} ${group.currency ?? "TRY"}`;
}

function capacityColor(approved: number, capacity: number): "success" | "warning" | "error" {
  if (approved >= capacity) return "error";
  if (approved / capacity >= 0.7) return "warning";
  return "success";
}

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

function ParticipationBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge size="sm" color="success">Onaylandı</Badge>;
  if (status === "pending_approval") return <Badge size="sm" color="warning">Onay Bekliyor</Badge>;
  if (status === "rejected") return <Badge size="sm" color="error">Reddedildi</Badge>;
  if (status === "waiting") return <Badge size="sm" color="info">Bekleme Listesi</Badge>;
  return <Badge size="sm" color="light">{status}</Badge>;
}

export default function GroupSessions() {
  const { toasts, showToast, removeToast } = useToast();
  const [tab, setTab] = useState<"discover" | "mine">("discover");

  // --- Keşfet sekmesi ---
  const [groups, setGroups] = useState<GroupSession[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [requestingId, setRequestingId] = useState<number | null>(null);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await api.get<GroupSession[]>("/api/v1/appointments/group-sessions/");
      setGroups(res.data);
    } catch {
      showToast("Grup seansları yüklenirken hata oluştu.", "error");
    } finally {
      setLoadingGroups(false);
    }
  };

  // --- Katılımlarım sekmesi ---
  const [mine, setMine] = useState<MyGroupSessionsResponse | null>(null);
  const [loadingMine, setLoadingMine] = useState(true);

  const fetchMine = async () => {
    setLoadingMine(true);
    try {
      const res = await api.get<MyGroupSessionsResponse>("/api/v1/appointments/group-sessions/mine/");
      setMine(res.data);
    } catch {
      showToast("Katılımlarınız yüklenirken hata oluştu.", "error");
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestJoin = async (group: GroupSession) => {
    setRequestingId(group.id);
    try {
      await api.post(`/api/v1/appointments/group-sessions/${group.id}/request-join/`);
      showToast("Katılım talebiniz gönderildi.", "success");
      await Promise.all([fetchGroups(), fetchMine()]);
    } catch (err: any) {
      const message = err.response?.data?.detail || "Talep gönderilemedi.";
      showToast(message, "error");
    } finally {
      setRequestingId(null);
    }
  };

  const pendingParticipations = mine?.participations.filter((p) => p.status === "pending_approval") ?? [];
  const activeParticipations = mine?.participations.filter((p) => p.status === "approved") ?? [];
  const historyParticipations =
    mine?.participations.filter((p) => p.status === "rejected") ?? [];
  const waitlistEntries = mine?.waitlist ?? [];

  return (
    <>
      <PageMeta title="Grup Seansları" description="Grup terapisi seanslarına katılın" />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="mx-auto w-full max-w-screen-xl">
        <PageBreadCrumb pageTitle="Grup Seansları" />

        <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-white/[0.05]">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              tab === "discover"
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setTab("discover")}
          >
            Keşfet
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              tab === "mine"
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setTab("mine")}
          >
            Grup Seanslarım
            {(pendingParticipations.length > 0 || activeParticipations.length > 0) && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs text-white">
                {pendingParticipations.length + activeParticipations.length}
              </span>
            )}
          </button>
        </div>

        <div className="mt-6">
          {tab === "discover" && (
            <ComponentCard
              title="Katılabileceğiniz Grup Seansları"
              desc="Uzmanların açtığı grup terapisi/psikoeğitim seanslarına katılım talebi gönderin - uzman onayladıktan sonra ödeme yapabilirsiniz."
            >
              {loadingGroups ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
              ) : groups.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Şu anda katılabileceğiniz açık bir grup seansı yok.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {groups.map((group) => {
                    const myStatus = group.my_participation?.status;
                    return (
                      <div
                        key={group.id}
                        className="rounded-lg border border-gray-200 p-4 dark:border-white/[0.05]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {group.session_offering_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {group.expert_name} · {formatDateTime(group.date, group.time)}
                            </div>
                          </div>
                          <Badge size="sm" color={capacityColor(group.approved_count, group.capacity)}>
                            {group.approved_count}/{group.capacity}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {group.session_type_name && (
                            <Badge size="sm" color="light">{group.session_type_name}</Badge>
                          )}
                          {group.variant_label && (
                            <Badge size="sm" color="info">{group.variant_label}</Badge>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {formatPrice(group)}
                          </span>
                          {myStatus ? (
                            <ParticipationBadge status={myStatus} />
                          ) : group.remaining_spots <= 0 ? (
                            <Button size="sm" onClick={() => handleRequestJoin(group)} disabled={requestingId === group.id}>
                              {requestingId === group.id ? "..." : "Bekleme Listesine Katıl"}
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => handleRequestJoin(group)} disabled={requestingId === group.id}>
                              {requestingId === group.id ? "..." : "Talep Gönder"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ComponentCard>
          )}

          {tab === "mine" && (
            <div className="space-y-6">
              {loadingMine ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
              ) : (
                <>
                  <ComponentCard title="Taleplerim">
                    {pendingParticipations.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Onay bekleyen bir talebiniz yok.</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingParticipations.map((p) => (
                          <ParticipationRow key={p.id} participation={p} />
                        ))}
                      </div>
                    )}
                  </ComponentCard>

                  <ComponentCard title="Aktif Gruplarım" desc="Onaylanmış katılımlarınız ve grup arkadaşlarınız.">
                    {activeParticipations.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aktif bir grup katılımınız yok.</p>
                    ) : (
                      <div className="space-y-4">
                        {activeParticipations.map((p) => (
                          <div key={p.id} className="rounded-lg border border-gray-200 p-4 dark:border-white/[0.05]">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {p.group_session.session_offering_name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {p.group_session.expert_name} ·{" "}
                                  {formatDateTime(p.group_session.date, p.group_session.time)}
                                </div>
                              </div>
                              {p.payment_status === "paid" ? (
                                <Badge size="sm" color="success">Ödendi</Badge>
                              ) : (
                                <Badge size="sm" color="warning">Ödeme Bekleniyor</Badge>
                              )}
                            </div>

                            {p.payment_status === "unpaid" && (
                              <div className="mt-3">
                                <Link to={`/payments?groupParticipantId=${p.id}`}>
                                  <Button size="sm">Ödemeyi Tamamla</Button>
                                </Link>
                              </div>
                            )}

                            {p.payment_status === "paid" && p.group_session.zoom_join_url && (
                              <div className="mt-3">
                                <a href={p.group_session.zoom_join_url} target="_blank" rel="noreferrer">
                                  <Button size="sm">Görüşmeye Katıl</Button>
                                </a>
                              </div>
                            )}

                            <div className="mt-4">
                              <div className="mb-1.5 text-xs font-medium uppercase text-gray-400">
                                Grup Arkadaşlarınız ({p.group_session.participants.length})
                              </div>
                              {p.group_session.participants.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Henüz başka onaylanmış katılımcı yok.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {p.group_session.participants.map((buddy) => (
                                    <span
                                      key={buddy.id}
                                      className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-300"
                                    >
                                      {buddy.client_name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ComponentCard>

                  {waitlistEntries.length > 0 && (
                    <ComponentCard title="Bekleme Listesi">
                      <div className="space-y-3">
                        {waitlistEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-white/[0.05]"
                          >
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {entry.group_session.session_offering_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {entry.group_session.expert_name} ·{" "}
                                {formatDateTime(entry.group_session.date, entry.group_session.time)}
                              </div>
                            </div>
                            <Badge size="sm" color="info">Bekleme Listesi</Badge>
                          </div>
                        ))}
                      </div>
                    </ComponentCard>
                  )}

                  {historyParticipations.length > 0 && (
                    <ComponentCard title="Geçmiş">
                      <div className="space-y-3">
                        {historyParticipations.map((p) => (
                          <ParticipationRow key={p.id} participation={p} />
                        ))}
                      </div>
                    </ComponentCard>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ParticipationRow({ participation }: { participation: MyGroupParticipation }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-white/[0.05]">
      <div>
        <div className="font-medium text-gray-900 dark:text-white">
          {participation.group_session.session_offering_name}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {participation.group_session.expert_name} ·{" "}
          {formatDateTime(participation.group_session.date, participation.group_session.time)}
        </div>
      </div>
      <Badge size="sm" color={participation.status === "rejected" ? "error" : "warning"}>
        {STATUS_LABELS[participation.status] ?? participation.status}
      </Badge>
    </div>
  );
}
