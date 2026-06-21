/**
 * CameraPanel — manual control over the viewport camera plus a Render section.
 *
 * The common controls (focal length, min/max zoom distance) are always shown;
 * the rest of the lens/clip settings live behind an "Advanced" disclosure to
 * keep the panel light. Values are read live from the cameraBridge so they track
 * orbit/zoom, and written back as partial patches. Number inputs commit on Enter
 * /blur (NumberField), so typing never applies mid-keystroke.
 *
 * Render is a lightweight still/clip exporter. The engine choices (Eevee /
 * Cycles / Raycast) are presentational — there is no GPU path tracer here — but
 * Export produces a real PNG/JPEG of the current frame.
 */
import './CameraPanel.css';
import { useEffect, useState } from 'react';
import { bridge } from '@/viewport/cameraBridge';
import { downloadBlob } from '@/core/serialization/fileIO';
import NumberField from '@/features/ui/NumberField';

type State = {
  fov: number; focalLength: number; near: number; far: number;
  minDistance: number; maxDistance: number; distance: number;
};

// Matches the values set in SceneManager._init.
const DEFAULTS: State = {
  fov: 52, focalLength: 0, near: 0.1, far: 100,
  minDistance: 0.1, maxDistance: 25, distance: 0,
};

/** A label + numeric input + range slider, all driven by one number. */
function Field({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="cam-row">
      <div className="cam-row-head">
        <span>{label}</span>
        <span className="cam-row-val">
          <NumberField value={value} min={min} max={max} step={step} onCommit={onChange} />
          {unit && <em>{unit}</em>}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={Math.min(max, Math.max(min, value || 0))}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

const dataURLtoBlob = (url: string) => {
  const [head, body] = url.split(',');
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/png';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

export default function CameraPanel() {
  const [s, setS] = useState<State>(DEFAULTS);
  const [advanced, setAdvanced] = useState(false);

  // Render settings (local — engine/type are presentational, format/path drive export).
  const [location, setLocation] = useState('tetrobot');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [format, setFormat] = useState('png');
  const [engine, setEngine] = useState('eevee');
  const [note, setNote] = useState('');

  // Poll live state so the readout follows orbit/zoom while the panel is open.
  useEffect(() => {
    const read = () => { if (bridge.getCameraState) setS(bridge.getCameraState()); };
    read();
    const id = window.setInterval(read, 250);
    return () => window.clearInterval(id);
  }, []);

  const apply = (patch: Partial<State>) => {
    bridge.applyCameraState?.(patch);
    if (bridge.getCameraState) setS(bridge.getCameraState());
  };

  const reset = () => apply({
    fov: DEFAULTS.fov, near: DEFAULTS.near, far: DEFAULTS.far,
    minDistance: DEFAULTS.minDistance, maxDistance: DEFAULTS.maxDistance,
  });

  const onExport = () => {
    if (mediaType === 'video') {
      setNote('Video capture is not wired up yet — export a still for now.');
      return;
    }
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const url = bridge.captureImage?.(mime, 0.92);
    if (!url) { setNote('Viewport not ready.'); return; }
    downloadBlob(dataURLtoBlob(url), `${location || 'render'}.${format}`);
    setNote(`Exported ${location || 'render'}.${format}`);
  };

  if (!bridge.applyCameraState) {
    return <div className="cam-panel"><div className="cam-empty">Viewport not ready.</div></div>;
  }

  return (
    <div className="cam-panel">
      <div className="cam-section">LENS</div>
      <Field label="Focal length" value={s.focalLength} min={8} max={200} step={1}
        unit="mm" onChange={(v) => apply({ focalLength: v })} />

      <div className="cam-section">ZOOM</div>
      <Field label="Min distance" value={s.minDistance} min={0.1} max={20} step={0.1}
        unit="m" onChange={(v) => apply({ minDistance: v })} />
      <Field label="Max distance" value={s.maxDistance} min={5} max={200} step={1}
        unit="m" onChange={(v) => apply({ maxDistance: v })} />

      <button className="cam-disclosure" onClick={() => setAdvanced((a) => !a)}>
        <span className={`cam-caret ${advanced ? 'open' : ''}`}>▸</span> Advanced
      </button>
      {advanced && (
        <div className="cam-advanced">
          <Field label="Field of view" value={s.fov} min={10} max={120} step={1}
            unit="°" onChange={(v) => apply({ fov: v })} />
          <Field label="Distance" value={s.distance} min={s.minDistance} max={s.maxDistance} step={0.1}
            unit="m" onChange={(v) => apply({ distance: v })} />
          <Field label="Near clip" value={s.near} min={0.01} max={5} step={0.01}
            unit="m" onChange={(v) => apply({ near: v })} />
          <Field label="Far clip" value={s.far} min={10} max={500} step={1}
            unit="m" onChange={(v) => apply({ far: v })} />
        </div>
      )}

      <div className="cam-actions">
        <button onClick={() => bridge.fitCamera?.()}>Fit to model</button>
        <button onClick={reset}>Reset defaults</button>
      </div>

      <div className="cam-section">RENDER</div>
      <div className="cam-field">
        <span>Output name</span>
        <input className="cam-text" value={location}
          onChange={(e) => setLocation(e.target.value)} placeholder="filename" />
      </div>

      <div className="cam-seg">
        <button className={mediaType === 'image' ? 'on' : ''}
          onClick={() => { setMediaType('image'); setFormat('png'); }}>Image</button>
        <button className={mediaType === 'video' ? 'on' : ''}
          onClick={() => { setMediaType('video'); setFormat('mp4'); }}>Video</button>
      </div>

      <div className="cam-field">
        <span>Format</span>
        <select className="cam-sel" value={format} onChange={(e) => setFormat(e.target.value)}>
          {mediaType === 'image'
            ? [<option key="png" value="png">PNG</option>, <option key="jpg" value="jpg">JPEG</option>]
            : [<option key="mp4" value="mp4">MP4</option>, <option key="webm" value="webm">WEBM</option>]}
        </select>
      </div>

      <div className="cam-field">
        <span>Engine</span>
        <select className="cam-sel" value={engine} onChange={(e) => setEngine(e.target.value)}>
          <option value="eevee">Eevee (real-time)</option>
          <option value="cycles">Cycles (path-traced)</option>
          <option value="raycast">Raycast</option>
        </select>
      </div>

      <button className="cam-export" onClick={onExport}>Export</button>
      {note && <div className="cam-note">{note}</div>}
    </div>
  );
}
