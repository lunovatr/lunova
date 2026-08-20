// src/availability/index.tsx
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ViewMode, MyAvailabilityCalendarResponse, } from "./types";
import { getMyCombinedCalendar } from "./api";
import { AvailabilityToggle } from "./components/AvailabilityToggle";
import { CombinedCalendar } from "./components/CombinedCalendar";
import { WeeklyAvailabilityCalendar } from "./components/WeeklyAvailabilityCalendar";
import { ExceptionsAvailabilityCalendar } from "./components/ExceptionsAvailabilityCalendar";

// Layout parçaları (senin projendekiler)
import { ConfigDrawer } from "@/components/config-drawer";
import { Header } from "@/components/layout/header";
import { TopNav } from "@/components/layout/top-nav";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

const topNav = [
  { title: "Overview", href: "dashboard/overview", isActive: true, disabled: false },
  { title: "Customers", href: "dashboard/customers", isActive: false, disabled: true },
  { title: "Products", href: "dashboard/products", isActive: false, disabled: true },
  { title: "Settings", href: "dashboard/settings", isActive: false, disabled: true },
];
import { Calendar } from "@/components/ui/calendar"
import { tr } from 'date-fns/locale';


export default function Availability() {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [calendar, setCalendar] = useState<MyAvailabilityCalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [startOfWeek, setStartOfWeek] = useState<string>("");
  const [endOfWeek, setEndOfWeek] = useState<string>("");
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  // -------------------------------------------------------------------
  // 1. HAFTALIK ARALIK HESAPLAMA FONKSİYONU
  // -------------------------------------------------------------------
  const calculateWeekRange = (date: Date) => {
    // Tarihi YYYY-MM-DD formatına dönüştüren yardımcı fonksiyon
    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const dayOfMonth = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${dayOfMonth}`;
    };

    // 1. Haftanın Başlangıcını (Pazartesi) Bulma
    const selectedDate = new Date(date); 
    let day = selectedDate.getDay(); 
    
    let diff = selectedDate.getDate() - (day === 0 ? 6 : day - 1); 

    const startDate = new Date(selectedDate.setDate(diff));

    // 2. Haftanın Bitişini (Pazar) Bulma
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    return { startOfWeek: start, endOfWeek: end };
  };

  // -------------------------------------------------------------------
  // 2. FETCH FONKSİYONU
  // -------------------------------------------------------------------
  const fetchCombined = async () => {
    if (!startOfWeek || !endOfWeek) return; // Tarih yoksa API'yi çağırma

    setIsCalendarLoading(true);
    try {
      const data = await getMyCombinedCalendar( startOfWeek, endOfWeek );
      setCalendar(data);
    } catch {
      toast.error("Genel takvim alınamadı");
    } finally {
      setIsLoading(false);
      setIsCalendarLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 3. TAKVİM DEĞİŞİKLİĞİ HANDLER'I
  // -------------------------------------------------------------------
  const handleCalendarDateChange = (date: Date | undefined) => { // async KALKTI
    if (!date) {
      console.log("Tarih seçimi yok.");
      return;
    }
    setDate(date);
    const { startOfWeek: newStart, endOfWeek: newEnd } = calculateWeekRange(date);
    setStartOfWeek(newStart); 
    setEndOfWeek(newEnd);
    
    // NOT: fetchCombined buradan çağrılmıyor, aşağıdaki useEffect tetikleyecek.
  };

  // -------------------------------------------------------------------
  // A. İLK YÜKLEME: Mevcut haftayı ayarla
  // -------------------------------------------------------------------
  useEffect(() => {
    // Sadece ilk yüklemede çalışır.
    setIsLoading(true);
    const today = new Date();
    const { startOfWeek: initialStart, endOfWeek: initialEnd } = calculateWeekRange(today);
    
    setStartOfWeek(initialStart);
    setEndOfWeek(initialEnd);

    setIsLoading(false);
  }, []); 

  // -------------------------------------------------------------------
  // B. HAFTA DEĞİŞTİĞİNDE: API'yi çağır
  // -------------------------------------------------------------------
  useEffect(() => {
    // startOfWeek veya endOfWeek ilk kez ayarlandığında veya değiştiğinde fetch'i çağırır.
    if (startOfWeek && endOfWeek) {
        // isLoading yönetimi fetchCombined içinde.
        fetchCombined();
    }
  }, [startOfWeek, endOfWeek]);

  // === VIEW MODE HANDLER ===
  const handleViewModeChange = (mode: ViewMode) => {
    fetchCombined();
    setViewMode(mode);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Müsaitlik takvimi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-4">
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <NotificationDropdown />
          <ProfileDropdown />
        </div>
      </Header>

      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {viewMode === "calendar"
              ? "Genel Müsaitlik"
              : viewMode === "availability"
              ? "Haftalık Müsaitlik"
              : "İstisnai Müsaitlik"}
          </h1>

          <AvailabilityToggle
            currentMode={viewMode}
            onModeChange={handleViewModeChange}
          />
        </div>

        {/* CONDITIONAL RENDERING */}
        {viewMode === "calendar" && (
          // 💡 Ana Kapsayıcı: Calendar ve CombinedCalendar'ı çevreler
          <div className="flex flex-wrap flex-col md:flex-row gap-4 p-4"> 
            
            {/* 1. CombinedCalendar Kapsayıcısı: Relative pozisyon verilerek Overlay için referans noktası yapılır */}
            <div className="relative min-w-[300px] md:min-w-[400px]"> 
                
                {/* Her zaman CombinedCalendar'ı göster, böylece boyut sabit kalır. */}
                {/* Yüklenme anında, eski veriyi göstermemek için bir 'null check' yapalım 
                   veya loading'i sadece veri çekilirken gösterelim. */}
                {(calendar || !isCalendarLoading) && <CombinedCalendar calendar={calendar} />}

                {/* YÜKLEME OVERLAY'i (Kaplama) */}
                {isCalendarLoading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm rounded-xl flex items-center justify-center transition-opacity duration-300">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p>Takvim verisi güncelleniyor...</p>
                        </div>
                    </div>
                )}
            </div>
            {/* ----------------------------------------------------------- */}

            {/* 2. Takvim Bileşeni (Her zaman görünür) */}
            <Calendar
              mode="single"
              selected={date} 
              onSelect={handleCalendarDateChange} 
              className="rounded-lg border [--cell-size:--spacing(11)] md:[--cell-size:--spacing(12)]" 
              buttonVariant="ghost"
              locale={tr}
            />
          </div>
        )}
        {viewMode === "availability" && (
          <WeeklyAvailabilityCalendar
            weeklyAvailability={calendar?.calendar.map(d => d.weekly_availability) || []}
            // genel takvim veris içerisinden haftalık müsaitlikleri alıyoruz. tekrar istek atmaya gerek yok
            // eğer komponent içerisinde düzenleme yapılırsa orada weeklyAvailability get ile güncellenir.
          />
        )}
        {viewMode === "exceptions" && (
          <ExceptionsAvailabilityCalendar/>
        )}
      </div>
    </>
  );
}
