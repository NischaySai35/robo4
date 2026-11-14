/**
 * LiveCamera — the master's real camera in a small viewport window (Nischay 12 Nov 2026: "a small window with the camera
 * live, on/off button, default off; it starts the camera when on and stops it when off so it does not stress the board;
 * shows fps"). The master (ESP32-CAM) sends its pictures over USB; the laptop bridge serves them at master.local
 * (gos/python/gos/master_site.py: POST /api/cam?on=1|0, GET /api/cam/stream, /api/cam/status). Off = camera chip powered
 * down. The bridge also switches it off by itself when no window has watched for 15 s (tab closed, page reloaded).
 * REUSE-CHECKED: camera|webcam|stream|mjpeg -> features/camera/CameraPanel is the VIRTUAL viewport camera (lens, render);
 * cam_judge.py reads a camera in Python for the sim. Nothing showed a live picture in the Studio.
 */
import './LiveCamera.css';
import { useEffect, useRef, useState } from 'react';

const MASTER = 'http://127.0.5.1';

export default function LiveCamera() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fps, setFps] = useState(0);
  const [err, setErr] = useState('');
  const [nonce, setNonce] = useState(0);          // a new stream URL each time it is switched on
  const onRef = useRef(false);

  const set = async (want: boolean) => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${MASTER}/api/cam?on=${want ? 1 : 0}`, { method: 'POST', signal: AbortSignal.timeout(3000) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      onRef.current = want; setOn(want); if (want) setNonce((n) => n + 1); else setFps(0);
    } catch (e: any) {
      setErr(want ? `Camera did not start: ${e?.message || e}. Is the master plugged in?` : '');
      if (!want) { onRef.current = false; setOn(false); }
    }
    setBusy(false);
  };

  // fps from the bridge (what really arrives), twice a second, only while on
  useEffect(() => {
    if (!on) return;
    const t = setInterval(async () => {
      try { const j = await (await fetch(`${MASTER}/api/cam/status`, { cache: 'no-store' })).json(); setFps(j.fps ?? 0); }
      catch { setFps(0); }
    }, 500);
    return () => clearInterval(t);
  }, [on]);

  // leaving the Studio (tab closed, reload) switches it off; the bridge's 15 s watch is the backstop
  useEffect(() => {
    const off = () => { if (onRef.current) navigator.sendBeacon?.(`${MASTER}/api/cam?on=0`); };
    window.addEventListener('pagehide', off);
    return () => { window.removeEventListener('pagehide', off); off(); };
  }, []);

  return (
    <div className="live-cam" data-ui="a" data-testid="live-cam">
      {on && (
        <div className="live-cam-win">
          <img className="live-cam-img" src={`${MASTER}/api/cam/stream?n=${nonce}`} alt="master camera, live" />
          <span className={`live-cam-fps${fps < 2 ? ' live-cam-fps--low' : ''}`}>{fps.toFixed(1)} fps</span>
        </div>
      )}
      {err && <div className="live-cam-err">{err}</div>}
      <button className={`live-cam-btn${on ? ' live-cam-btn--on' : ''}`} disabled={busy} onClick={() => set(!on)}
        title={on ? 'Turn the master camera off' : 'Turn the master camera on (live picture)'}>
        <span className="live-cam-dot" aria-hidden /> {busy ? '…' : on ? 'CAM LIVE · ON' : 'CAM LIVE · OFF'}
      </button>
    </div>
  );
}
