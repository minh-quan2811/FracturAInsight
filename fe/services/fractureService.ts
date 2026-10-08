import { FracturePrediction, PredictionModel, StudentAnnotation } from "@/types";
import { TaskService } from "./taskService";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class FractureService {
  /**
   * Submit student annotations for a prediction
   */
  static async submitAnnotations(
    predictionId: number,
    annotations: StudentAnnotation[],
    token: string
  ) {
    const formattedAnnotations = annotations.map((ann) => ({
      x_min: Math.floor(ann.x),
      y_min: Math.floor(ann.y),
      x_max: Math.floor(ann.x + ann.width),
      y_max: Math.floor(ann.y + ann.height),
      width: Math.floor(ann.width),
      height: Math.floor(ann.height),
      fracture_type: ann.fracture_type,
      notes: ann.notes || "",
    }));

    const res = await fetch(
      `${API_BASE}/api/fracture/predictions/${predictionId}/student-annotations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ annotations: formattedAnnotations }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({
        detail: "Failed to save annotations",
      }));
      throw new Error(errorData.detail || "Failed to save annotations");
    }

    return res.json();
  }

  /**
   * Run AI prediction for a fracture image
   */
  static async runAI(
    predictionId: number,
    token: string,
    model: PredictionModel
  ) {
    const res = await fetch(
      `${API_BASE}/api/fracture/predictions/${predictionId}/ai-predict`,
      {
        method: "POST",
        body: new Blob([JSON.stringify({ model })], { type: "application/json" }),
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({
        detail: "AI prediction failed",
      }));
      throw new Error(errorData.detail || "AI prediction failed");
    }

    const { task_id } = await res.json();

    // Poll for result
    const result = await TaskService.pollTaskResult(task_id, token);

    if (result.status === "error") {
      throw new Error(result.error);
    }

    return result.result;
  }

  /**
   * Get prediction comparison (student vs AI)
   */
  static async getComparison(predictionId: number, token: string) {
    const res = await fetch(
      `${API_BASE}/api/fracture/predictions/${predictionId}/comparison`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({
        detail: "Failed to fetch comparison",
      }));
      throw new Error(errorData.detail || "Failed to fetch comparison");
    }

    return res.json();
  }

  /**
   * Get all predictions for current user
   */
  static async getAllPredictions(
    token: string,
    skip: number = 0,
    limit: number = 100
  ) {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    const res = await fetch(`${API_BASE}/api/fracture/predictions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({
        detail: "Failed to fetch predictions",
      }));
      throw new Error(errorData.detail || "Failed to fetch predictions");
    }

    return res.json();
  }

  /**
   * Get a specific prediction with all details
   */
  static async getPredictionDetails(
    predictionId: number,
    token: string
  ): Promise<FracturePrediction> {
    const res = await fetch(
      `${API_BASE}/api/fracture/predictions/${predictionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({
        detail: "Failed to fetch prediction details",
      }));
      throw new Error(
        errorData.detail || "Failed to fetch prediction details"
      );
    }

    return res.json();
  }

  /**
   * Get fracture image URL for display
   */
  static getImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return `${imagePath}?t=${Date.now()}`;
    }
    
    const normalizedPath = imagePath.replace(/\\/g, "/");
    return `${API_BASE}/${normalizedPath}?t=${Date.now()}`;
  }
}
