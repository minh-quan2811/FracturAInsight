import React from 'react';

interface ComparisonResultsButtonProps {
  isOpen: boolean;
  onClick: () => void;
  /** Whether comparison data exists for the currently selected image */
  hasData: boolean;
  variant?: 'compact' | 'panel';
}

export function ComparisonResultsButton({
  isOpen,
  onClick,
  hasData,
  variant = 'compact',
}: ComparisonResultsButtonProps) {
  if (variant === 'panel') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!hasData}
        aria-pressed={isOpen}
        aria-label={isOpen ? 'Hide comparison results' : 'Show comparison results'}
        title={
          hasData
            ? isOpen
              ? 'Hide comparison results'
              : 'Show comparison results'
            : 'No comparison available for this image'
        }
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg border transition-all duration-150 ${
          isOpen
            ? 'bg-[var(--color-info-surface)] border-[var(--color-info-border)] text-[var(--color-info-text)]'
            : 'bg-[var(--color-surface-raised)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <svg className="w-5 h-5 text-[var(--color-info-text)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v18M4 6h5m-5 6h5m-5 6h5M15 3v18m5-15h-5m5 6h-5m5 6h-5"
            />
          </svg>
          Comparison Results
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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!hasData}
      aria-pressed={isOpen}
      aria-label={isOpen ? 'Hide comparison results' : 'Show comparison results'}
      title={
        hasData
          ? isOpen
            ? 'Hide comparison results'
            : 'Show comparison results'
          : 'No comparison available for this image'
      }
      className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors duration-150 flex-shrink-0 ${
        isOpen
          ? 'bg-[var(--color-info-surface)] border-[var(--color-info-border)] text-[var(--color-info-text)]'
          : 'border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-primary-medium)] hover:text-[var(--color-accent-text)]'
      } disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text-tertiary)]`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 3v18M4 6h5m-5 6h5m-5 6h5M15 3v18m5-15h-5m5 6h-5m5 6h-5"
        />
      </svg>
    </button>
  );
}