/**
 * rtSocket — live WebSocket transport from the native rtcored daemon to the Studio.
 *
 * rtcored serves controller telemetry on ws://127.0.0.1:8088 (rt-telemetry crate). This
 * connects, parses each `rtcore.controller_status` message, and feeds the status store
 * that the RT Core readout renders. It auto-reconnects so the UI recovers if the daemon
 * restarts. The message-handling is split out (`handleRtMessage`) so it is unit-testable
 * without a real socket.
 */
import { useRtStatusStore } from '@/state/rtStatusStore';

export const DEFAULT_RTCORE_URL = 'ws://127.0.0.1:8088/';

/** Feed one raw telemetry payload into the status store (ignores non-string/malformed). */
export function handleRtMessage(data: unknown): void {
  if (typeof data === 'string') {
    useRtStatusStore.getState().ingest(data);
  }
}

export type RtConnState = 'connecting' | 'open' | 'closed';

/** A live connection to RT Core: send commands in, telemetry flows into the status store. */
export interface RtConnection {
  /** Send a command object to RT Core (queued until the socket is open). */
  send: (cmd: unknown) => void;
  /** Send a trajectory goal (an rtExport.ts `RtTrajectory` object). */
  sendTrajectory: (traj: unknown) => void;
  /** Trip or reset the e-stop. */
  sendEstop: (trip: boolean) => void;
  /** Close the connection (stops reconnecting). */
  disconnect: () => void;
}

/**
 * Connect to the RT Core telemetry socket. Telemetry flows into the status store; the
 * returned handle sends commands back. `onState` reports connection state. Reconnects
 * every 2 s while not disconnected.
 */
export function connectRtCore(
  url: string = DEFAULT_RTCORE_URL,
  onState?: (s: RtConnState) => void,
): RtConnection {
  let ws: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let outbox: string[] = []; // buffer until the socket is open

  const flush = () => {
    if (ws && ws.readyState === WebSocket.OPEN && outbox.length) {
      for (const m of outbox) ws.send(m);
      outbox = [];
    }
  };

  const open = () => {
    if (closed) return;
    onState?.('connecting');
    ws = new WebSocket(url);
    ws.onopen = () => { onState?.('open'); flush(); };
    ws.onmessage = (e) => handleRtMessage(e.data);
    ws.onerror = () => ws?.close();
    ws.onclose = () => {
      onState?.('closed');
      if (!closed) retry = setTimeout(open, 2000);
    };
  };
  open();

  const send = (cmd: unknown) => {
    outbox.push(JSON.stringify(cmd));
    flush();
  };

  return {
    send,
    sendTrajectory: (traj) => send(traj),
    sendEstop: (trip) => send({ format: 'rtcore.command', cmd: 'estop', trip }),
    disconnect: () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
      ws = null;
    },
  };
}
