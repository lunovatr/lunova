import { useState } from "react";
import {
  AvailabilityException,
  AvailabilityExceptionPayload,
} from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/context/theme-provider";

interface Props {
  exception: AvailabilityException;
  onClose: () => void;
  onSave: (data: AvailabilityExceptionPayload[]) => void;
}

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00"
];

export function ExceptionEditModal({ exception, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const isNew = exception.id === 0;
  const [formData, setFormData] = useState<AvailabilityExceptionPayload>({
    id: exception.id,
    date: exception.date,
    exception_type: exception.exception_type,
    start_time: exception.start_time || "",
    end_time: exception.end_time || "",
    service: exception.service ?? 1,
    note: exception.note ?? "",
  });

  const handleChange = <K extends keyof AvailabilityExceptionPayload>(
    key: K,
    value: AvailabilityExceptionPayload[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSlotClick = (time: string) => {
    const { start_time, end_time } = formData;
    if (!start_time || (start_time && end_time)) {
      handleChange("start_time", time);
      handleChange("end_time", "");
    } else if (!end_time) {
      if (time <= start_time) {
        handleChange("start_time", time);
        handleChange("end_time", start_time);
      } else {
        handleChange("end_time", time);
      }
    }
  };

  const isSlotSelected = (time: string) => {
    const { start_time, end_time } = formData;
    if (!start_time) return false;
    if (!end_time) return time === start_time;
    return time >= start_time && time <= end_time;
  };

  const handleSubmit = () => onSave([formData]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={`
          rounded-2xl max-w-md border shadow-lg transition-colors
          ${isDark
            ? "bg-neutral-900 text-gray-100 border-gray-700"
            : "bg-white text-gray-900 border-gray-200"}
        `}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isNew ? "Yeni İstisna Ekle" : "İstisnayı Düzenle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tarih */}
          <div>
            <div className="p-1.5">
                <Label>Tarih</Label>
            </div>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              className={isDark ? "bg-neutral-800 border-gray-700" : ""}
            />
          </div>

          {/* Servis */}
          <div>
            <div className="p-1.5">
                <Label>Servis</Label>
            </div>
            <Select
              value={String(formData.service ?? 1)}
              onValueChange={(val) => handleChange("service", Number(val))}
            >
              <SelectTrigger
                className={isDark ? "bg-neutral-800 border-gray-700" : ""}
              >
                <SelectValue placeholder="Servis seçin" />
              </SelectTrigger>
              <SelectContent
                className={isDark ? "bg-neutral-800 text-gray-100" : ""}
              >
                <SelectItem value="1">Bilişsel Terapi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tür */}
          <div>
            <div className="p-1.5">
                <Label>İstisna Türü</Label>
            </div>
            <Select
              value={formData.exception_type}
              onValueChange={(val) =>
                handleChange("exception_type", val as "add" | "cancel")
              }
            >
              <SelectTrigger
                className={isDark ? "bg-neutral-800 border-gray-700" : ""}
              >
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent
                className={isDark ? "bg-neutral-800 text-gray-100" : ""}
              >
                <SelectItem value="add">Ekle</SelectItem>
                <SelectItem value="cancel">İptal</SelectItem>
              </SelectContent>
            </Select>
          </div>

            {/* Saat Grid */}
            <div>
                <Label>Saat Aralığı</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
                {timeSlots.map((time) => {
                const selected = isSlotSelected(time);
                return (
                    <Button
                    key={time}
                    variant="outline"
                    type="button"
                    onClick={() => handleSlotClick(time)}
                    className={`
                        text-sm transition-colors
                        ${
                        selected
                            ? isDark
                            ? "bg-blue-500/80 text-white border-blue-400 hover:bg-blue-600/80"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                            : isDark
                            ? "bg-neutral-800 border-gray-700 text-gray-200 hover:bg-neutral-700"
                            : "bg-gray-50 hover:bg-gray-100"
                        }
                    `}
                    >
                    {time}
                    </Button>
                );
                })}
            </div>

            {formData.start_time && (
                <p
                className={`text-xs mt-2 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                }`}
                >
                Seçilen aralık: <strong>{formData.start_time}</strong>
                {formData.end_time ? ` – ${formData.end_time}` : ""}
                </p>
            )}
            </div>

          {/* Not */}
          <div>
            <div className="p-1.5">
                <Label>Not</Label>
            </div>
            <Input
              type="text"
              placeholder="Opsiyonel not"
              value={formData.note ?? ""}
              onChange={(e) => handleChange("note", e.target.value)}
              className={isDark ? "bg-neutral-800 border-gray-700" : ""}
            />
          </div>
        </div>

        {/* Alt Butonlar */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className={isDark ? "border-gray-600 text-gray-300" : ""}
          >
            Vazgeç
          </Button>
          <Button
            onClick={handleSubmit}
            className={
              isNew
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }
          >
            {isNew ? "Ekle" : "Kaydet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
