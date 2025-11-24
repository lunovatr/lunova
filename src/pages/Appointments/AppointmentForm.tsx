// src/components/AppointmentForm.tsx

import React, { useState } from 'react';
import { NavigateFunction } from 'react-router';
import api from "../../lib/api";
import ComponentCard from '../../components/common/ComponentCard';
import ToastContainer from '../../components/common/ToastContainer';
import { useToast } from "../../hooks/useToast";

interface SelectedSlot {
    startTime: string;
    endTime: string;
    slotMinutes: number;
}

interface AppointmentFormProps {
    expertId: number;
    selectedDate: string;
    startTime: string;
    endTime: string;
    slotMinutes: number;
    notes: string;
    setNotes: React.Dispatch<React.SetStateAction<string>>;
    navigate: NavigateFunction;
    selectedSlot?: SelectedSlot;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
    expertId,
    selectedDate,
    startTime,
    endTime,
    slotMinutes,
    notes,
    setNotes,
    navigate,
}) => {
    const [submitting, setSubmitting] = useState(false);
    const { toasts, showToast, removeToast } = useToast();
    

    const handleSubmitAppointment = async () => {
        // Time'ı HH:MM:SS formatına çevir (API gereksinimi için)
        let formattedTime = startTime;
        if (formattedTime.split(":").length === 2) {
            formattedTime = `${formattedTime}:00`;
        }

        const appointmentData = {
            expert_user_id: expertId,
            date: selectedDate,
            time: formattedTime,
            duration: slotMinutes,
            notes: notes || "Danışan tarafından randevu talebi",
        };

        try {
            setSubmitting(true);
            await api.post(
                "/api/v1/appointments/client/request/",
                appointmentData
            );

            showToast('🎉 Randevu talebiniz başarıyla gönderildi!', 'success');

            setTimeout(() => {
                navigate("/appointments");
            }, 2000);
        } catch (err: any) {
            let errorMessage = "Randevu talebi gönderilemedi.";

            if (err.response?.data) {
                const errorData = err.response.data;
                if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
                    errorMessage = errorData.non_field_errors.join(" ");
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else {
                    const errors = Object.entries(errorData)
                        .map(([key, value]) => {
                            if (Array.isArray(value)) {
                                return `${key}: ${value.join(", ")}`;
                            }
                            return `${key}: ${value}`;
                        })
                        .join(" ");
                    errorMessage = errors || "Bilinmeyen hata";
                }
            }
            showToast(errorMessage, 'error');
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <ComponentCard title="Randevu Detayları">
            <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">Slot Seçildi</p>
                            <p className="text-lg font-semibold text-green-900 dark:text-green-200 mt-1">
                                {selectedDate && new Date(selectedDate).toLocaleDateString('tr-TR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    weekday: 'long'
                                })}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                <span className="font-medium">Saat:</span>{" "}
                                {startTime} - {endTime}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                                <span className="font-medium">Süre:</span>{" "}
                                {slotMinutes} dakika
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notlar (İsteğe Bağlı)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        placeholder="Randevunuzla ilgili not ekleyebilirsiniz..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleSubmitAppointment}
                        disabled={submitting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 100-16 8 8 0 000 16zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Gönderiliyor...
                            </>
                        ) : (
                            'Randevu Talebini Gönder'
                        )}
                    </button>
                    <button
                        onClick={() => setNotes("")}
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Notları Temizle
                    </button>
                </div>
            </div>
        </ComponentCard>
        </>
    );
};

export default AppointmentForm;