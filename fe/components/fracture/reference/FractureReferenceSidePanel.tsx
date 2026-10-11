import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fractureTypes } from './fractureTypesData';

const PANEL_WIDTH = 420;
const PANEL_GAP = 12; // gap between the Detection Panel's edge and the reference panel

interface FractureReferenceSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ref to the Detection Panel's root element. The reference panel anchors and
   * slides out from this element's left edge, rather than the viewport edge. */
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function FractureReferenceSidePanel({ isOpen, onClose, anchorRef }: FractureReferenceSidePanelProps) {
  const [mounted, setMounted] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; height: number } | null>(null);

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

  // Keep the panel glued to the Detection Panel as it resizes (e.g. the
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

  // Allow closing with the Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !anchorRect) return null;

  const effectiveWidth = Math.min(PANEL_WIDTH, Math.max(280, window.innerWidth - 32));
  const openLeft = Math.max(8, anchorRect.left - effectiveWidth - PANEL_GAP);

  const panel = (
    <div
      role="complementary"
      data-theme="dark"
      aria-label="Fracture Type Reference"
      className="fixed bg-[var(--color-surface-raised)] shadow-2xl border border-[var(--color-border-strong)] rounded-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
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
      {/* Header */}
      <div className="flex-shrink-0 bg-[var(--color-info-surface)] px-4 py-3.5 border-b border-[var(--color-border-strong)] flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--color-text-primary)] text-base flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--color-info-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Fracture Type Reference
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Review common fracture patterns before making your prediction
          </p>
        </div>

        {/* Close (toggle) control */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fracture type reference"
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {fractureTypes.map((fracture, index) => (
          <div
            key={fracture.name}
            className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col">
              {/* Image */}
              <div className="w-full bg-[var(--color-surface-hover)] flex items-center justify-center min-h-[160px]">
                <img
                  src={fracture.imagePath}
                  alt={`${fracture.displayName} example`}
                  className="w-full h-full object-contain max-h-[220px]"
                  onError={(e) => {
                    // Fallback if image doesn't load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex flex-col items-center justify-center text-[var(--color-text-tertiary)] p-4">
                          <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p class="text-xs">Image not available</p>
                        </div>
                      `;
                    }
                  }}
                />
              </div>

              {/* Description */}
              <div className="p-4">
                <h4 className="font-bold text-[var(--color-text-primary)] text-sm mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-[var(--color-info)] text-white text-xs font-bold rounded-full flex-shrink-0">
                    {index + 1}
                  </span>
                  {fracture.displayName}
                </h4>

                <p className="text-xs text-[var(--color-text-secondary)] mb-3 leading-relaxed">
                  {fracture.description}
                </p>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">Key Characteristics:</p>
                  <ul className="space-y-0.5">
                    {fracture.characteristics.map((char, idx) => (
                      <li key={idx} className="text-xs text-[var(--color-text-secondary)] flex items-start gap-1">
                        <span className="text-[var(--color-info-text)] mt-0.5">•</span>
                        <span>{char}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="flex-shrink-0 bg-[var(--color-info-surface)] px-4 py-2 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-info-text)]">
          <strong>Tip:</strong> These images are for reference only. Your uploaded X-ray may show variations of these patterns.
        </p>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}