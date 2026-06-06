"""
Serial communication module — STUB.

All functions are present but unimplemented.
Replace with actual pyserial logic for ESP32 communication.
"""

from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class SerialComm:
    """Manages serial communication with the ESP32 controller."""

    def __init__(self, port: str, baud: int):
        self.port = port
        self.baud = baud
        self._connected = False
        self._serial = None

    def connect(self) -> bool:
        """Open the serial connection. Returns True on success."""
        # STUB: implement with pyserial
        logger.info(f"[STUB] Serial connect to {self.port} @ {self.baud}")
        return False

    def disconnect(self) -> None:
        """Close the serial connection."""
        # STUB: implement close logic
        logger.info("[STUB] Serial disconnect")
        self._connected = False

    def send_joint_angles(self, angles: List[float]) -> bool:
        """
        Send joint angles (radians) to ESP32.
        angles: list of 3 floats, one per joint.
        Returns True if sent successfully.
        """
        # STUB: serialize and write to serial port
        logger.debug(f"[STUB] send_joint_angles: {angles}")
        return False

    def send_emergency_stop(self) -> bool:
        """Send an immediate stop command to all motors."""
        # STUB: send E-stop packet
        logger.warning("[STUB] Emergency stop sent")
        return False

    def read_status(self) -> Optional[dict]:
        """
        Read current status from ESP32.
        Returns dict with keys: angles, temperatures, currents, errors.
        """
        # STUB: read and parse status packet
        return None

    def is_connected(self) -> bool:
        return self._connected

    def flush(self) -> None:
        """Flush TX/RX buffers."""
        # STUB: flush serial buffers
        pass
