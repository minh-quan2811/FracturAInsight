import React from 'react';
import { StudentAnnotation } from '@/types/fracture';

interface StudentActionButtonsProps {
  // State
  isAnnotating: boolean;
  annotations: StudentAnnotation[];
  isSubmittingAnnotations: boolean;
  allAnnotationsHaveDetails: boolean;
  canSubmit: boolean;

  // Actions
  onToggleAnnotating: () => void;
  onSubmitAnnotations: () => void;
  onSubmitNoFracture: () => void;
  onClearAnnotations: () => void;
}

export function StudentActionButtons({
  isAnnotating,
  annotations,
  isSubmittingAnnotations,
  allAnnotationsHaveDetails,
  canSubmit,
  onToggleAnnotating,
  onSubmitAnnotations,
  onSubmitNoFracture,
  onClearAnnotations
}: StudentActionButtonsProps) {
  if (!canSubmit) {
    return null;
  }

  return (
    <div className="space-y-2 flex-shrink-0">
      {/* Primary Action Row */}
      <div className="flex items-center gap-2">
        {/* Toggle Annotation Mode */}
        <button
          onClick={onToggleAnnotating}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all shadow-sm ${
            isAnnotating
              ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-md'
              : 'bg-[var(--color-primary-lightest)] text-[var(--color-primary-darkest)] hover:bg-[var(--color-primary-light)] border-2 border-[var(--color-primary-light)]'
          }`}
        >
          {isAnnotating ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Stop Annotating
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Start Annotating
            </>
          )}
        </button>

        {/* Submit with annotations */}
        {annotations.length > 0 && (
          <>
            <button
              onClick={onSubmitAnnotations}
              disabled={isSubmittingAnnotations || !allAnnotationsHaveDetails || isAnnotating}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--color-success)] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:bg-[var(--color-gray-400)] disabled:cursor-not-allowed transition-all shadow-sm"
              title={
                isAnnotating
                  ? 'Stop annotating to submit'
                  : !allAnnotationsHaveDetails
                  ? 'Please select fracture type for all annotations'
                  : ''
              }
            >
              {isSubmittingAnnotations ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit {annotations.length} Fracture{annotations.length !== 1 ? 's' : ''}
                </>
              )}
            </button>

            <button
              onClick={onClearAnnotations}
              className="px-3 py-1.5 bg-[var(--color-warning)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all shadow-sm"
              title="Clear all draft annotations"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}

        {/* Submit No Fracture button */}
        {annotations.length === 0 && !isAnnotating && (
          <button
            onClick={onSubmitNoFracture}
            disabled={isSubmittingAnnotations}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--color-error)] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:bg-[var(--color-gray-400)] disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isSubmittingAnnotations ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Submit: No Fractures
              </>
            )}
          </button>
        )}
      </div>

      {/* Annotation Mode Indicator */}
      {isAnnotating && (
        <div className="bg-blue-50 rounded-md px-2.5 py-1.5 border-l-4 border-blue-500">
          <p className="text-blue-900 text-[11px] leading-snug">
            <span className="font-semibold">Annotation Mode Active</span> — click and drag to mark fractures; click a box to edit.
          </p>
        </div>
      )}
    </div>
  );
}