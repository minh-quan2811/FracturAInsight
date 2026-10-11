import React from 'react';

interface FractureReferenceButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function FractureReferenceButton({ isOpen, onClick }: FractureReferenceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isOpen}
      aria-label={isOpen ? 'Hide fracture type reference' : 'Show fracture type reference'}
      className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg border transition-all duration-150 ${
        isOpen
          ? 'bg-[var(--color-info-surface)] border-[var(--color-info-border)] text-[var(--color-info-text)]'
          : 'bg-[var(--color-surface-raised)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <svg className="w-5 h-5 text-[var(--color-info-text)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        Fracture Type Reference
      </span>

      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
        {isOpen ? 'Hide' : 'Show'}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
          />
        </svg>
      </span>
    </button>
  );
}