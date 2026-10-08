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
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
        <div className="flex items-center gap-4">
          <svg className="animate-spin h-9 w-9 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div>
            <h4 className="font-bold text-gray-900 text-base">Analysing Result</h4>
            <p className="text-gray-600 text-sm">AI is detecting fractures...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasAiPredictions = currentPrediction.has_ai_predictions;

  // Submitted but no AI yet - Can revise and run AI
  if (!hasAiPredictions) {
    return (
      <div className="bg-green-50 rounded-lg p-5 border-2 border-green-300">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-green-800 text-base font-semibold">
              ✓ Prediction Submitted
            </p>
            <label className="flex w-full max-w-xs flex-col gap-2 text-sm font-semibold text-gray-700 sm:items-end">
              Prediction model
              <select
                value={selectedModel}
                onChange={(event) => onModelChange(event.target.value as PredictionModel)}
                disabled={isRunningAI}
                className="w-full rounded-md border border-green-300 bg-white px-3 py-2.5 text-base font-medium text-gray-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="yolo">YOLOv8</option>
                <option value="rfdetr">RF-DETR Small</option>
              </select>
            </label>
          </div>
          <p className="text-green-700 text-sm">
            You can revise your prediction or run AI comparison
          </p>
          
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onRevise}
              disabled={isRevising}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRevising ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Revise
                </>
              )}
            </button>
            
            <button
              onClick={onRunAI}
              disabled={isRunningAI}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white text-base font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRunningAI ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running AI...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Run AI Prediction
                </>
              )}
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <p className="text-sm font-semibold text-gray-800">AI prediction complete · {modelLabel}</p>
      <p className="mt-0.5 text-xs text-gray-600">
        {isRFDETR
          ? hasAttentionMaps
            ? 'RF-DETR attention map is available on the image.'
            : 'No attention map was saved for this prediction.'
          : 'Attention overlays are available for RF-DETR predictions only.'}
      </p>
    </div>
  );
}