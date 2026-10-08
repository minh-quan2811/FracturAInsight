from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.enums.prediction_source import PredictionSource
from app.enums.fracture_type import FractureType
from app.enums.model_choice import ModelChoice

class BoundingBox(BaseModel):
    x_min: int
    y_min: int
    x_max: int
    y_max: int
    width: int
    height: int

class DetectionResult(BaseModel):
    class_id: int
    class_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    fracture_type: Optional[FractureType] = None
    bounding_box: BoundingBox

class AttentionMap(BaseModel):
    """Low-res attention heatmap: base64 of width*height uint8 values, row-major."""
    layer: str = "decoder_last"
    width: int
    height: int
    encoding: str = "uint8_base64"
    data: str

class AIPredictRequest(BaseModel):
    model: ModelChoice = ModelChoice.YOLO

class StudentAnnotation(BaseModel):
    x_min: int
    y_min: int
    x_max: int
    y_max: int
    width: int
    height: int
    fracture_type: Optional[FractureType] = None
    notes: Optional[str] = None

class StudentAnnotationsSubmit(BaseModel):
    """
    Schema for submitting student annotations.
    Can be empty list if student predicts no fracture.
    """
    annotations: List[StudentAnnotation] = Field(default_factory=list)

class FractureDetectionOut(BaseModel):
    id: int
    prediction_id: int
    source: PredictionSource
    class_id: int
    class_name: str
    confidence: Optional[float]
    fracture_type: Optional[FractureType]
    x_min: int
    y_min: int
    x_max: int
    y_max: int
    width: int
    height: int
    student_notes: Optional[str]
    attention_map: Optional[AttentionMap] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FracturePredictionOut(BaseModel):
    id: int
    user_id: int
    image_filename: str
    image_path: str
    image_size: Optional[int]
    image_width: Optional[int]
    image_height: Optional[int]
    image_format: Optional[str]
    has_student_predictions: bool
    has_ai_predictions: bool
    student_prediction_count: int
    ai_prediction_count: int
    model_version: str
    ai_inference_time: Optional[float]
    confidence_threshold: float
    ai_max_confidence: Optional[float]
    created_at: datetime
    student_predictions_at: Optional[datetime]
    ai_predictions_at: Optional[datetime]
    detections: List[FractureDetectionOut] = []

    class Config:
        from_attributes = True

class DetailedComparisonMetrics(BaseModel):
    """Detailed IoU-based comparison metrics"""
    summary: Dict[str, Any]
    iou_metrics: Dict[str, float]
    fracture_type_metrics: Dict[str, Any]
    matches: List[Dict[str, Any]]
    unmatched_student: List[Dict[str, Any]]
    unmatched_ai: List[Dict[str, Any]]

class ComparisonFeedback(BaseModel):
    """Educational feedback for students"""
    overall: str
    detection_performance: str
    classification_performance: str
    suggestions: List[str]

class PredictionComparison(BaseModel):
    prediction_id: int
    image_filename: str
    student_detections: List[FractureDetectionOut]
    ai_detections: List[FractureDetectionOut]
    comparison_metrics: dict
    detailed_comparison: Dict[str, Any]
    feedback: Dict[str, Any]