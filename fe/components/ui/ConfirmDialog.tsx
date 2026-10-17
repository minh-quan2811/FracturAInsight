import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Popup that asks the user to confirm a dangerous action, using the dark theme.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-theme="dark"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-xl"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold t-primary">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm t-secondary">
          {message}
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium t-primary hover:bg-[var(--color-surface)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}