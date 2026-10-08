import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { StudentAnnotation } from '@/types/fracture';
import { AnnotationCanvasRef } from './AnnotationCanvas';

interface AnnotationDialogProps {
  annotation: StudentAnnotation;
  index: number;
  canvasRef: React.RefObject<AnnotationCanvasRef | null>;
  image: HTMLImageElement;
  onUpdate: (annotation: StudentAnnotation) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onDone: (annotation: StudentAnnotation) => void;
  isActive: boolean;
  imageRect?: DOMRect;
  canvasRect?: DOMRect;
  scaleX?: number;
  scaleY?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

const FRACTURE_TYPES = [
  { value: '', label: 'Select fracture type...' },
  { value: 'comminuted', label: 'Comminuted' },
  { value: 'greenstick', label: 'Greenstick' },
  { value: 'oblique', label: 'Oblique' },
  { value: 'spiral', label: 'Spiral' },
  { value: 'transverse', label: 'Transverse' }
];

export function AnnotationDialog({
  annotation,
  index,
  canvasRef,
  image,
  onUpdate,
  onRemove,
  onClose,
  onDone,
  isActive,
}: AnnotationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('right');
  // Controls visibility
  const [boxVisible, setBoxVisible] = useState(true);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const recalcPosition = useCallback(() => {
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getCanvasRect();
    if (!canvasRect) return;

    const scaleX = image.width / canvasRect.width;
    const scaleY = image.height / canvasRect.height;

    // Annotation box position in current viewport coordinates
    const boxLeft   = canvasRect.left + annotation.x / scaleX;
    const boxTop    = canvasRect.top  + annotation.y / scaleY;
    const boxRight  = boxLeft + annotation.width  / scaleX;
    const boxBottom = boxTop  + annotation.height / scaleY;

    // Visibility check
    const visibleInCanvas =
      boxRight  > canvasRect.left &&
      boxLeft   < canvasRect.right &&
      boxBottom > canvasRect.top  &&
      boxTop    < canvasRect.bottom;

    const visibleInViewport =
      boxRight  > 0 &&
      boxLeft   < window.innerWidth &&
      boxBottom > 0 &&
      boxTop    < window.innerHeight;

    const isVisible = visibleInCanvas && visibleInViewport;

    if (!isVisible) {
      // Box is out of view
      setBoxVisible(false);
      onCloseRef.current();
      return;
    }

    setBoxVisible(true);

    // Position calculation
    if (!dialogRef.current) return;

    const dialogWidth  = 300;
    const dialogHeight = dialogRef.current.offsetHeight || 220;
    const arrowOffset  = 10;
    const viewportWidth  = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const boxWidth   = annotation.width  / scaleX;
    const boxHeight  = annotation.height / scaleY;
    const boxCenterY = boxTop  + boxHeight / 2;
    const boxCenterX = boxLeft + boxWidth  / 2;

    let top  = 0;
    let left = 0;
    let arrow: 'top' | 'bottom' | 'left' | 'right' = 'right';

    const leftCandidate = boxLeft - dialogWidth - arrowOffset;
    const topCandidate  = boxCenterY - dialogHeight / 2;

    if (leftCandidate >= 8) {
      left  = leftCandidate;
      top   = Math.max(8, Math.min(viewportHeight - dialogHeight - 8, topCandidate));
      arrow = 'right';
    } else {
      const rightCandidate = boxLeft + boxWidth + arrowOffset;
      if (rightCandidate + dialogWidth <= viewportWidth - 8) {
        left  = rightCandidate;
        top   = Math.max(8, Math.min(viewportHeight - dialogHeight - 8, topCandidate));
        arrow = 'left';
      } else {
        const belowCandidate = boxTop + boxHeight + arrowOffset;
        if (belowCandidate + dialogHeight <= viewportHeight - 8) {
          top   = belowCandidate;
          left  = Math.max(8, Math.min(viewportWidth - dialogWidth - 8, boxCenterX - dialogWidth / 2));
          arrow = 'top';
        } else {
          top   = Math.max(8, boxTop - dialogHeight - arrowOffset);
          left  = Math.max(8, Math.min(viewportWidth - dialogWidth - 8, boxCenterX - dialogWidth / 2));
          arrow = 'bottom';
        }
      }
    }

    setPosition({ top, left });
    setArrowPosition(arrow);
  }, [annotation, canvasRef, image]);

  useEffect(() => {
    // Initial position + visibility check
    recalcPosition();

    document.addEventListener('scroll', recalcPosition, true);
    window.addEventListener('resize', recalcPosition);

    return () => {
      document.removeEventListener('scroll', recalcPosition, true);
      window.removeEventListener('resize', recalcPosition);
    };
  }, [recalcPosition]);

  if (!boxVisible) return null;

  const isComplete = annotation.fracture_type;

  const dialog = (
    <div
      ref={dialogRef}
      className={`fixed w-[300px] bg-white rounded-lg shadow-2xl border-2 ${
        isComplete ? 'border-green-500' : 'border-yellow-500'
      } ${isActive ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 2147483647,
      }}
    >
      {/* Arrow indicator */}
      <div
        className={`absolute w-4 h-4 bg-white border-2 ${
          isComplete ? 'border-green-500' : 'border-yellow-500'
        } transform rotate-45 ${
          arrowPosition === 'left'   ? '-left-2 top-1/2 -translate-y-1/2 border-r-0 border-b-0' :
          arrowPosition === 'right'  ? '-right-2 top-1/2 -translate-y-1/2 border-l-0 border-t-0' :
          arrowPosition === 'top'    ? 'left-1/2 -top-2 -translate-x-1/2 border-b-0 border-r-0' :
                                       'left-1/2 -bottom-2 -translate-x-1/2 border-t-0 border-l-0'
        }`}
      />

      {/* Header */}
      <div className={`px-4 py-3 rounded-t-lg ${
        isComplete ? 'bg-green-50' : 'bg-yellow-50'
      } border-b-2 ${
        isComplete ? 'border-green-200' : 'border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-sm">
            Annotation #{index + 1}
          </span>
          {isComplete && (
            <span className="text-green-600 text-xs">✓</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Fracture Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1.5">
            Fracture Type <span className="text-red-500">*</span>
          </label>
          <select
            value={annotation.fracture_type || ''}
            onChange={(e) => onUpdate({
              ...annotation,
              fracture_type: e.target.value
            })}
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-all"
          >
            {FRACTURE_TYPES.map(type => (
              <option key={type.value} value={type.value} className="text-gray-900">
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            value={annotation.notes || ''}
            onChange={(e) => onUpdate({
              ...annotation,
              notes: e.target.value
            })}
            placeholder="Add observations..."
            rows={3}
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 bg-white transition-all"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t-2 border-gray-200 flex items-center justify-between gap-2">
        <button
          onClick={() => onRemove(annotation.id)}
          className="flex items-center justify-center p-2 bg-[var(--color-delete)] text-white rounded-lg hover:opacity-90 transition-opacity"
          title="Delete annotation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button
          onClick={() => onDone(annotation)}
          disabled={!annotation.fracture_type}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            annotation.fracture_type
              ? 'bg-green-600 text-white hover:opacity-90'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!annotation.fracture_type ? 'Select fracture type first' : 'Close dialog'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Done
        </button>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}