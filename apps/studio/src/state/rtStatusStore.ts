/**
 * rtStatusStore — holds the latest RT Core controller feedback for the UI.
 *
 * A transport (websocket/DDS bridge to the rtcored daemon — future work) calls `ingest`
 * with each `rtcore.controller_status` message; the RT Core readout in the Runtime panel
 * renders from here. `ingest` tolerates malformed input (ignored) so a flaky link can't
 * crash the UI.
 */
import { create } from 'zustand';
import { parseRtControllerStatus, type RtControllerStatus } from '@/robotics/runtime/rtStatus';

interface RtStatusState {
  status: RtControllerStatus | null;
  lastUpdate: number; // performance.now() of the last good message
  ingest: (msg: string | unknown) => void;
  clear: () => void;
}

export const useRtStatusStore = create<RtStatusState>((set) => ({
  status: null,
  lastUpdate: 0,
  ingest: (msg) => {
    try {
      set({ status: parseRtControllerStatus(msg), lastUpdate: performance.now() });
    } catch {
      /* ignore malformed messages — never break the UI on bad input */
    }
  },
  clear: () => set({ status: null, lastUpdate: 0 }),
}));
