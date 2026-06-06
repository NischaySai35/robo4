"""
WebSocket endpoint — STUB.

Streams real-time joint telemetry to connected clients.
"""

import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from comms.websocket_comm import broadcaster

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws/telemetry")
async def telemetry_stream(ws: WebSocket):
    """
    WebSocket endpoint for real-time arm telemetry streaming.

    Message format (JSON):
    {
      "type": "telemetry",
      "joints": [
        {"angle": 0.0, "velocity": 0.0, "acceleration": 0.0},
        ...
      ],
      "end_effector": {"x": 0.0, "y": 0.0, "z": 0.0},
      "status": "idle",
      "timestamp": 1234567890.123
    }
    """
    await broadcaster.connect(ws)
    try:
        while True:
            # STUB: in real implementation this would receive control messages
            data = await ws.receive_text()
            msg = json.loads(data)
            logger.debug(f"[STUB] WS received: {msg}")
            # Echo back as acknowledgement
            await ws.send_text(json.dumps({"type": "ack", "received": msg}))
    except WebSocketDisconnect:
        await broadcaster.disconnect(ws)
    except Exception as e:
        logger.error(f"[STUB] WS error: {e}")
        await broadcaster.disconnect(ws)


@router.get("/ws/clients", summary="Active WebSocket client count")
async def ws_client_count():
    """Returns the number of currently connected WebSocket clients."""
    return {"clients": broadcaster.client_count}
