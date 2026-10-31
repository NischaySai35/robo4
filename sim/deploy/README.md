# TETROBOT deploy (laptop -> ESP32)

Final controller: `laptop_controller.py` (v2, 25 Oct). Sag-aware IK + slow integral correction, hover decided from the robot's own estimate, gentle 1.5 mm/frame go-in, 45 deg lock.

* Self-test on simulated robots: `python laptop_controller.py --sim 30`  (expect ~90% docked, 0 crashes)
* Real robot: `python laptop_controller.py`  (DRY_RUN = True by default: prints the /api/batch URLs, sends nothing)

Fill in before real use: SERVO_ID, SIGN, HOME, RX_POS, RX_YAW_DEG, FLOOR_TILT_DEG, FLOOR_TILT_DIR_DEG (phone level!).
No firmware change needed (esp32_multi.ino already sync-reads every 60 ms; /api/batch = SyncWritePosEx).
Old versions kept: laptop_controller_v1_old.py, laptop_controller_v2_3mm.py.
Full report: project doc claude/overnight-report.md
