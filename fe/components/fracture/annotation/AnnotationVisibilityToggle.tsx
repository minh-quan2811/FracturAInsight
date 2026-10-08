import React from 'react';

interface AnnotationVisibilityToggleProps {
  showStudentAnnotations: boolean;
  showAiPredictions: boolean;
  onToggleStudent: () => void;
  onToggleAi: () => void;
  studentCount: number;
  aiCount: number;
  hasAiPredictions: boolean;
  showAttentionOverlay?: boolean;
  hasAttentionMaps?: boolean;
  showAttentionControl?: boolean;
  onToggleAttention?: () => void;
}

export function AnnotationVisibilityToggle({
  showStudentAnnotations,
  showAiPredictions,
  onToggleStudent,
  onToggleAi,
  studentCount,
  aiCount,
  hasAiPredictions,
  showAttentionOverlay = false,
  hasAttentionMaps = false,
  showAttentionControl = false,
  onToggleAttention
}: AnnotationVisibilityToggleProps) {
  return (
    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-md shadow-md border border-gray-300 p-2 z-10">
      <div className="flex items-center gap-2">
        {/* Student Annotations Toggle */}
        <button
          onClick={onToggleStudent}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            showStudentAnnotations
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
          }`}
          title={`${showStudentAnnotations ? 'Hide' : 'Show'} student annotations`}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            {showStudentAnnotations ? (
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10z" />
            ) : (
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            )}
          </svg>
          <span>{studentCount}</span>
        </button>

        {/* AI Predictions Toggle */}
        {hasAiPredictions && (
          <button
            onClick={onToggleAi}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              showAiPredictions
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-500'
            }`}
            title={`${showAiPredictions ? 'Hide' : 'Show'} AI predictions`}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              {showAiPredictions ? (
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10z" />
              ) : (
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
              )}
            </svg>
            <span>{aiCount}</span>
          </button>
        )}

        {hasAiPredictions && showAttentionControl && onToggleAttention && (
          <button
            onClick={onToggleAttention}
            disabled={!hasAttentionMaps}
            aria-pressed={showAttentionOverlay}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              showAttentionOverlay
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-500'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            title={hasAttentionMaps
              ? `${showAttentionOverlay ? 'Hide' : 'Show'} RF-DETR attention overlay`
              : 'No RF-DETR attention map was saved for this prediction'}
          >
            <span aria-hidden="true">◉</span>
            <span>Attention</span>
          </button>
        )}
      </div>
    </div>
  );
}