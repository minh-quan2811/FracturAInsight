import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PredictionComparison } from '@/types/comparison';
import { ComparisonResultsCard } from '../detection';

const PANEL_WIDTH = 480;
const PANEL_GAP = 12; // gap between the History Panel's edge and the comparison panel
const MIN_PANEL_WIDTH = 280;

interface ComparisonResultsSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ref to the Prediction History Panel's root element. The comparison panel
   * anchors and slides out from this element's left edge, rather than the
   * viewport edge — matching the Fracture Type Reference panel's behavior. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Comparison data for the currently selected image in the carousel. This
   * is expected to update as the user navigates Previous/Next — the panel
   * re-renders its content in place without closing. */
  comparison: PredictionComparison | null | undefined;
  /** Filename of the currently selected image, shown in the panel subtitle */
  imageLabel?: string;
  /** Stable identifier (e.g. prediction id) for the currently selected image.
   * Used purely to detect navigation and scroll the panel back to the top —
   * doesn't affect what content is shown. */
  imageKey?: string | number;
}

export function ComparisonResultsSidePanel({
  isOpen,
  onClose,
  anchorRef,
  comparison,
  imageLabel,
  imageKey,
}: ComparisonResultsSidePanelProps) {
  const [mounted, setMounted] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; height: number } | null>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const recalcPosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, height: rect.height });
  }, [anchorRef]);

  // Recalculate whenever the panel opens
  useEffect(() => {
    if (isOpen) recalcPosition();
  }, [isOpen, recalcPosition]);

  // Keep the panel glued to the History Panel as it resizes (e.g. the
  // resizable splitter being dragged) or the window/viewport changes.
  useEffect(() => {
    const anchorEl = anchorRef.current;
    if (!anchorEl) return;

    recalcPosition();

    const resizeObserver = new ResizeObserver(recalcPosition);
    resizeObserver.observe(anchorEl);
    window.addEventListener('resize', recalcPosition);
    window.addEventListener('scroll', recalcPosition, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', recalcPosition);
      window.removeEventListener('scroll', recalcPosition, true);
    };
  }, [anchorRef, recalcPosition]);

  // Scroll back to the top whenever the user navigates to a different image,
  // so a lengthy scroll position from the previous image's comparison isn't
  // carried over. Fires even while the panel stays open.
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [imageKey]);

  // Allow closing with the Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = { pointerX: event.clientX, width: panelWidth };
    setIsResizing(true);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current || !anchorRect) return;
    const maxWidth = Math.max(0, anchorRect.left - PANEL_GAP - 8);
    const minWidth = Math.min(MIN_PANEL_WIDTH, maxWidth);
    const delta = resizeStartRef.current.pointerX - event.clientX;
    setPanelWidth(Math.min(maxWidth, Math.max(minWidth, resizeStartRef.current.width + delta)));
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeStartRef.current = null;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (!anchorRect) return;
    const maxWidth = Math.max(0, anchorRect.left - PANEL_GAP - 8);
    const minWidth = Math.min(MIN_PANEL_WIDTH, maxWidth);
    const change = event.key === 'ArrowLeft' ? 20 : -20;
    setPanelWidth((width) => Math.min(maxWidth, Math.max(minWidth, width + change)));
  };

  if (!mounted || !anchorRect) return null;

  const maxWidth = Math.max(0, anchorRect.left - PANEL_GAP - 8);
  const effectiveWidth = Math.min(panelWidth, maxWidth);
  const openLeft = Math.max(8, anchorRect.left - effectiveWidth - PANEL_GAP);

  const panel = (
    <div
      role="complementary"
      aria-label="Comparison Results"
      className={`fixed bg-white shadow-2xl border-2 border-gray-300 rounded-xl flex flex-col overflow-hidden ${
        isResizing ? '' : 'transition-all duration-300 ease-in-out'
      }`}
      style={{
        zIndex: 2147483001,
        top: anchorRect.top,
        height: anchorRect.height,
        width: effectiveWidth,
        left: isOpen ? openLeft : anchorRect.left,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      <div
        role="separator"
        aria-label="Resize comparison results panel"
        aria-orientation="vertical"
        aria-valuemin={Math.min(MIN_PANEL_WIDTH, maxWidth)}
        aria-valuemax={maxWidth}
        aria-valuenow={Math.round(effectiveWidth)}
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        onKeyDown={handleResizeKeyDown}
        className="absolute left-0 top-0 bottom-0 z-10 w-2 cursor-ew-resize touch-none"
      />

      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3.5 border-b-2 border-gray-300 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v18M4 6h5m-5 6h5m-5 6h5M15 3v18m5-15h-5m5 6h-5m5 6h-5"
              />
            </svg>
            Comparison Results
          </h3>
          <p className="text-xs text-gray-600 mt-1 truncate">
            {imageLabel ? `AI vs. student annotations for ${imageLabel}` : 'AI vs. student annotations for the current image'}
          </p>
        </div>

        {/* Close (toggle) control */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close comparison results"
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/70 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content — synced to the currently selected image in the carousel */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
        {comparison ? (
          <ComparisonResultsCard comparison={comparison} />
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-gray-400 py-12 px-4">
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v18M4 6h5m-5 6h5m-5 6h5M15 3v18m5-15h-5m5 6h-5m5 6h-5"
              />
            </svg>
            <p className="text-sm font-semibold text-gray-600">No comparison available</p>
            <p className="text-xs text-gray-400 mt-1">
              This image doesn&apos;t have both student and AI predictions to compare yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}