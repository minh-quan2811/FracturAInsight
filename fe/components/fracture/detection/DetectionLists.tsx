import React from 'react';
import { Detection } from '@/types/fracture';

interface DetectionListsProps {
  detections: Detection[];
  isRunningAI?: boolean;
  isFetchingComparison?: boolean;
}

export function DetectionLists({ 
  detections, 
  isRunningAI = false,
  isFetchingComparison = false 
}: DetectionListsProps) {
  const aiDetections = detections.filter(d => d.source === 'ai');

  // Show loading state when AI is running/fetching comparison/feedback
  if (isRunningAI || isFetchingComparison) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
        <div className="flex flex-col items-center justify-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-center">
            <h4 className="font-bold text-gray-900 text-lg mb-1">Analysing Result</h4>
            <p className="text-gray-600 text-sm">
              {isRunningAI 
                ? 'AI is detecting fractures...' 
                : 'Generating detailed feedback...'}
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
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h4 className="font-semibold text-red-900 mb-3 text-base">
              AI Predictions ({aiDetections.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {aiDetections.map((detection, index) => (
              <div key={detection.id} className="bg-red-100 rounded-lg p-3 border border-red-300">
                <div className="font-semibold text-gray-900 text-sm mb-2">
                  Detection #{index + 1}
                </div>
                <div className="text-gray-900 space-y-1.5 text-sm">
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
                  <div className="text-gray-700 text-xs">
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