import { ViewMode } from '../types'

interface AvailabilityToggleProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
}

export function AvailabilityToggle({ currentMode, onModeChange }: AvailabilityToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">View:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onModeChange('availability')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            currentMode === 'availability'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Weekly Availability
        </button>
        <button
          onClick={() => onModeChange('exceptions')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            currentMode === 'exceptions'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Exceptions
        </button>
      </div>
    </div>
  )
}