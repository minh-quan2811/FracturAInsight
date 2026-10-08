from celery_app import celery_app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.fracture_prediction import FracturePrediction, PredictionSource
from app.services.fracture_service import FractureService
from app.services.annotation_comparision import comparison_service
from app.services.ai_feedback_service import ai_feedback_service
from app.enums.model_choice import ModelChoice

@celery_app.task(name='app.tasks.fracture_tasks.run_ai_prediction')
def run_ai_prediction(user_id: int, prediction_id: int, model: str = "yolo"):
    """
    Run AI prediction (with the chosen model) AND generate comparison in one task
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"status": "error", "error": "User not found"}
        
        # Step 1: Run AI prediction with the chosen model
        ai_result = FractureService.run_ai_prediction(
            prediction_id, user, db, model=ModelChoice(model)
        )
        
        if ai_result.get("status") != 200:
            return {"status": "error", "error": ai_result.get("error", "AI prediction failed")}
        
        # Step 2: Generate comparison (if student predictions exist)
        prediction = db.query(FracturePrediction).filter(
            FracturePrediction.id == prediction_id
        ).first()
        
        comparison_generated = False
        if prediction and prediction.has_student_predictions and prediction.has_ai_predictions:
            try:
                from app.models.fracture_prediction import FractureDetection
                
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
                
                if not prediction.ai_feedback:
                    feedback = ai_feedback_service.generate_feedback(
                        prediction.image_path,
                        student_detections,
                        ai_detections,
                        comparison_result
                    )
                    
                    prediction.ai_feedback = feedback
                    db.commit()
                    comparison_generated = True
                else:
                    comparison_generated = True
                    
            except Exception as e:
                print(f"Warning: Comparison generation failed: {str(e)}")
                import traceback
                traceback.print_exc()
        
        return {
            "status": "success",
            "result": {
                "message": ai_result.get("message"),
                "has_fracture": ai_result.get("has_fracture"),
                "detection_count": ai_result.get("detection_count"),
                "max_confidence": ai_result.get("max_confidence"),
                "inference_time": ai_result.get("inference_time"),
                "model": ai_result.get("model"),
                "comparison_generated": comparison_generated
            }
        }
            
    except Exception as e:
        import traceback
        print(f"Task error: {str(e)}")
        print(traceback.format_exc())
        return {"status": "error", "error": str(e)}
    finally:
        db.close()