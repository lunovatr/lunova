import { ViewMode } from '../types'
import { useTheme } from "@/context/theme-provider"; 

interface AvailabilityToggleProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
}

export function AvailabilityToggle({ currentMode, onModeChange }: AvailabilityToggleProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const containerBg = isDark ? "bg-secondary/50" : "bg-gray-100"; 
  
  const defaultText = isDark 
    ? "text-muted-foreground hover:text-foreground"
    : "text-gray-600 hover:text-gray-900";

  const activeBg = isDark 
    ? "bg-secondary"  
    : "bg-white";     
  
  const activeText = isDark 
    ? "text-secondary-foreground" 
    : "text-gray-900";
  
  const activeShadow = isDark 
    ? "shadow-sm shadow-black/50" 
    : "shadow-sm"; 

  return (
  <div className="p-1 flex items-center justify-center">
    <div
      className={`p-1 flex ${containerBg} rounded-lg p-0.5 space-x-1 shadow-sm`}
    >
      {[
        { mode: "calendar", label: "Genel" },
        { mode: "availability", label: "Haftalık" },
        { mode: "exceptions", label: "İstisnai" },
      ].map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode as any)}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md text-center transition-colors flex items-center justify-center ${
            currentMode === mode
              ? `${activeBg} ${activeText} ${activeShadow}`
              : `${defaultText}`
          }`}
          style={{ minWidth: "70px" }}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

}