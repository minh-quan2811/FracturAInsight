import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistoryData, useOverallStats } from '@/hooks/fracture/history';
import { FractureService } from '@/services/fractureService';
import { OverallStatsCard } from './OverallStatsCard';
import { ComparisonResultsButton, ComparisonResultsSidePanel } from '../comparison';
import { drawAttentionMaps } from '@/utils/canvas-utils';

interface HistoryPageProps {
  token: string;
  onBack: () => void;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150 group"
    >
      <svg
        className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Detection
    </button>
  );
}

function NavButton({ onClick, disabled, direction }: {
  onClick: () => void;
  disabled: boolean;
  direction: 'prev' | 'next';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous' : 'Next'}
      title={direction === 'prev' ? 'Previous (←)' : 'Next (→)'}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#2E7D5C] hover:text-[#2E7D5C] disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === 'prev'
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        }
      </svg>
    </button>
  );
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-[#2E7D5C]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function HistoryPage({ token, onBack }: HistoryPageProps) {
  const { predictions, comparisons, isLoading, error } = useHistoryData(token);
  const stats = useOverallStats(comparisons);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [isComparisonPanelOpen, setIsComparisonPanelOpen] = useState(false);
  const [showAttentionOverlay, setShowAttentionOverlay] = useState(false);
  const [showStudentBoxes, setShowStudentBoxes] = useState(true);
  const [showModelBoxes, setShowModelBoxes] = useState(true);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRootRef = useRef<HTMLDivElement>(null);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setFadeIn(false);
      setTimeout(() => { setCurrentIndex(p => Math.max(0, p - 1)); setFadeIn(true); }, 150);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < predictions.length - 1) {
      setFadeIn(false);
      setTimeout(() => { setCurrentIndex(p => Math.min(predictions.length - 1, p + 1)); setFadeIn(true); }, 150);
    }
  }, [currentIndex, predictions.length]);

  useEffect(() => {
    const prediction = predictions[currentIndex];
    const supportsAttention = prediction &&
      (prediction.model_version.toLowerCase().includes('rfdetr') ||
        prediction.model_version.toLowerCase().includes('rf-detr')) &&
      prediction.detections.some(
        detection => detection.source === 'ai' && !!detection.attention_map
      );
    if (!supportsAttention) setShowAttentionOverlay(false);
  }, [predictions, currentIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePrevious, handleNext, onBack]);

  const drawAnnotations = useCallback(() => {
    if (!canvasRef.current || !imgRef.current || predictions.length === 0) return;
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    const ctx    = canvas.getContext('2d');
    if (!ctx) return;
    const pred = predictions[currentIndex];
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isRFDETR = pred.model_version.toLowerCase().includes('rfdetr') ||
      pred.model_version.toLowerCase().includes('rf-detr');
    if (showAttentionOverlay && isRFDETR) {
      drawAttentionMaps(
        ctx,
        pred.detections.filter(detection => detection.source === 'ai'),
        img.naturalWidth,
        img.naturalHeight
      );
    }
    pred.detections.forEach(d => {
      if (d.source === 'student' && !showStudentBoxes) return;
      if (d.source === 'ai' && !showModelBoxes) return;
      const color = d.source === 'student' ? '#3b82f6' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.strokeRect(d.x_min, d.y_min, d.width, d.height);
      const label = `${d.fracture_type || d.class_name}${d.confidence ? ` ${(d.confidence * 100).toFixed(0)}%` : ''}`;
      ctx.font = '14px Arial';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(d.x_min, d.y_min - 20, tw + 10, 20);
      ctx.fillStyle = 'white';
      ctx.fillText(label, d.x_min + 5, d.y_min - 5);
    });
  }, [predictions, currentIndex, showAttentionOverlay, showStudentBoxes, showModelBoxes]);

  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  /* ── States ── */
  if (isLoading) {
    return (
      <div className="h-full bg-white overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">
          <BackButton onClick={onBack} />
          <div className="mt-24 flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-sm text-gray-400">Loading prediction history…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-white overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">
          <BackButton onClick={onBack} />
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm font-semibold text-red-800">Failed to load history</p>
            <p className="text-sm text-red-500 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="h-full bg-white overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">
          <BackButton onClick={onBack} />
          <div className="mt-16 py-20 text-center">
            <p className="text-sm font-semibold text-gray-900">No predictions yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload and analyze an X-ray to see history.</p>
          </div>
        </div>
      </div>
    );
  }

  const pred   = predictions[currentIndex];
  const comp   = comparisons.get(pred.id);
  const sCount = pred.detections.filter(d => d.source === 'student').length;
  const aCount = pred.detections.filter(d => d.source === 'ai').length;

  return (
    <div ref={panelRootRef} className="h-full bg-white overflow-y-auto">
      {/* Comparison Results — slides out from the History Panel's left edge,
          hugging its position/size, while the image viewer stays fully visible.
          Content stays in sync with `comp`, which is derived from `currentIndex`,
          so navigating Previous/Next updates the panel in place without closing it. */}
      <ComparisonResultsSidePanel
        isOpen={isComparisonPanelOpen}
        onClose={() => setIsComparisonPanelOpen(false)}
        anchorRef={panelRootRef}
        comparison={comp}
        imageLabel={pred.image_filename}
        imageKey={pred.id}
      />

      <div className="max-w-6xl mx-auto px-8 py-5 space-y-4 pb-8">
        <BackButton onClick={onBack} />

        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="shrink-0">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Prediction History</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {predictions.length} scan{predictions.length !== 1 ? 's' : ''} analyzed
            </p>
          </div>
          <div className="ml-auto min-w-0">
            <OverallStatsCard stats={stats} />
          </div>
        </div>

        {/* ── Image viewer ── */}
        <div className={`border border-gray-100 rounded-2xl overflow-hidden transition-opacity duration-200 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>

          {/* Card header */}
          <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {/* Scan type pill */}
                <span className="inline-block px-2 py-0.5 rounded-md bg-[#EDF7F1] text-[#1B5E3A] text-[10px] font-bold uppercase tracking-wider border border-[#A8D5BA]">
                  X-Ray
                </span>
                <p className="text-sm font-semibold text-gray-900 truncate">{pred.image_filename}</p>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(pred.created_at)} · Model: {pred.model_version}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <NavButton onClick={handlePrevious} disabled={currentIndex === 0} direction="prev" />
              <span className="min-w-[52px] text-center text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg tabular-nums">
                {currentIndex + 1} / {predictions.length}
              </span>
              <NavButton onClick={handleNext} disabled={currentIndex === predictions.length - 1} direction="next" />
              <div className="w-px h-5 bg-gray-200 mx-0.5" />
              <ComparisonResultsButton
                isOpen={isComparisonPanelOpen}
                onClick={() => setIsComparisonPanelOpen((prev) => !prev)}
                hasData={!!comp}
              />
            </div>
          </div>

          {/* Image */}
          <div ref={containerRef} className="bg-gray-50 flex items-center justify-center p-3">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={FractureService.getImageUrl(pred.image_path)}
                alt={pred.image_filename || 'Fracture scan'}
                className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded-lg"
                onLoad={drawAnnotations}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                style={{ pointerEvents: 'none' }}
              />
            </div>
          </div>

          {/* Card footer */}
          <div className="px-5 py-3 bg-white border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Student badge */}
              <button
                type="button"
                onClick={() => setShowStudentBoxes(value => !value)}
                disabled={sCount === 0}
                aria-pressed={showStudentBoxes}
                aria-label={`${showStudentBoxes ? 'Hide' : 'Show'} student bounding boxes`}
                title={`${showStudentBoxes ? 'Hide' : 'Show'} student bounding boxes`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  showStudentBoxes
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-100 border-gray-200 text-gray-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Student · {sCount}
              </button>
              {/* AI badge */}
              <button
                type="button"
                onClick={() => setShowModelBoxes(value => !value)}
                disabled={aCount === 0}
                aria-pressed={showModelBoxes}
                aria-label={`${showModelBoxes ? 'Hide' : 'Show'} model bounding boxes`}
                title={`${showModelBoxes ? 'Hide' : 'Show'} model bounding boxes`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  showModelBoxes
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-gray-100 border-gray-200 text-gray-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {pred.model_version} · {aCount}
              </button>
            </div>
            <div className="flex items-center gap-3">
              {(pred.model_version.toLowerCase().includes('rfdetr') ||
                pred.model_version.toLowerCase().includes('rf-detr')) && (
                <button
                  type="button"
                  onClick={() => setShowAttentionOverlay(value => !value)}
                  disabled={!pred.detections.some(
                    detection => detection.source === 'ai' && !!detection.attention_map
                  )}
                  aria-pressed={showAttentionOverlay}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    showAttentionOverlay
                      ? 'border-amber-300 bg-amber-100 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  title={
                    pred.detections.some(
                      detection => detection.source === 'ai' && !!detection.attention_map
                    )
                      ? 'Toggle RF-DETR attention overlay'
                      : 'No attention map was saved for this prediction'
                  }
                >
                  {showAttentionOverlay ? 'Hide attention' : 'Show attention'}
                </button>
              )}
              <p className="text-xs text-gray-400 select-none">← → keys to navigate</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}