from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, func, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base
from app.enums.prediction_source import PredictionSource
from app.enums.fracture_type import FractureType

class FracturePrediction(Base):
    __tablename__ = "fracture_predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Image information
    image_filename = Column(String(255), nullable=False)
    image_path = Column(String(500), nullable=False)
    image_size = Column(Integer, nullable=True)
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    image_format = Column(String(10), nullable=True)
    
    # Overall prediction status
    has_student_predictions = Column(Boolean, default=False)
    has_ai_predictions = Column(Boolean, default=False)
    student_prediction_count = Column(Integer, default=0)
    ai_prediction_count = Column(Integer, default=0)
    
    # AI Model Information
    model_version = Column(String(50), default="YOLOv8")
    ai_inference_time = Column(Float, nullable=True)
    confidence_threshold = Column(Float, default=0.25)
    ai_max_confidence = Column(Float, nullable=True)
    
    # AI-generated feedback
    ai_feedback = Column(JSONB, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    student_predictions_at = Column(DateTime(timezone=True), nullable=True)
    ai_predictions_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", backref="fracture_predictions")
    detections = relationship("FractureDetection", back_populates="prediction", cascade="all, delete-orphan")

class FractureDetection(Base):
    __tablename__ = "fracture_detections"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("fracture_predictions.id"), nullable=False)
    
    # Source of the detection (student or AI)
    source = Column(Enum(PredictionSource, name="prediction_source", values_callable=lambda obj: [e.value for e in obj]), 
                    nullable=False)
    
    # Detection Results
    class_id = Column(Integer, nullable=False, default=0)
    class_name = Column(String(100), nullable=False, default="fracture")
    confidence = Column(Float, nullable=True)
    
    # Fracture classification
    fracture_type = Column(Enum(FractureType, name="fracture_type", values_callable=lambda obj: [e.value for e in obj]),
                          nullable=True)
    
    # Bounding box coordinates
    x_min = Column(Integer, nullable=False)
    y_min = Column(Integer, nullable=False)
    x_max = Column(Integer, nullable=False)
    y_max = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    
    # Student annotation metadata
    student_notes = Column(Text, nullable=True)

    # Attention heatmap for AI detections (RF-DETR only)
    attention_map = Column(JSONB, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    prediction = relationship("FracturePrediction", back_populates="detections")