// Zoom görüşme bağlantısı, randevu saatinden en fazla 15 dakika önce açılabilir
// (daha erken açılırsa backend/Zoom tarafında geçerli bir toplantı olmayabilir —
// bkz. appointments/views.py'deki mock/gerçek zoom_join_url oluşturma akışı).
const EARLIEST_JOIN_MINUTES_BEFORE = 15;

/**
 * Randevu saatine göre Zoom bağlantısının şu an açılıp açılamayacağını kontrol eder.
 * Açılabiliyorsa `null`, açılamıyorsa kullanıcıya gösterilecek bir uyarı mesajı döner.
 */
export function getZoomJoinBlockMessage(date: string, time: string): string | null {
  const appointmentStart = new Date(`${date}T${time}`);
  if (Number.isNaN(appointmentStart.getTime())) return null;

  const earliestJoinTime = new Date(
    appointmentStart.getTime() - EARLIEST_JOIN_MINUTES_BEFORE * 60 * 1000
  );

  if (new Date() < earliestJoinTime) {
    return `Zoom görüşmesine randevu saatinize ${EARLIEST_JOIN_MINUTES_BEFORE} dakika kala katılabilirsiniz.`;
  }

  return null;
}
