from pydantic import BaseModel
from datetime import datetime
from app.enums.roles import RoleEnum
from typing import Optional

class MessageCreate(BaseModel):
    role: Optional[RoleEnum] = None
    content: str

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: Optional[int]
    role: RoleEnum
    content: str
    created_at: datetime

    class Config:
        from_attributes = True