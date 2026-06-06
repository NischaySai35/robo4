"""
Arm REST endpoints — STUB.

Provides HTTP endpoints for sending joint commands and querying robot status.
All handler bodies are stubbed and return mock data.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from comms.serial_comm import SerialComm
from config import SERIAL_PORT, SERIAL_BAUD

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/arm", tags=["arm"])

# Module-level serial instance (not connected in stub)
_serial = SerialComm(SERIAL_PORT, SERIAL_BAUD)


class JointAnglesPayload(BaseModel):
    angles: List[float] = Field(..., min_items=3, max_items=3,
                                description="Joint angles in radians [-π, π]")
    speed: Optional[float] = Field(1.0, ge=0.0, le=1.0,
                                   description="Movement speed 0-1")


class ArmStatus(BaseModel):
    connected: bool
    joint_angles: List[float]
    joint_velocities: List[float]
    joint_temperatures: List[float]
    errors: List[str]
    mode: str


@router.post("/angles", summary="Send joint angles to ESP32")
async def send_angles(payload: JointAnglesPayload):
    """
    Send target joint angles to the physical arm via serial.
    STUB: always returns success without actually sending.
    """
    logger.info(f"[STUB] Received angles: {payload.angles}")
    # Real implementation: _serial.send_joint_angles(payload.angles)
    return {
        "ok": True,
        "message": "Command queued (stub — serial not connected)",
        "angles": payload.angles,
    }


@router.get("/status", response_model=ArmStatus, summary="Get robot status")
async def get_status():
    """
    Query current robot status from ESP32.
    STUB: returns mock data.
    """
    return ArmStatus(
        connected=False,
        joint_angles=[0.0, 0.0, 0.0],
        joint_velocities=[0.0, 0.0, 0.0],
        joint_temperatures=[25.0, 25.0, 25.0],
        errors=[],
        mode="stub",
    )


@router.post("/stop", summary="Emergency stop")
async def emergency_stop():
    """
    Send emergency stop to all joints.
    STUB: logs and returns acknowledgement.
    """
    logger.warning("[STUB] Emergency stop requested")
    return {"ok": True, "message": "E-stop sent (stub)"}


@router.post("/home", summary="Move arm to home position")
async def home():
    """Command the arm to move to its home/zero position."""
    logger.info("[STUB] Home command")
    return {"ok": True, "message": "Homing (stub)"}


@router.get("/config", summary="Get hardware configuration")
async def get_config():
    """Return current hardware configuration."""
    return {
        "serial_port": SERIAL_PORT,
        "serial_baud": SERIAL_BAUD,
        "num_joints": 3,
        "joint_limit_rad": 2.26,
        "rod_length_mm": 200,
    }
