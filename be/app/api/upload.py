from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.schemas.fracture_prediction import FracturePredictionOut
from app.schemas.document_upload import DocumentUploadOut
from app.core.config import settings
from app.utils.image_utils import validate_image_file
from app.utils.document_utils import validate_document_file
from app.services.upload_service import upload_service

router = APIRouter()


@router.post("/image", response_model=FracturePredictionOut)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and resize image to 640x640 for fracture prediction"""
    validate_image_file(file)
    
    try:
        file_content = await file.read()
        result, status_code = upload_service.upload_image(file_content, file.filename, current_user, db)
        
        if status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = settings.QDRANT_COLLECTION_NAME,
    index_id: str = settings.QDRANT_INDEX_ID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document and process asynchronously
    """
    validate_document_file(file)
    
    try:
        file_content = await file.read()
        
        # Encode file content as base64 for Celery
        import base64
        file_content_b64 = base64.b64encode(file_content).decode('utf-8')
        
        # Dispatch Celery task
        from app.tasks.document_tasks import process_document
        task = process_document.delay(
            user_id=current_user.id,
            file_content_b64=file_content_b64,
            filename=file.filename,
            collection_name=collection_name,
            index_id=index_id
        )
        
        return {
            "task_id": task.id,
            "message": "Document upload started"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}"
        )


@router.get("/documents/history", response_model=List[DocumentUploadOut])
async def get_document_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all document uploads for the current user"""
    documents = upload_service.get_document_history(current_user, db)
    return documents