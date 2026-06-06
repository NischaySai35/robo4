"""Configuration loaded from environment variables."""

import os

# Serial port settings
SERIAL_PORT = os.getenv("SERIAL_PORT", "/dev/ttyUSB0")
SERIAL_BAUD = int(os.getenv("SERIAL_BAUD", "115200"))

# Network
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# WebSocket
WS_BROADCAST_HZ = int(os.getenv("WS_BROADCAST_HZ", "50"))

# ESP32
ESP32_IP = os.getenv("ESP32_IP", "192.168.1.100")
ESP32_PORT = int(os.getenv("ESP32_PORT", "3333"))

# Dev mode
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
