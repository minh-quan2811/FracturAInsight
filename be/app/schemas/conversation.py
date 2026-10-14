from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.schemas.message import MessageOut

class ConversationCreate(BaseModel):
    title: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class ConversationOut(BaseModel):
    id: int
    title: Optional[str]
    user_id: int
    created_at: datetime
    updated_at: datetime
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True
