// src/features/dashboard/use-appointments.ts

import { useState, useEffect } from 'react';
import { getAppointmentsByExpertId, Appointment } from './api';

export const useAppointments = (expertId: number) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Component yüklendiğinde veriyi çekmek için bir fonksiyon tanımla
    const fetchAppointments = async () => {
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
    };

    fetchAppointments();

    // expertId değiştiğinde useEffect'in tekrar çalışmasını sağla
  }, [expertId]);

  return { appointments, isLoading, error };
};