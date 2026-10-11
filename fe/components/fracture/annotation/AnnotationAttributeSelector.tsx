import React from 'react';
import { StudentAnnotation } from '@/types/fracture';

interface AnnotationAttributeSelectorProps {
  annotations: StudentAnnotation[];
  onUpdateAnnotation: (annotation: StudentAnnotation) => void;
  onRemoveAnnotation: (id: string) => void;
  isAnnotating: boolean;
}

// model prediction classes: {0: 'comminuted', 1: 'greenstick', 2: 'oblique', 3: 'spiral', 4: 'transverse'}
const FRACTURE_TYPES = [
  { value: '', label: 'Select fracture type...' },
  { value: 'comminuted', label: 'Comminuted' },
  { value: 'greenstick', label: 'Greenstick' },
  { value: 'oblique', label: 'Oblique' },
  { value: 'spiral', label: 'Spiral' },
  { value: 'transverse', label: 'Transverse' }
];

export function AnnotationAttributeSelector({
  annotations,
  onUpdateAnnotation,
  onRemoveAnnotation,
  isAnnotating
}: AnnotationAttributeSelectorProps) {
  if (annotations.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-[var(--color-text-primary)] text-sm">Annotation Attributes</h4>
        <div className="bg-[var(--color-surface)] rounded-lg p-4 border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-tertiary)] text-sm">
            {isAnnotating 
              ? 'Draw on the image to create annotations' 
              : 'No annotations yet'}
          </p>
          <p className="text-[var(--color-text-tertiary)] text-xs mt-2">
            If you see no fractures, you can submit without annotations
          </p>
        </div>
      </div>
    );
  }

  const allAnnotationsComplete = annotations.every(
    ann => ann.fracture_type
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-[var(--color-text-primary)] text-sm">
          Annotation Attributes ({annotations.length})
        </h4>
        {!allAnnotationsComplete && (
          <span className="text-xs text-[var(--color-danger-text)] font-medium">
            Incomplete
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {annotations.map((annotation, index) => {
          const isComplete = annotation.fracture_type;
          
          return (
            <div 
              key={annotation.id} 
              className={`bg-[var(--color-surface-raised)] rounded-lg p-3 border ${
                isComplete ? 'border-[var(--color-success-border)]' : 'border-[var(--color-warning-border)]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--color-text-primary)] text-sm">
                    Annotation #{index + 1}
                  </span>
                  {isComplete && (
                    <span className="text-[var(--color-success-text)] text-xs">✓</span>
                  )}
                </div>
                <button
                  onClick={() => onRemoveAnnotation(annotation.id)}
                  className="text-[var(--color-danger-text)] hover:text-[var(--color-danger-text)] font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                {/* Fracture Type */}
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">
                    Fracture Type <span className="text-[var(--color-danger-text)]">*</span>
                  </label>
                  <select
                    value={annotation.fracture_type || ''}
                    onChange={(e) => onUpdateAnnotation({
                      ...annotation,
                      fracture_type: e.target.value
                    })}
                    className="w-full px-2 py-1.5 text-sm border border-[var(--color-border-strong)] rounded focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary-medium)] text-[var(--color-text-primary)] bg-[var(--color-surface-raised)]"
                  >
                    {FRACTURE_TYPES.map(type => (
                      <option key={type.value} value={type.value} className="text-[var(--color-text-primary)]">
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={annotation.notes || ''}
                    onChange={(e) => onUpdateAnnotation({
                      ...annotation,
                      notes: e.target.value
                    })}
                    placeholder="Add observations..."
                    rows={2}
                    className="w-full px-2 py-1.5 text-sm border border-[var(--color-border-strong)] rounded focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary-medium)] resize-none text-[var(--color-text-primary)] bg-[var(--color-surface-raised)]"
                  />
                </div>

                {/* Size Info */}
                <div className="text-xs text-[var(--color-text-secondary)] pt-1">
                  Size: {Math.round(annotation.width)}×{Math.round(annotation.height)}px
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!allAnnotationsComplete && (
        <div className="bg-[var(--color-warning-surface)] rounded-lg p-2 border border-[var(--color-warning-border)]">
          <p className="text-[var(--color-warning-text)] text-xs">
            Please select fracture type for all annotations
          </p>
        </div>
      )}
    </div>
  );
}