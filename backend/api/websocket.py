"""
WebSocket handler and in-memory job registry.

Each job has a queue; the solver pushes messages, the WS handler pops and sends.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

# job_id -> asyncio.Queue
_job_queues: dict[str, asyncio.Queue] = {}
_SENTINEL = "__DONE__"


def create_job() -> tuple[str, asyncio.Queue]:
    job_id = str(uuid.uuid4())
    q: asyncio.Queue = asyncio.Queue()
    _job_queues[job_id] = q
    return job_id, q


def get_queue(job_id: str) -> asyncio.Queue | None:
    return _job_queues.get(job_id)


def cleanup_job(job_id: str) -> None:
    _job_queues.pop(job_id, None)


async def push_message(q: asyncio.Queue, msg_type: str, data: Any) -> None:
    await q.put({"type": msg_type, "data": data})


async def push_done(q: asyncio.Queue) -> None:
    await q.put(_SENTINEL)


async def ws_handler(websocket: WebSocket, job_id: str) -> None:
    # Accept unconditionally first — CORSMiddleware does not cover WebSocket
    # connections; Starlette fires a 403 if any other operation is attempted
    # before accept(), including close().
    await websocket.accept()

    q = get_queue(job_id)
    if q is None:
        await websocket.send_text(json.dumps({"type": "error", "data": {"message": "Job not found"}}))
        await websocket.close(code=4404)
        return

    try:
        while True:
            item = await q.get()
            if item is _SENTINEL:
                break
            await websocket.send_text(json.dumps(item))
    except WebSocketDisconnect:
        pass
    finally:
        cleanup_job(job_id)
        try:
            await websocket.close()
        except Exception:
            pass
