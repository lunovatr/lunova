// src/features/reservations/use-appointments.ts

import { useState, useEffect, useCallback } from 'react';
import { getAppointments, Appointment } from './api';
import { format, addMonths } from 'date-fns';

export interface UniqueClient {
  id: number;
  name: string;
}

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<UniqueClient[]>([]);
  const [expertId, setExpertId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // fetchAppointments fonksiyonunu useCallback ile tanımla
  // Mevcut tarihten 4 ay sonrasına kadar randevuları getir (backend max 4 ay)
  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);

      const today = new Date();
      const fourMonthsLater = addMonths(today, 4);

      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(fourMonthsLater, 'yyyy-MM-dd');

      const data = await getAppointments(startDate, endDate);
      setAppointments(data);

      // Expert ID'yi appointments'tan çıkar (tüm appointments'lar aynı expert'e ait)
      if (data.length > 0) {
        setExpertId(data[0].expert);
      }

      // Unique client'ları çıkar
      const uniqueClientsMap = new Map<number, string>();
      data.forEach((appointment) => {
        if (!uniqueClientsMap.has(appointment.client)) {
          uniqueClientsMap.set(appointment.client, appointment.client_name);
        }
      });

      const uniqueClients: UniqueClient[] = Array.from(uniqueClientsMap.entries()).map(
        ([id, name]) => ({ id, name })
      );
      setClients(uniqueClients);

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

  return { appointments, clients, expertId, isLoading, error, refetch: fetchAppointments };
};