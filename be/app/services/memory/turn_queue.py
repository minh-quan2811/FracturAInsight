import asyncio
import logging
import time

from app.services.helpers import run_in_background

logger = logging.getLogger(__name__)


async def _queue_record_turn(user_id: int, conversation_id: int, user_message: str, full_agent_reply: str) -> None:
    from app.tasks.memory_tasks import record_turn

    t0 = time.perf_counter()
    try:
        await asyncio.to_thread(record_turn.delay, user_id, conversation_id, user_message, full_agent_reply)
        logger.info("TIMING record_turn_queued=%.2fs", time.perf_counter() - t0)
    except Exception:
        logger.exception("Failed to queue memory task")


def queue_memory_record(user_id: int, conversation_id: int, user_message: str, full_agent_reply: str) -> None:
    """Queue the memory job in the background so the chat reply is not delayed."""
    run_in_background(_queue_record_turn(user_id, conversation_id, user_message, full_agent_reply))