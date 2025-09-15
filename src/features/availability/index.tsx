import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getMyAvailabilityWithCookieHeader } from './api'
import { useAuthStore } from '@/stores/auth-store'
import { AvailabilitySlot, ViewMode } from './types'
import { AvailabilityToggle } from './components/availability-toggle'
import { AvailabilityGrid } from './components/availability-grid'
import { ExceptionsCalendar } from './components/exceptions-calendar'

export default function Availability() {
  const { auth } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('availability')
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [originalAvailability, setOriginalAvailability] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Console log current user info
  console.log('Current user info:', auth.user);

  // Fetch availability data
  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      const data = await getMyAvailabilityWithCookieHeader();
      setAvailability(data);
      setOriginalAvailability(JSON.parse(JSON.stringify(data)));
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      toast.error(error instanceof Error ? error.message : 'Müsaitlik verilerini yüklerken hata oluştu.');
      // Set empty availability if fetch fails
      setAvailability([]);
      setOriginalAvailability([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  // Handle view mode change and refresh data
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    // Refresh availability data when switching views
    fetchAvailability()
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
    <div className="p-4">
      {/* Header with toggle */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {viewMode === 'availability' ? 'Availability Preview' : 'Availability Exceptions'}
        </h1>
        <AvailabilityToggle 
          currentMode={viewMode} 
          onModeChange={handleViewModeChange} 
        />
      </div>

      {/* Content based on current view mode */}
      {viewMode === 'availability' ? (
        <AvailabilityGrid 
          availability={availability}
          setAvailability={setAvailability}
          originalAvailability={originalAvailability}
          setOriginalAvailability={setOriginalAvailability}
        />
      ) : (
        <ExceptionsCalendar 
          weeklyAvailability={availability}
        />
      )}
    </div>
  )
}