import React from 'react';
import { Detection } from '@/types/fracture';

interface DetectionListsProps {
  detections: Detection[];
  isFetchingComparison?: boolean;
  modelVersion?: string;
}

export function DetectionLists({ 
  detections, 
  isFetchingComparison = false,
  modelVersion
}: DetectionListsProps) {
  const aiDetections = detections.filter(d => d.source === 'ai');

  // Show loading state while comparison feedback is being generated.
  if (isFetchingComparison) {
    return (
      <div className="bg-[var(--color-info-surface)] rounded-lg p-6 border border-[var(--color-info-border)]">
        <div className="flex flex-col items-center justify-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-[var(--color-info-text)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-center">
            <h4 className="font-bold text-[var(--color-text-primary)] text-lg mb-1">Analysing Result</h4>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Generating detailed feedback...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (aiDetections.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* AI Detections */}
      {aiDetections.length > 0 && (
        <div className="bg-[var(--color-danger-surface)] rounded-lg p-4 border border-[var(--color-danger-border)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="font-semibold text-[var(--color-danger-text)] text-base">
              AI Predictions ({aiDetections.length})
            </h4>
            {modelVersion && (
              <span className="rounded-full border border-[var(--color-danger-border)] bg-[var(--color-surface-raised)] px-2 py-1 text-[11px] font-semibold text-[var(--color-danger-text)]">
                {modelVersion}
                {modelVersion.toLowerCase().includes('rfdetr') ||
                modelVersion.toLowerCase().includes('rf-detr')
                  ? ' · Attention maps'
                  : ''}
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {aiDetections.map((detection, index) => (
              <div key={detection.id} className="bg-[var(--color-danger-surface)] rounded-lg p-3 border border-[var(--color-danger-border)]">
                <div className="font-semibold text-[var(--color-text-primary)] text-sm mb-2">
                  Detection #{index + 1}
                </div>
                <div className="text-[var(--color-text-primary)] space-y-1.5 text-sm">
                  {detection.confidence && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Confidence:</span>
                      <span className="font-semibold">{(detection.confidence * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  {detection.fracture_type && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Fracture Type:</span>
                      <span className="capitalize">{detection.fracture_type}</span>
                    </div>
                  )}
                  <div className="text-[var(--color-text-secondary)] text-xs">
                    Position: ({Math.round(detection.x)}, {Math.round(detection.y)}) • 
                    Size: {Math.round(detection.width)}×{Math.round(detection.height)}px
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}