// src/features/dashboard/use-appointments.ts

import { useState, useEffect, useCallback } from 'react';
import { getAppointmentsByExpertId, Appointment } from './api';

export const useAppointments = (expertId: number) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // fetchAppointments fonksiyonunu useCallback ile tanımla
  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAppointmentsByExpertId(expertId);
      setAppointments(data);
      setError(null);
    } catch (err) {
      setError('Randevular yüklenemedi. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, isLoading, error, refetch: fetchAppointments };
};