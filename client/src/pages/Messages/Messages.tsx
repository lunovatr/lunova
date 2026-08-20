import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import ToastContainer from "../../components/common/ToastContainer";
import { useToast } from "../../hooks/useToast";
import { useModal } from "../../hooks/useModal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchProfile } from "../../store/authSlice";
import api from "../../lib/api";
import { InfoIcon } from "../../icons";
import {
  CLIENT_MESSAGE_MAX_LENGTH,
  type ClientQuota,
  type MessageItem,
  type MessagesResponse,
} from "../../types/messaging.types";

const POLL_INTERVAL_MS = 60_000;

function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function draftKey(expertId: number): string {
  return `lunova_message_draft_${expertId}`;
}

export default function Messages() {
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector((state) => state.auth.userProfile);
  const { toasts, showToast, removeToast } = useToast();
  const quotaInfoModal = useModal();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [quota, setQuota] = useState<ClientQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const expertId = userProfile?.expert?.id;
  const quotaExhausted = quota !== null && quota.remaining <= 0;

  useEffect(() => {
    if (!userProfile) {
      dispatch(fetchProfile());
    }
  }, [dispatch, userProfile]);

  // Sayfa yanlışlıkla kapatılırsa/çıkılırsa gönderilmemiş taslak kaybolmasın.
  useEffect(() => {
    if (!expertId) return;
    const saved = localStorage.getItem(draftKey(expertId));
    if (saved) setBody(saved);
  }, [expertId]);

  useEffect(() => {
    if (!expertId) return;
    if (body) {
      localStorage.setItem(draftKey(expertId), body);
    } else {
      localStorage.removeItem(draftKey(expertId));
    }
  }, [expertId, body]);

  useEffect(() => {
    if (!expertId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchMessages() {
      try {
        const res = await api.get<MessagesResponse>(
          `/api/v1/messaging/conversations/${expertId}/messages/`
        );
        if (!cancelled) {
          setMessages(res.data.messages);
          setQuota(res.data.client_quota);
        }
      } catch {
        // Sessizce yeniden dener - polling'in ana akışı bloklamasına gerek yok.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [expertId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || !expertId || sending || quotaExhausted) return;

    setSending(true);
    try {
      const res = await api.post<MessageItem & { client_quota: ClientQuota }>(
        `/api/v1/messaging/conversations/${expertId}/messages/`,
        { body: trimmed }
      );
      setMessages((prev) => [...prev, res.data]);
      setQuota(res.data.client_quota);
      setBody("");
      localStorage.removeItem(draftKey(expertId));
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === "quota_exceeded") {
        showToast(
          err.response.data.detail || "Mesaj hakkınız kalmadı.",
          "warning"
        );
        if (err.response.data.client_quota) setQuota(err.response.data.client_quota);
      } else if (code === "message_too_long") {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(
          err.response?.data?.detail || err.response?.data?.body?.[0] || "Not gönderilemedi.",
          "error"
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageMeta title="Notlar" description="Uzmanınızla not paylaşın" />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="mx-auto w-full max-w-screen-md">
        <PageBreadCrumb pageTitle="Notlar" />

        <div
          className={`mt-8 flex h-[560px] flex-col overflow-hidden rounded-xl border bg-white dark:bg-white/[0.03] ${
            quotaExhausted
              ? "border-red-400 dark:border-red-500/60"
              : "border-gray-200 dark:border-white/[0.05]"
          }`}
        >
          {!expertId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Henüz size atanmış bir uzman bulunmuyor. Uzmanınız atandığında
              burada not paylaşabileceksiniz.
            </div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
              Yükleniyor...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {userProfile?.expert?.full_name}
                  {userProfile?.expert?.title ? ` · ${userProfile.expert.title}` : ""}
                </h3>
                {quota && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-medium ${
                        quotaExhausted
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      Kalan Hak: {quota.remaining}/{quota.limit}
                    </span>
                    <button
                      type="button"
                      onClick={quotaInfoModal.openModal}
                      className="text-gray-400 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      aria-label="Mesaj hakkı hakkında bilgi"
                    >
                      <InfoIcon className="size-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5 custom-scrollbar">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Henüz not paylaşılmamış. Seans öncesi ya da sonrası için bir
                    not bırakabilirsiniz.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.is_mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                          message.is_mine
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-800 dark:bg-white/[0.05] dark:text-white/90"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p
                          className={`mt-1 text-right text-[11px] ${
                            message.is_mine ? "text-white/70" : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {formatDateTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                {quotaExhausted && (
                  <p className="mb-2 text-xs text-red-600 dark:text-red-400">
                    Mesaj hakkınız kalmadı. Bir sonraki seans sonrasında 5 hakkınız
                    yeniden açılacaktır.
                  </p>
                )}
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, CLIENT_MESSAGE_MAX_LENGTH))}
                  maxLength={CLIENT_MESSAGE_MAX_LENGTH}
                  rows={3}
                  disabled={quotaExhausted}
                  placeholder={
                    quotaExhausted
                      ? "Mesaj hakkınız kalmadı"
                      : "Uzmanınıza bir not bırakın..."
                  }
                  className="w-full resize-none rounded-lg border border-gray-300 bg-transparent p-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:text-white/90 dark:disabled:bg-white/[0.02]"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {body.length}/{CLIENT_MESSAGE_MAX_LENGTH}
                  </span>
                  <Button
                    size="sm"
                    disabled={!body.trim() || sending || quotaExhausted}
                    onClick={handleSend}
                  >
                    {sending ? "Gönderiliyor..." : "Gönder"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={quotaInfoModal.isOpen}
        onClose={quotaInfoModal.closeModal}
        className="max-w-[440px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900">
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Mesaj Hakkı Nasıl Çalışır?
          </h4>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Bir sonraki seansınıza kadar uzmanınıza toplam <strong>5 not</strong>{" "}
            gönderebilirsiniz. Her seansınız tamamlandığında bu hak otomatik
            olarak yeniden 5'e yükselir.
          </p>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Bu sınır, iletişimin sağlıklı bir şekilde sürdürülmesi ve önemli
            konuların görüntülü görüşme seanslarında ele alınmasını teşvik
            etmek amacıyla uygulanmaktadır.
          </p>
          <div className="flex justify-end">
            <Button onClick={quotaInfoModal.closeModal}>Anladım</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
