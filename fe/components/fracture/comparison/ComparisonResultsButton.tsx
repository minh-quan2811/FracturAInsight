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
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-150 ${
          isOpen
            ? 'bg-blue-50 border-blue-300 text-blue-800'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v18M4 6h5m-5 6h5m-5 6h5M15 3v18m5-15h-5m5 6h-5m5 6h-5"
            />
          </svg>
          Comparison Results
        </span>

        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
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
          ? 'bg-blue-50 border-blue-300 text-blue-700'
          : 'border-gray-200 text-gray-500 hover:border-[#2E7D5C] hover:text-[#2E7D5C]'
      } disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-500`}
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