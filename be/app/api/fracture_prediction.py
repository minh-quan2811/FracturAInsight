from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.schemas.fracture_prediction import (
    FracturePredictionOut,
    StudentAnnotationsSubmit,
    PredictionComparison,
    AIPredictRequest
)
from app.enums.model_choice import ModelChoice
from app.services.fracture_service import fracture_service

router = APIRouter()


@router.post("/predictions/{prediction_id}/student-annotations")
async def submit_student_annotations(
    prediction_id: int,
    annotations: StudentAnnotationsSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit student annotations for a prediction"""
    result = fracture_service.submit_student_annotations(
        prediction_id, annotations, current_user, db
    )
    
    if result.get("status") == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("error"))
    elif result.get("status") == 403:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=result.get("error"))
    elif result.get("status") == 400:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error"))
    elif result.get("status") == 500:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result.get("error"))
    
    return {
        "message": result.get("message"),
        "count": result.get("count"),
        "no_fracture_predicted": result.get("no_fracture_predicted"),
        "can_revise": result.get("can_revise")
    }


@router.post("/predictions/{prediction_id}/ai-predict", response_model=dict)
async def run_ai_prediction(
    prediction_id: int,
    payload: Optional[AIPredictRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run AI prediction asynchronously with the chosen model (default: yolo)"""
    model = payload.model if payload else ModelChoice.YOLO

    # Check prediction exists and belongs to user
    prediction = fracture_service.get_prediction_details(prediction_id, current_user, db)
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    
    # Import the Celery app and send task
    from celery_app import celery_app
    
    task = celery_app.send_task(
        'app.tasks.fracture_tasks.run_ai_prediction',
        kwargs={
            'user_id': current_user.id,
            'prediction_id': prediction_id,
            'model': model.value
        },
        queue='fracture_queue'
    )
    
    return {
        "task_id": task.id,
        "model": model.value,
        "message": "AI prediction started"
    }


@router.get("/predictions/{prediction_id}/comparison", response_model=PredictionComparison)
async def get_prediction_comparison(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed comparison between student and AI predictions with AI-generated feedback"""
    result = await fracture_service.get_prediction_comparison(prediction_id, current_user, db)
    
    if result.get("status") == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("error"))
    elif result.get("status") == 403:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=result.get("error"))
    elif result.get("status") == 400:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error"))
    
    return PredictionComparison(
        prediction_id=result.get("prediction_id"),
        image_filename=result.get("image_filename"),
        student_detections=result.get("student_detections"),
        ai_detections=result.get("ai_detections"),
        comparison_metrics=result.get("comparison_metrics"),
        detailed_comparison=result.get("detailed_comparison"),
        feedback=result.get("feedback")
    )


@router.get("/predictions/{prediction_id}", response_model=FracturePredictionOut)
def get_prediction_details(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific fracture prediction"""
    prediction = fracture_service.get_prediction_details(prediction_id, current_user, db)
    
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found or access denied"
        )
    
    return prediction


@router.get("/predictions", response_model=List[FracturePredictionOut])
def get_all_predictions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all fracture predictions for the current logged-in user"""
    predictions = fracture_service.get_user_predictions(current_user, skip, limit, db)
    return predictions