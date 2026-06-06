"""
WebSocket communication module — STUB.

Manages a set of connected WebSocket clients and broadcasts
real-time arm state at a configurable rate.
"""

import asyncio
import json
import logging
from typing import Set, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketBroadcaster:
    """Maintains connected clients and broadcasts arm telemetry."""

    def __init__(self):
        self._clients: Set[WebSocket] = set()
        self._latest_state: dict = {}

    async def connect(self, ws: WebSocket) -> None:
        """Accept and register a new WebSocket client."""
        await ws.accept()
        self._clients.add(ws)
        logger.info(f"[STUB] WS client connected. Total: {len(self._clients)}")

    async def disconnect(self, ws: WebSocket) -> None:
        """Remove a disconnected client."""
        self._clients.discard(ws)
        logger.info(f"[STUB] WS client disconnected. Total: {len(self._clients)}")

    async def broadcast(self, data: dict) -> None:
        """Broadcast data to all connected clients."""
        # STUB: real implementation would handle disconnect errors
        if not self._clients:
            return
        payload = json.dumps(data)
        dead: Set[WebSocket] = set()
        for ws in self._clients:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        self._clients -= dead

    def update_state(self, state: dict) -> None:
        """Update the latest arm state (called from serial read loop)."""
        # STUB: store state for next broadcast cycle
        self._latest_state = state

    async def run_broadcast_loop(self, hz: int = 50) -> None:
        """
        Continuously broadcast the latest state at `hz` Hz.
        Run as a background asyncio task.
        """
        # STUB: implement broadcast loop
        interval = 1.0 / hz
        while True:
            if self._latest_state:
                await self.broadcast(self._latest_state)
            await asyncio.sleep(interval)

    @property
    def client_count(self) -> int:
        return len(self._clients)


# Shared singleton
broadcaster = WebSocketBroadcaster()
