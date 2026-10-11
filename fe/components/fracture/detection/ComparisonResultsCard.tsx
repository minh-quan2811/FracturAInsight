import React from 'react';
import { PredictionComparison } from '@/types/comparison';

interface ComparisonResultsCardProps {
  comparison: PredictionComparison | null;
}

const capitalizeFractureType = (type: string | undefined | null): string => {
  if (!type) return 'Unknown';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export function ComparisonResultsCard({ comparison }: ComparisonResultsCardProps) {
  if (!comparison) return null;

  const { comparison_metrics, detailed_comparison, feedback } = comparison;

  // Determine result type
  let resultText: string;
  let resultColor: string;

  if (comparison_metrics.both_normal) {
    resultText = 'Both Agree: No Fracture';
    resultColor = 'bg-[var(--color-success-surface)] border-[var(--color-success-border)] text-[var(--color-success-text)]';
  } else if (comparison_metrics.both_found_fractures) {
    resultText = 'Both Found Fractures';
    resultColor = 'bg-[var(--color-warning-surface)] border-[var(--color-warning-border)] text-[var(--color-warning-text)]';
  } else if (comparison_metrics.student_only) {
    resultText = 'Only You Found Fracture';
    resultColor = 'bg-[var(--color-info-surface)] border-[var(--color-info-border)] text-[var(--color-info-text)]';
  } else if (comparison_metrics.ai_only) {
    resultText = 'Only AI Found Fracture';
    resultColor = 'bg-[var(--color-danger-surface)] border-[var(--color-danger-border)] text-[var(--color-danger-text)]';
  } else {
    resultText = 'Results Differ';
    resultColor = 'bg-[var(--color-warning-surface)] border-[var(--color-warning-border)] text-[var(--color-warning-text)]';
  }

  return (
    <div className={`rounded-lg p-4 border ${resultColor}`}>
      <div className="flex items-center gap-3 mb-4">
        <div>
          <h3 className="font-bold text-lg">Comparison Results</h3>
          <p className="text-sm font-medium">{resultText}</p>
        </div>
      </div>

      {/* AI Image Analysis*/}
      {feedback?.image_analysis && (
        <div className="bg-[var(--color-info-surface)] rounded-lg p-4 border border-[var(--color-info-border)] mb-4">
          <div className="flex items-start gap-2 mb-2">
            <svg className="w-5 h-5 text-[var(--color-info-text)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <h4 className="font-bold text-[var(--color-info-text)] text-sm">AI Visual Analysis</h4>
              <p className="text-xs text-[var(--color-info-text)] mt-1 whitespace-pre-line leading-relaxed">
                {feedback.image_analysis}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Feedback */}
      {feedback?.overall && (
        <div className="bg-[var(--color-surface-raised)] rounded-lg p-3 border border-[var(--color-border)] mb-4">
          <p className="text-sm text-[var(--color-text-primary)]">{feedback.overall}</p>
        </div>
      )}

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--color-surface-raised)] rounded-lg p-3 border border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">Your Detections</div>
          <div className="text-2xl font-bold text-[var(--color-info-text)]">{comparison_metrics.student_count}</div>
        </div>
        <div className="bg-[var(--color-surface-raised)] rounded-lg p-3 border border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">AI Detections</div>
          <div className="text-2xl font-bold text-[var(--color-danger-text)]">{comparison_metrics.ai_count}</div>
        </div>
      </div>

      {/* IoU Metrics */}
      {detailed_comparison?.iou_metrics && (
        <div className="bg-[var(--color-surface-raised)] rounded-lg p-3 border border-[var(--color-border)] mb-4">
          <div className="font-semibold text-[var(--color-text-primary)] mb-2 text-sm">Detection Performance (IoU-based)</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[var(--color-text-secondary)]">Matched:</span>
              <span className="ml-2 font-semibold text-[var(--color-text-primary)]">
                {detailed_comparison.summary.matched_count}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Avg IoU:</span>
              <span className="ml-2 font-semibold text-[var(--color-text-primary)]">
                {(detailed_comparison.iou_metrics.avg_iou * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Precision:</span>
              <span className="ml-2 font-semibold text-[var(--color-text-primary)]">
                {(detailed_comparison.iou_metrics.precision * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Recall:</span>
              <span className="ml-2 font-semibold text-[var(--color-text-primary)]">
                {(detailed_comparison.iou_metrics.recall * 100).toFixed(1)}%
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[var(--color-text-secondary)]">F1 Score:</span>
              <span className="ml-2 font-semibold text-[var(--color-text-primary)]">
                {(detailed_comparison.iou_metrics.f1_score * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          {feedback?.detection_performance && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">{feedback.detection_performance}</p>
          )}
        </div>
      )}

      {/* Fracture Type Metrics */}
      {detailed_comparison?.fracture_type_metrics && detailed_comparison.summary.matched_count > 0 && (
        <div className="bg-[var(--color-surface-raised)] rounded-lg p-3 border border-[var(--color-border)] mb-4">
          <div className="font-semibold text-[var(--color-text-primary)] mb-2 text-sm">Classification Performance</div>
          <div className="space-y-1 text-sm text-[var(--color-text-primary)]">
            <div className="flex justify-between">
              <span>Correct Classifications:</span>
              <span className="font-semibold text-[var(--color-success-text)]">
                {detailed_comparison.fracture_type_metrics.correct_count}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Incorrect Classifications:</span>
              <span className="font-semibold text-[var(--color-danger-text)]">
                {detailed_comparison.fracture_type_metrics.incorrect_count}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t">
              <span>Accuracy:</span>
              <span className="font-semibold text-[var(--color-info-text)]">
                {(detailed_comparison.fracture_type_metrics.accuracy * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          {feedback?.classification_performance && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">{feedback.classification_performance}</p>
          )}
        </div>
      )}

      {/* Matched Detections */}
      {detailed_comparison?.matches && detailed_comparison.matches.length > 0 && (
        <div className="bg-[var(--color-surface-raised)] rounded-lg p-3 border border-[var(--color-border)] mb-4">
          <div className="font-semibold text-[var(--color-text-primary)] mb-2 text-sm">Matched Detections</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {detailed_comparison.matches.map((match, index) => {
              const studentType = match.student_fracture_type?.toLowerCase();
              const aiType = match.ai_fracture_type?.toLowerCase();
              const typesMatch = match.fracture_type_match;
              
              return (
                <div key={index} className={`rounded p-2 border ${
                  typesMatch ? 'bg-[var(--color-success-surface)] border-[var(--color-success-border)]' : 'bg-[var(--color-warning-surface)] border-[var(--color-warning-border)]'
                }`}>
                  <div className="flex justify-between items-start text-xs">
                    <div className="flex-1">
                      <div className="font-medium text-[var(--color-text-primary)]">
                        Match #{index + 1} - IoU: {(match.iou * 100).toFixed(1)}%
                      </div>
                      <div className="text-[var(--color-text-secondary)] mt-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Your Type:</span>
                          <span className={`${
                            typesMatch ? 'text-[var(--color-success-text)] font-medium' : 'text-[var(--color-text-secondary)]'
                          }`}>
                            {capitalizeFractureType(studentType)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">AI Type:</span>
                          <span className={`${
                            typesMatch ? 'text-[var(--color-success-text)] font-medium' : 'text-[var(--color-text-secondary)]'
                          }`}>
                            {capitalizeFractureType(aiType)}
                          </span>
                          {match.ai_confidence && (
                            <span className="text-[var(--color-text-secondary)]">
                              ({(match.ai_confidence * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {typesMatch ? (
                      <span className="text-[var(--color-success-text)] font-bold ml-2">✓</span>
                    ) : (
                      <span className="text-[var(--color-danger-text)] font-bold ml-2">✗</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unmatched Detections */}
      {detailed_comparison?.unmatched_student && detailed_comparison.unmatched_student.length > 0 && (
        <div className="bg-[var(--color-warning-surface)] rounded-lg p-3 border border-[var(--color-warning-border)] mb-4">
          <div className="font-semibold text-[var(--color-warning-text)] mb-2 text-sm">
            Your Unmatched Detections ({detailed_comparison.unmatched_student.length})
          </div>
          <div className="space-y-1 text-xs text-[var(--color-warning-text)]">
            {detailed_comparison.unmatched_student.map((item, index) => (
              <div key={index}>
                • {capitalizeFractureType(item.fracture_type)} 
                {(typeof item.best_iou === 'number' && item.best_iou > 0) && 
                  ` (Best IoU: ${(item.best_iou * 100).toFixed(1)}%)`
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {detailed_comparison?.unmatched_ai && detailed_comparison.unmatched_ai.length > 0 && (
        <div className="bg-[var(--color-danger-surface)] rounded-lg p-3 border border-[var(--color-danger-border)] mb-4">
          <div className="font-semibold text-[var(--color-danger-text)] mb-2 text-sm">
            Missed AI Detections ({detailed_comparison.unmatched_ai.length})
          </div>
          <div className="space-y-1 text-xs text-[var(--color-danger-text)]">
            {detailed_comparison.unmatched_ai.map((item, index) => (
              <div key={index}>
                • {capitalizeFractureType(item.fracture_type)}
                {typeof item.confidence === 'number' && 
                  ` (${(item.confidence * 100).toFixed(0)}% confidence)`
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {feedback?.suggestions && feedback.suggestions.length > 0 && (
        <div className="bg-[var(--color-info-surface)] rounded-lg p-3 border border-[var(--color-info-border)]">
          <div className="font-semibold text-[var(--color-info-text)] mb-2 text-sm">Suggestions for Improvement</div>
          <div className="space-y-1">
            {feedback.suggestions.map((suggestion, index) => (
              <p key={index} className="text-xs text-[var(--color-info-text)]">{suggestion}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}