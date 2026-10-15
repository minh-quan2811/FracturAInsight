from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    SECRET_KEY: str
    POSTGRES_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    GEMINI_API_KEY: str
    GEMINI_MODEL_NAME: str = "gemini-3.1-flash-lite-preview"
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-small-en-v1.5"
    COHERE_RERANK_MODEL_NAME: str = "rerank-multilingual-v3.0"
    QDRANT_COLLECTION_NAME: str = "medical_documents"
    QDRANT_INDEX_ID: str = "medical_doc_index"
    QDRANT_API_KEY: str
    QDRANT_URL: str
    COHERE_API_KEY: str
    LLAMA_CLOUD_API_KEY: str
    ENV_MODE: str = "local"
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str
    S3_BUCKET_IMAGES: str
    S3_BUCKET_DOCUMENTS: str
    ALLOWED_ORIGINS: str
    REDIS_URL: str
    LANGSMITH_TRACING: str
    LANGSMITH_API_KEY: str
    LANGSMITH_PROJECT: str

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
    
    def get_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',')]

settings = Settings()