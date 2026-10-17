import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface SidebarToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Icon-only expand/collapse control.
 */
export function SidebarToggleButton({ isVisible, onToggle, className = "" }: SidebarToggleButtonProps) {
  const label = isVisible ? "Collapse sidebar" : "Expand sidebar";
  const Icon = isVisible ? PanelLeftClose : PanelLeftOpen;

  return (
    <button
      onClick={onToggle}
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] ${className}`}
      title={label}
      aria-label={label}
    >
      <Icon size={18} />
    </button>
  );
}