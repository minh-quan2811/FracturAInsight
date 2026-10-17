import asyncio

_background_tasks: set = set()


def run_in_background(coro) -> None:
    """Run a coroutine without waiting for it."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)