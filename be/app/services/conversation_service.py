from sqlalchemy.orm import Session
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.enums.roles import RoleEnum
from app.services.student_chatbot import chatbot
from app.services.conversation_title import generate_conversation_title
from app.services.memory.context_builder import context_builder
from typing import AsyncGenerator, List, Dict, Optional, Tuple


class ConversationService:
    """Business logic for conversations and messages"""
    
    @staticmethod
    def get_user_conversations(
        current_user: User,
        db: Session
    ) -> List[Conversation]:
        """
        Get all conversations for the current user
        """
        conversations = db.query(Conversation).filter(
            Conversation.user_id == current_user.id
        ).all()
        return conversations
    
    @staticmethod
    def create_conversation(
        title: str,
        current_user: User,
        db: Session
    ) -> Conversation:
        """
        Create a new conversation for the user
        """
        conversation = Conversation(
            title=title,
            user_id=current_user.id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation
    
    @staticmethod
    def get_conversation(
        conversation_id: int,
        current_user: User,
        db: Session
    ) -> Optional[Conversation]:
        """
        Get a specific conversation
        """
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            return None
        
        if conversation.user_id != current_user.id and not current_user.is_admin:
            return None
        
        return conversation

    @staticmethod
    def rename_conversation(
        conversation_id: int,
        title: str,
        current_user: User,
        db: Session,
    ) -> Optional[Conversation]:
        """Rename a conversation owned by the current user."""
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        ).first()
        if not conversation:
            return None

        normalized_title = title.strip()
        if not normalized_title:
            return None

        conversation.title = normalized_title
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def delete_conversation(
        conversation_id: int,
        current_user: User,
        db: Session,
    ) -> bool:
        """Delete a conversation owned by the current user."""
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        ).first()
        if not conversation:
            return False

        db.delete(conversation)
        db.commit()
        return True

    @staticmethod
    async def stream_message_with_reply(
        conversation_id: int,
        message_content: str,
        current_user: User,
        db: Session,
    ) -> AsyncGenerator[Dict[str, str], None]:
        """Add a user message and stream the AI response token by token."""
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if not conversation:
            yield {"type": "error", "error": "Conversation not found"}
            return

        if conversation.user_id != current_user.id:
            yield {"type": "error", "error": "Not authorized to add messages to this conversation"}
            return

        try:
            if (
                not conversation.messages
                and conversation.title in (None, "", "New Chat")
            ):
                conversation.title = await generate_conversation_title(
                    message_content, chatbot.llm
                )

            # Save the human message with the user's role
            human_msg = Message(
                conversation_id=conversation_id,
                sender_id=current_user.id,
                role=current_user.role,
                content=message_content,
            )
            db.add(human_msg)
            db.commit()
            db.refresh(human_msg)

            # Context builder
            memory = context_builder.build(db, current_user.id, conversation_id)

            # Stream the chatbot's response, accumulating tokens so the
            # full text can be persisted once streaming finishes
            full_answer_parts: List[str] = []
            async for event in chatbot.astream(message_content, memory_context=memory.formatted_block):
                if event["type"] == "token":
                    full_answer_parts.append(event["content"])
                yield event

            full_answer = "".join(full_answer_parts)

            # Save the assistant message with the assistant role
            ai_msg = Message(
                conversation_id=conversation_id,
                sender_id=None,
                role=RoleEnum.ASSISTANT,
                content=full_answer,
            )
            db.add(ai_msg)
            db.commit()
            db.refresh(ai_msg)

            from app.tasks.memory_tasks import record_turn
            record_turn.delay(current_user.id, conversation_id, message_content, full_answer)

            yield {"type": "done"}

        except Exception as e:
            db.rollback()
            yield {"type": "error", "error": f"Failed to add message: {str(e)}"}

    @staticmethod
    def get_conversation_messages(
        conversation_id: int,
        current_user: User,
        db: Session
    ) -> Tuple[Dict[str, any], int]:
        """
        Get all messages in a conversation
        """
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            return {"error": "Conversation not found"}, 404
        
        if conversation.user_id != current_user.id and not current_user.is_admin:
            return {"error": "Not authorized to view this conversation"}, 403
        
        return {
            "messages": conversation.messages,
            "status": 200
        }, 200


conversation_service = ConversationService()