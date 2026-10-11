interface SidebarToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * isVisible = true  -> sidebar is open   -> label "Hide"
 * isVisible = false -> sidebar is closed -> label "Chats"
 */
export function SidebarToggleButton({ isVisible, onToggle, className = "" }: SidebarToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`btn btn-outline btn-sm ${className}`}
      title={isVisible ? "Collapse sidebar" : "Expand sidebar"}
      aria-label={isVisible ? "Collapse sidebar" : "Expand sidebar"}
    >
      {isVisible ? "Hide" : "Chats"}
    </button>
  );
}