// Core interfaces for fracture detection system
export interface StudentAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  notes?: string;
  fracture_type?: string;
}

export interface Detection {
  id: number | string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence?: number | null;
  color: string;
  source: 'student' | 'ai';
  fracture_type?: string;
  attention_map?: AttentionMap | null;
}

export interface AttentionMap {
  layer: string;
  width: number;
  height: number;
  encoding: 'uint8_base64';
  data: string;
}

export type PredictionModel = 'yolo' | 'rfdetr';

export interface FractureDetection {
  id: number;
  prediction_id: number;
  source: 'student' | 'ai';
  class_id: number;
  class_name: string;
  confidence: number | null;
  fracture_type?: string;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  width: number;
  height: number;
  student_notes?: string;
  attention_map?: AttentionMap | null;
  created_at: string;
}

export interface FracturePrediction {
  id: number;
  user_id: number;
  image_filename: string;
  image_path: string;
  image_size?: number;
  image_width?: number;
  image_height?: number;
  image_format?: string;
  has_student_predictions: boolean;
  has_ai_predictions: boolean;
  student_prediction_count: number;
  ai_prediction_count: number;
  model_version: string;
  ai_inference_time?: number;
  confidence_threshold: number;
  ai_max_confidence?: number;
  created_at: string;
  student_predictions_at?: string;
  ai_predictions_at?: string;
  detections: FractureDetection[];
}
export interface PredictionResult {
  id: number;
  has_student_predictions: boolean;
  has_ai_predictions: boolean;
  student_prediction_count: number;
  ai_prediction_count: number;
  ai_max_confidence: number | null;
  ai_inference_time: number | null;
  detections: FractureDetection[];
  model_version?: string;
}