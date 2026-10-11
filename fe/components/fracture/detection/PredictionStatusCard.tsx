import React from 'react';
import { PredictionModel, PredictionResult } from '@/types/fracture';

interface PredictionStatusCardProps {
  currentPrediction: PredictionResult | null;
  isRevising: boolean;
  onRevise: () => void;
  isRunningAI: boolean;
  selectedModel: PredictionModel;
  onModelChange: (model: PredictionModel) => void;
  hasAttentionMaps: boolean;
  onRunAI: () => void;
}

export function PredictionStatusCard({
  currentPrediction,
  isRevising,
  onRevise,
  isRunningAI,
  selectedModel,
  onModelChange,
  hasAttentionMaps,
  onRunAI
}: PredictionStatusCardProps) {
  if (!currentPrediction?.has_student_predictions) {
    return null;
  }

  if (isRunningAI) {
    return (
      <div className="bg-[var(--color-info-surface)] rounded-lg p-4 border border-[var(--color-info-border)]">
        <div className="flex items-center gap-4">
          <svg className="animate-spin h-9 w-9 shrink-0 text-[var(--color-info-text)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div>
            <h4 className="font-bold text-[var(--color-text-primary)] text-base">Analysing Result</h4>
            <p className="text-[var(--color-text-secondary)] text-sm">AI is detecting fractures...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasAiPredictions = currentPrediction.has_ai_predictions;

  // Submitted but no AI yet - Can revise and run AI
  if (!hasAiPredictions) {
    return (
      <div className="rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-accent-text)]">
              Prediction Submitted
            </p>
            <p className="text-[11px] text-[var(--color-accent-text)]">
              Revise it or run AI comparison
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="Prediction model"
              value={selectedModel}
              onChange={(event) => onModelChange(event.target.value as PredictionModel)}
              disabled={isRunningAI}
              className="rounded-md border border-[var(--color-primary-border)] bg-[var(--color-surface-raised)] px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary-medium)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="yolo">YOLOv8</option>
              <option value="rfdetr">RF-DETR Small</option>
            </select>

            <button
              onClick={onRevise}
              disabled={isRevising}
              className="btn btn-outline px-3 py-1.5 text-xs"
            >
              {isRevising ? 'Loading...' : 'Revise'}
            </button>

            <button
              onClick={onRunAI}
              disabled={isRunningAI}
              className="btn btn-solid px-3 py-1.5 text-xs"
            >
              {isRunningAI ? 'Running AI...' : 'Run AI Prediction'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modelLabel = currentPrediction.model_version ||
    (selectedModel === 'rfdetr' ? 'RF-DETR' : 'YOLOv8');
  const isRFDETR = modelLabel.toLowerCase().includes('rfdetr') ||
    modelLabel.toLowerCase().includes('rf-detr');

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">AI prediction complete · {modelLabel}</p>
      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
        {isRFDETR
          ? hasAttentionMaps
            ? 'RF-DETR attention map is available on the image.'
            : 'No attention map was saved for this prediction.'
          : 'Attention overlays are available for RF-DETR predictions only.'}
      </p>
    </div>
  );
}