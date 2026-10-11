import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
  onDismiss: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="bg-[var(--color-danger-surface)] border border-[var(--color-danger-border)] rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">❌</span>
          <div>
            <h4 className="font-semibold text-[var(--color-danger-text)] mb-1">Error</h4>
            <p className="text-sm text-[var(--color-danger-text)]">{error}</p>
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="text-[var(--color-danger-text)] hover:text-[var(--color-danger-text)] font-bold text-lg"
        >
          ✕
        </button>
      </div>
    </div>
  );
}