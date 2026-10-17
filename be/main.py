from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.database import engine, Base
from app.core.config import settings
from app.api import auth, student_chat, fracture_prediction, upload, tasks

# create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Bone Fracture Helper API")


@app.on_event("startup")
async def warmup_chatbot():
    """Load the vector index + BM25 corpus at boot so the first RAG question isn't slow."""
    import asyncio
    from app.services.student_chatbot import chatbot
    asyncio.get_event_loop().run_in_executor(None, chatbot.warmup)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded images (local)
if settings.ENV_MODE == "local":
    uploads_path = "uploads"
    os.makedirs(uploads_path, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

app.include_router(auth, prefix="/auth", tags=["Auth"])
app.include_router(student_chat, prefix="/chat", tags=["Chat"])
app.include_router(upload, prefix="/upload", tags=["Upload"])
app.include_router(fracture_prediction, prefix="/api/fracture", tags=["Fracture Detection"])
app.include_router(tasks, prefix="/api", tags=["tasks"])

@app.get("/")
def root():
    return {
        "message": "Medical AI API for Fracture Detection Application",
        "environment": settings.ENV_MODE,
        "storage": "S3" if settings.ENV_MODE == "production" else "Local",
        "endpoints": {
            "auth": "/auth",
            "chat": "/chat",
            "upload": "/upload",
            "fracture_detection": "/api/fracture"
        }
    }

@app.get("/health")
def health_check():
    storage_info = "S3" if settings.ENV_MODE == "production" else "Local filesystem"
    return {
        "status": "healthy",
        "database": "connected",
        "storage": storage_info,
        "env_mode": settings.ENV_MODE
    }