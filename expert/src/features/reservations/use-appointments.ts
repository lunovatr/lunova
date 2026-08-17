// src/features/reservations/use-appointments.ts

import { useState, useEffect, useCallback } from 'react';
import { getAppointments, Appointment } from './api';
import { format, addMonths, subMonths } from 'date-fns';
import { useAuthStore } from '@/stores/auth-store';

export interface UniqueClient {
  id: number;
  name: string;
}

export const useAppointments = () => {
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [historicalAppointments, setHistoricalAppointments] = useState<Appointment[]>([]);
  const [tableAppointments, setTableAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<UniqueClient[]>([]);
  // Randevu geçmişinden çıkarılan expert id (fallback amaçlı - aşağıya bakın)
  const [derivedExpertId, setDerivedExpertId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Öncelikli kaynak: oturum açmış kullanıcının kendi User id'si (/me/ üzerinden).
  // Önceden expertId SADECE mevcut randevulardan türetiliyordu; bu da hiç randevusu
  // olmayan yeni bir uzmanın ilk randevusunu hiç oluşturamamasına yol açıyordu.
  const ownUserId = useAuthStore((s) => s.user?.id ?? null);
  const expertId = ownUserId ?? derivedExpertId;

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // İki paralel sorgu: geçmiş (-4ay → bugün) ve gelecek (bugün → +4ay)
      const [pastData, futureData] = await Promise.all([
        getAppointments(format(subMonths(today, 4), 'yyyy-MM-dd'), todayStr),
        getAppointments(todayStr, format(addMonths(today, 4), 'yyyy-MM-dd')),
      ]);

      // Bugünkü randevular her iki sorguya da gelebilir, deduplicate et
      const seen = new Set<number>();
      const combined = [...pastData, ...futureData].filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });

      // Tablo aralığı: -2ay → +2ay (string karşılaştırması yyyy-MM-dd için güvenli)
      const twoAgoStr = format(subMonths(today, 2), 'yyyy-MM-dd');
      const twoLaterStr = format(addMonths(today, 2), 'yyyy-MM-dd');
      const tableData = combined.filter(a => a.date >= twoAgoStr && a.date <= twoLaterStr);

      setUpcomingAppointments(futureData);
      setHistoricalAppointments(pastData);
      setTableAppointments(tableData);
      setAllAppointments(combined);

      if (combined.length > 0) setDerivedExpertId(combined[0].expert);

      const clientMap = new Map<number, string>();
      combined.forEach(a => {
        if (!clientMap.has(a.client)) clientMap.set(a.client, a.client_name);
      });
      setClients(Array.from(clientMap.entries()).map(([id, name]) => ({ id, name })));

      setError(null);
    } catch (err) {
      setError('Randevular yüklenemedi. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    upcomingAppointments,
    historicalAppointments,
    tableAppointments,
    allAppointments,
    clients,
    expertId,
    isLoading,
    error,
    refetch: fetchAppointments,
  };
};
