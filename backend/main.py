"""
ROBO4 FastAPI backend — STUB server.

Run:
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import HOST, PORT, DEBUG
from routers import arm
from routers import ws

logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ROBO4 backend starting (stub mode)")
    yield
    logger.info("ROBO4 backend shutting down")


app = FastAPI(
    title="ROBO4 Arm Controller",
    description="Backend API for ROBO4 robotic arm — ESP32 communication stub",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(arm.router)
app.include_router(ws.router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "service": "robo4-backend", "mode": "stub"}


@app.get("/health", tags=["health"])
async def health():
    return {"healthy": True, "esp32_connected": False, "stub": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=DEBUG)
