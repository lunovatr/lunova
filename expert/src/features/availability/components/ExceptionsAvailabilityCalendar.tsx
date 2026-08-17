import { useEffect, useState } from "react";
import {
  getAvailabilityExceptions,
  updateAvailabilityExceptions,
  deleteAvailabilityExceptions,
} from "../api";
import {
  AvailabilityException,
  AvailabilityExceptionPayload,
} from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Edit, Trash2, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ExceptionEditModal } from "./ExceptionEditModal";
import { toast } from "sonner";

export function ExceptionsAvailabilityCalendar() {
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedException, setSelectedException] =
    useState<AvailabilityException | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const data = await getAvailabilityExceptions();
      setExceptions(data);
    } catch (err) {
      console.error("İstisnalar alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (exception: AvailabilityException) => {
    setSelectedException(exception);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    // Yeni ekleme için boş form verisi
    const emptyException: AvailabilityException = {
      id: 0, // backend create sırasında ID atayacak
      expert: 0,
      date: new Date().toISOString().slice(0, 10), // bugünün tarihi
      exception_type: "add",
      start_time: "",
      end_time: "",
      service: null,
      service_name: null,
      note: "",
      is_recurring: false,
      created_at: new Date().toISOString(),
    };
    setSelectedException(emptyException);
    setIsModalOpen(true);
  };

  const handleDelete = async (exception: AvailabilityException) => {
    try {
      await deleteAvailabilityExceptions([
        {
          id: exception.id,
          date: exception.date,
          start_time: exception.start_time!,
          end_time: exception.end_time!,
        },
      ]);
      toast.success("İstisna başarıyla silindi");
      fetchData();
    } catch (err) {
      console.error("Silme hatası:", err);
      toast.error("İstisna silinirken hata oluştu");
    }
  };

  const handleModalSave = async (updatedData: AvailabilityExceptionPayload[]) => {
    try {
      await updateAvailabilityExceptions(updatedData);
      toast.success("İstisna kaydedildi");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      toast.error("İstisna kaydedilirken hata oluştu");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Yükleniyor...</span>
      </div>
    );
  }

  const groupedByDate = exceptions.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, AvailabilityException[]>);

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="p-4 space-y-6">
      {/* ✅ Yeni istisna ekleme butonu */}
      <div className="flex justify-end">
        <Button
          onClick={handleAddNew}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni İstisna Ekle
        </Button>
      </div>

      {sortedDates.length === 0 ? (
        <p className="text-gray-500 text-sm">Henüz istisna bulunmuyor.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedDates.map((date) => (
            <Card
              key={date}
              className="rounded-2xl shadow-sm hover:shadow-md transition"
            >
              <CardContent className="p-4">
                <div className="font-semibold text-lg mb-2">
                  {format(parseISO(date), "d MMMM yyyy, EEEE", { locale: tr })}
                </div>

                {groupedByDate[date].map((item) => (
                  <div
                    key={item.id}
                    className={`border-l-4 pl-3 py-2 mb-2 rounded ${
                      item.exception_type === "cancel"
                        ? "border-red-500 bg-red-50"
                        : "border-green-500 bg-green-50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-800">
                        {item.service_name ?? "Servis Bilgisi Yok"}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.start_time?.slice(0, 5)} – {item.end_time?.slice(0, 5)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {item.note || "(Not eklenmemiş)"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && selectedException && (
        <ExceptionEditModal
          exception={selectedException}
          onClose={() => setIsModalOpen(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
