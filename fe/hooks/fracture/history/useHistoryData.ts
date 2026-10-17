import { useState, useEffect } from 'react';
import { FracturePrediction, PredictionComparison } from '@/types';
import { FractureService } from '@/services/fractureService';

export function useHistoryData(token: string) {
  const [predictions, setPredictions] = useState<FracturePrediction[]>([]);
  const [comparisons, setComparisons] = useState<Map<number, PredictionComparison>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true);
        setError(null);

        const allPredictions = await FractureService.getAllPredictions(token);

        const completedPredictions = allPredictions.filter(
          (p: FracturePrediction) => p.has_student_predictions && p.has_ai_predictions
        );

        setPredictions(completedPredictions);

        const comparisonMap = new Map<number, PredictionComparison>();

        for (const prediction of completedPredictions) {
          try {
            const comparison = await FractureService.getComparison(
              prediction.id,
              token
            );
            comparisonMap.set(prediction.id, comparison);
          } catch (err) {
            console.error(
              `Failed to fetch comparison for prediction ${prediction.id}:`,
              err
            );
          }
        }

        setComparisons(comparisonMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
        console.error("Error loading history:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadHistory();
    }
  }, [token]);

  const deletePrediction = async (predictionId: number) => {
    await FractureService.deletePrediction(predictionId, token);

    setPredictions((prev) => prev.filter((p) => p.id !== predictionId));
    setComparisons((prev) => {
      const next = new Map(prev);
      next.delete(predictionId);
      return next;
    });
  };

  const refetch = () => {
    setIsLoading(true);
    setError(null);
  };

  return {
    predictions,
    comparisons,
    isLoading,
    error,
    deletePrediction,
    refetch
  };
}