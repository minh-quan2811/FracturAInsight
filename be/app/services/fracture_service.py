import os
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.models.fracture_prediction import FracturePrediction, FractureDetection
from app.models.user import User
from app.enums.prediction_source import PredictionSource
from app.enums.fracture_type import FractureType
from app.schemas.fracture_prediction import StudentAnnotationsSubmit
from app.services.bone_fracture_predict.predictor import get_predictor
from app.enums.model_choice import ModelChoice
from app.services.annotation_comparision import comparison_service
from app.services.ai_feedback_service import ai_feedback_service
from app.utils.storage_manager import storage_manager


class FractureService:
    """Business logic for fracture predictions"""
    
    @staticmethod
    def submit_student_annotations(
        prediction_id: int,
        annotations: StudentAnnotationsSubmit,
        current_user: User,
        db: Session
    ) -> Dict:
        """
        Submit student annotations for a prediction
        """
        prediction = db.query(FracturePrediction).filter(
            FracturePrediction.id == prediction_id
        ).first()
        
        if not prediction:
            return {"error": "Prediction not found", "status": 404}
        
        if prediction.user_id != current_user.id and not current_user.is_admin:
            return {"error": "Access denied", "status": 403}
        
        if prediction.has_ai_predictions:
            return {
                "error": "Cannot revise student predictions after AI comparison has been run",
                "status": 400
            }
        
        try:
            # Remove existing student annotations
            db.query(FractureDetection).filter(
                FractureDetection.prediction_id == prediction_id,
                FractureDetection.source == PredictionSource.STUDENT
            ).delete()
            
            # Add new student annotations
            for annotation in annotations.annotations:
                db_detection = FractureDetection(
                    prediction_id=prediction_id,
                    source=PredictionSource.STUDENT,
                    class_id=0,
                    class_name="fracture",
                    confidence=None,
                    fracture_type=annotation.fracture_type,
                    x_min=annotation.x_min,
                    y_min=annotation.y_min,
                    x_max=annotation.x_max,
                    y_max=annotation.y_max,
                    width=annotation.width,
                    height=annotation.height,
                    student_notes=annotation.notes
                )
                db.add(db_detection)
            
            # Update prediction record
            prediction.has_student_predictions = True
            prediction.student_prediction_count = len(annotations.annotations)
            prediction.student_predictions_at = datetime.utcnow()
            
            db.commit()
            db.refresh(prediction)
            
            message = (
                f"Student annotations saved: {len(annotations.annotations)} fracture(s) detected" 
                if len(annotations.annotations) > 0 
                else "Student prediction saved: No fractures detected"
            )
            
            return {
                "message": message,
                "count": len(annotations.annotations),
                "no_fracture_predicted": len(annotations.annotations) == 0,
                "can_revise": not prediction.has_ai_predictions,
                "status": 200
            }
            
        except Exception as e:
            db.rollback()
            return {
                "error": f"Failed to save annotations: {str(e)}",
                "status": 500
            }
    
    @staticmethod
    def run_ai_prediction(
        prediction_id: int,
        current_user: User,
        db: Session,
        model: ModelChoice = ModelChoice.YOLO
    ) -> Dict:
        """
        Run AI prediction on a fracture image
        """
        prediction = db.query(FracturePrediction).filter(
            FracturePrediction.id == prediction_id
        ).first()
        
        if not prediction:
            return {"error": "Prediction not found", "status": 404}
        
        if prediction.user_id != current_user.id and not current_user.is_admin:
            return {"error": "Access denied", "status": 403}
        
        try:
            # Get file bytes using storage manager (handles both local and S3)
            file_content = storage_manager.get_file_bytes(prediction.image_path)
                        
            # Run AI prediction with the model the user picked
            predictor = get_predictor(model)
            prediction_result = predictor.predict(file_content)
            
            # Remove existing AI predictions
            db.query(FractureDetection).filter(
                FractureDetection.prediction_id == prediction_id,
                FractureDetection.source == PredictionSource.AI
            ).delete()
            
            # Save AI detections
            for detection in prediction_result["detections"]:
                bbox = detection["bounding_box"]
                
                # Ensure fracture_type is properly set
                fracture_type_value = detection.get("fracture_type")
                
                # Convert string to enum if needed
                if fracture_type_value and isinstance(fracture_type_value, str):
                    try:
                        fracture_type_enum = FractureType(fracture_type_value.lower())
                    except ValueError:
                        fracture_type_enum = None
                else:
                    fracture_type_enum = fracture_type_value
                
                db_detection = FractureDetection(
                    prediction_id=prediction_id,
                    source=PredictionSource.AI,
                    class_id=detection["class_id"],
                    class_name=detection["class_name"],
                    confidence=detection["confidence"],
                    fracture_type=fracture_type_enum,
                    x_min=bbox["x_min"],
                    y_min=bbox["y_min"],
                    x_max=bbox["x_max"],
                    y_max=bbox["y_max"],
                    width=bbox["width"],
                    height=bbox["height"],
                    attention_map=detection.get("attention")  # None for YOLO
                )
                db.add(db_detection)
            
            # Update prediction record
            prediction.has_ai_predictions = prediction_result["detection_count"] > 0
            prediction.ai_prediction_count = prediction_result["detection_count"]
            prediction.ai_max_confidence = prediction_result["max_confidence"]
            prediction.ai_inference_time = prediction_result["inference_time"]
            prediction.ai_predictions_at = datetime.utcnow()
            prediction.model_version = predictor.model_version
            prediction.confidence_threshold = predictor.confidence_threshold
            # Old feedback belongs to the previous run, so regenerate it
            prediction.ai_feedback = None
            
            db.commit()
            db.refresh(prediction)
            
            
            return {
                "message": "AI prediction completed successfully",
                "has_fracture": prediction_result["has_fracture"],
                "detection_count": prediction_result["detection_count"],
                "max_confidence": prediction_result["max_confidence"],
                "inference_time": prediction_result["inference_time"],
                "model": ModelChoice(model).value,
                "status": 200
            }
            
        except FileNotFoundError as e:
            return {
                "error": "Image file not found",
                "status": 404
            }
        except Exception as e:
            db.rollback()
            print(f"AI prediction error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "error": f"AI prediction failed: {str(e)}",
                "status": 500
            }
    
    @staticmethod
    async def get_prediction_comparison(
        prediction_id: int,
        current_user: User,
        db: Session
    ) -> Dict:
        """
        Get detailed comparison between student and AI predictions with AI-generated feedback
        """
        prediction = db.query(FracturePrediction).filter(
            FracturePrediction.id == prediction_id
        ).first()
        
        if not prediction:
            return {"error": "Prediction not found", "status": 404}
        
        if prediction.user_id != current_user.id and not current_user.is_admin:
            return {"error": "Access denied", "status": 403}
        
        if not prediction.has_student_predictions or not prediction.has_ai_predictions:
            return {
                "error": "Both student and AI predictions are required for comparison",
                "status": 400
            }
        
        student_detections = db.query(FractureDetection).filter(
            FractureDetection.prediction_id == prediction_id,
            FractureDetection.source == PredictionSource.STUDENT
        ).all()
        
        ai_detections = db.query(FractureDetection).filter(
            FractureDetection.prediction_id == prediction_id,
            FractureDetection.source == PredictionSource.AI
        ).all()
        
        comparison_result = comparison_service.compare_predictions(
            student_detections,
            ai_detections
        )
        
        # Generate AI-powered feedback if not already cached
        if not prediction.ai_feedback:
            try:
                feedback = await ai_feedback_service.generate_feedback(
                    prediction.image_path,
                    student_detections,
                    ai_detections,
                    comparison_result
                )
                
                # Store in database as JSONB
                prediction.ai_feedback = feedback
                db.commit()
                db.refresh(prediction)
            except Exception as e:
                print(f"Failed to generate AI feedback: {str(e)}")
                # Fallback to rule-based feedback
                feedback = comparison_service.generate_feedback(comparison_result)
                feedback['image_analysis'] = f'Unable to perform AI analysis: {str(e)}'
        else:
            # Use cached feedback
            feedback = prediction.ai_feedback
        
        legacy_metrics = {
            "student_count": comparison_result['summary']['student_count'],
            "ai_count": comparison_result['summary']['ai_count'],
            "both_found_fractures": comparison_result['summary']['both_found_fractures'],
            "student_only": comparison_result['summary']['student_only'],
            "ai_only": comparison_result['summary']['ai_only'],
            "both_normal": comparison_result['summary']['both_normal'],
            "fracture_type_matches": comparison_result['fracture_type_metrics']['correct_count'],
        }
        
        return {
            "prediction_id": prediction_id,
            "image_filename": prediction.image_filename,
            "student_detections": student_detections,
            "ai_detections": ai_detections,
            "comparison_metrics": legacy_metrics,
            "detailed_comparison": comparison_result,
            "feedback": feedback,
            "status": 200
        }
    
    @staticmethod
    def get_prediction_details(
        prediction_id: int,
        current_user: User,
        db: Session
    ) -> Optional[FracturePrediction]:
        """
        Get details of a specific fracture prediction
        """
        prediction = db.query(FracturePrediction).filter(
            FracturePrediction.id == prediction_id
        ).first()
        
        if not prediction:
            return None
        
        if prediction.user_id != current_user.id and not current_user.is_admin:
            return None
        
        return prediction
    
    @staticmethod
    def get_user_predictions(
        current_user: User,
        skip: int = 0,
        limit: int = 100,
        db: Session = None
    ) -> List[FracturePrediction]:
        """
        Get all fracture predictions for the current user
        """
        query = db.query(FracturePrediction).filter(
            FracturePrediction.user_id == current_user.id
        )
        
        query = query.order_by(FracturePrediction.created_at.desc())
        predictions = query.offset(skip).limit(limit).all()
        
        return predictions


fracture_service = FractureService()