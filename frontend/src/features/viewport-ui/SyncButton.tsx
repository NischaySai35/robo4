/**
 * SyncButton — a real-time "follow" toggle for the Animation page. When ON, the
 * live model joint values are streamed to the connected device (via
 * hardwareBridge.setStreaming → ~20 Hz throttled), so playing/scrubbing/dragging
 * the animation drives the real motors, and telemetry feedback flows back into
 * the hardware store (shown on the Motor Control page). Same pipe the CONN panel
 * uses — this is just a one-click toggle next to Home / Drag-tip.
 */
import './HomeButton.css';
import { hardwareBridge } from '@/hardware/HardwareBridge';
import { useHardwareStore } from '@/state/hardwareStore';

export default function SyncButton() {
  const streaming = useHardwareStore((s) => s.streaming);
  const status = useHardwareStore((s) => s.status);
  const connected = status === 'connected';

  const toggle = () => {
    if (!connected && !streaming) {
      // Nothing to stream to yet — nudge the user to connect from Motor Control.
      hardwareBridge.setStreaming(true); // arm it; it starts sending the moment a device connects
    } else {
      hardwareBridge.setStreaming(!streaming);
    }
  };

  const title = connected
    ? (streaming ? 'Real-time sync ON — live joint values are driving the motors. Click to stop.'
                 : 'Turn ON real-time sync — stream live joint values to the connected motors.')
    : 'Real-time sync: no device connected. Connect on the Motor Control page (or the CONN panel); sync starts automatically once linked.';

  return (
    <button
      className={`canvas-home-btn${streaming ? ' canvas-home-btn--on' : ''}`}
      onClick={toggle}
      title={title}
    >
      <span
        className="sync-dot"
        style={{ background: streaming ? (connected ? '#31d07a' : '#e0a020') : '#7a8699' }}
      />
      {streaming ? 'Sync · ON' : 'Sync · OFF'}
    </button>
  );
}
