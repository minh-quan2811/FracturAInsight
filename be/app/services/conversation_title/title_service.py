import logging
from typing import Any

from app.core.database import SessionLocal
from app.models.conversation import Conversation
from app.services.helpers import run_in_background
from app.services.prompts.conversation_title_prompts import CONVERSATION_TITLE_PROMPT

logger = logging.getLogger(__name__)


def _truncate_title(title: str) -> str:
    if len(title) <= 80:
        return title

    shortened = title[:77].rsplit(" ", 1)[0]
    if len(shortened) < 40:
        shortened = title[:77]
    return f"{shortened.rstrip()}…"


async def generate_conversation_title(message_content: str, llm: Any) -> str:
    """Generate a compact title from the first user prompt."""
    prompt = CONVERSATION_TITLE_PROMPT.format(message=message_content)

    try:
        response = await llm.ainvoke(prompt)
        raw_title = response.content if hasattr(response, "content") else response
        title = " ".join(str(raw_title).strip().strip('"').split())
        if title:
            return _truncate_title(title)
        logger.warning("Title generation returned an empty title; using prompt fallback")
    except Exception:
        logger.exception("Title generation failed; using prompt fallback")

    fallback_title = " ".join(message_content.split()) or "New Chat"
    return _truncate_title(fallback_title)


async def _save_title_when_ready(conversation_id: int, title_task, fallback_title: str) -> None:
    try:
        title = await title_task
    except Exception:
        return

    db = SessionLocal()
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conversation and conversation.title == fallback_title:
            conversation.title = title
            db.commit()
    finally:
        db.close()


def resolve_title(conversation_id: int, title_task, message_content: str) -> str:
    """Return the generated title if ready, else the message text and save the title once it is ready."""
    fallback_title = " ".join(message_content.split())[:60] or "New Chat"

    if title_task.done() and not title_task.cancelled() and not title_task.exception():
        return title_task.result()

    run_in_background(_save_title_when_ready(conversation_id, title_task, fallback_title))
    return fallback_title