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

type CamEngine = 'eevee' | 'cycles' | 'raycast';
type CamRes    = 'viewport' | '1080p' | '2k' | '4k';

const CAM_RES_PRESETS: Record<CamRes, [number, number] | null> = {
  viewport: null,
  '1080p':  [1920, 1080],
  '2k':     [2560, 1440],
  '4k':     [3840, 2160],
};

const CAM_ENGINE_LABELS: Record<CamEngine, string> = {
  eevee:   'Eevee — GPU rasterization, single pass/frame. PCFSoft shadows, ACES tone map, bloom. Always 60fps.',
  cycles:  'Cycles — BVH path tracer. Builds acceleration tree, accumulates samples. Starts noisy → converges. Camera move resets.',
  raycast: 'Raycast — BasicShadowMap: one hard binary shadow ray per pixel. Crisp edges. Cineon tone curve.',
};

export default function CameraPanel() {
  const [s, setS] = useState<State>(DEFAULTS);
  const [advanced, setAdvanced] = useState(false);

  const [outputName, setOutputName] = useState('tetrobot');
  const [mediaType,  setMediaType]  = useState<'image' | 'video'>('image');
  const [imgFmt,     setImgFmt]     = useState<'png' | 'jpg'>('png');
  const [vidFmt,     setVidFmt]     = useState<'webm' | 'mp4'>('webm');
  const [engine,     setEngineState] = useState<CamEngine>(
    () => (bridge.getRenderEngine?.() as CamEngine) ?? 'eevee'
  );
  const [compute,    setComputeState] = useState<'cpu'|'gpu'>(() => bridge.getComputeDevice?.() ?? 'gpu');
  const [maxSamples, setMaxSamplesState] = useState<number>(() => bridge.getMaxSamples?.() ?? 32);
  const [resolution, setResolution] = useState<CamRes>('viewport');
  const [note,       setNote]       = useState('');
  const [busy,       setBusy]       = useState(false);

  useEffect(() => {
    const read = () => {
      if (bridge.getCameraState) setS(bridge.getCameraState());
      const eng = bridge.getRenderEngine?.() as CamEngine | undefined;
      if (eng) setEngineState((e) => (e !== eng ? eng : e));
    };
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

  const changeEngine = (e: CamEngine) => {
    setEngineState(e);
    bridge.setRenderEngine?.(e);
  };

  const changeCompute = (d: 'cpu' | 'gpu') => {
    setComputeState(d);
    bridge.setComputeDevice?.(d);
  };

  const changeMaxSamples = (v: number) => {
    const n = Math.max(1, Math.min(1024, Math.round(v)));
    setMaxSamplesState(n);
    bridge.setMaxSamples?.(n);
  };

  const applyRes = () => {
    const p = CAM_RES_PRESETS[resolution];
    if (p) bridge.setRenderResolution?.(p[0], p[1]);
  };
  const resetRes = () => {
    if (CAM_RES_PRESETS[resolution]) bridge.resetRenderResolution?.();
  };

  const onExport = async () => {
    if (mediaType === 'video') {
      setNote('For video export use the Animation → Render tab.');
      return;
    }
    setBusy(true); setNote('Rendering…');
    applyRes();
    await new Promise((r) => requestAnimationFrame(r));
    const mime = imgFmt === 'jpg' ? 'image/jpeg' : 'image/png';
    const url = bridge.captureImage?.(mime, 0.95);
    resetRes();
    if (!url) { setNote('Viewport not ready.'); setBusy(false); return; }
    downloadBlob(dataURLtoBlob(url), `${outputName || 'render'}.${imgFmt}`);
    setNote(`Saved ${outputName || 'render'}.${imgFmt}`);
    setBusy(false);
  };

  if (!bridge.applyCameraState) {
    return <div className="cam-panel"><div className="cam-empty">Viewport not ready.</div></div>;
  }

  const resLabel = (r: CamRes) => {
    const p = CAM_RES_PRESETS[r];
    return r === 'viewport' ? 'Viewport' : p ? `${p[0]}×${p[1]}` : r.toUpperCase();
  };

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

      {/* ── RENDER ──────────────────────────────────────────────── */}
      <div className="cam-section">RENDER</div>

      <div className="cam-field">
        <span>Output name</span>
        <input className="cam-text" value={outputName}
          onChange={(e) => setOutputName(e.target.value)} placeholder="filename" />
      </div>

      {/* Engine */}
      <div className="cam-sublabel">ENGINE</div>
      <div className="cam-seg4">
        {(['eevee', 'cycles', 'raycast'] as CamEngine[]).map((e) => (
          <button key={e} className={engine === e ? 'on' : ''} onClick={() => changeEngine(e)}
            title={CAM_ENGINE_LABELS[e]}>
            {e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>
      <div className="cam-note-sm">{CAM_ENGINE_LABELS[engine]}</div>
      {engine === 'cycles' && (
        <>
          <div className="cam-compute-row">
            <span className="cam-sublabel" style={{ margin: 0 }}>COMPUTE</span>
            <div className="cam-seg" style={{ flex: 1 }}>
              <button className={compute === 'cpu' ? 'on' : ''} onClick={() => changeCompute('cpu')}
                title="2 bounces — lighter load, faster convergence">CPU</button>
              <button className={compute === 'gpu' ? 'on' : ''} onClick={() => changeCompute('gpu')}
                title="5 bounces, MIS — full quality path tracing">GPU</button>
            </div>
          </div>
          <div className="cam-compute-row">
            <span className="cam-sublabel" style={{ margin: 0 }}>MAX SAMPLES</span>
            <NumberField
              value={maxSamples} min={1} max={1024} step={1}
              onCommit={changeMaxSamples}
            />
          </div>
        </>
      )}

      {/* Image / Video */}
      <div className="cam-sublabel">MODE</div>
      <div className="cam-seg">
        <button className={mediaType === 'image' ? 'on' : ''} onClick={() => setMediaType('image')}>Image</button>
        <button className={mediaType === 'video' ? 'on' : ''} onClick={() => setMediaType('video')}>Video</button>
      </div>

      {/* Format */}
      <div className="cam-sublabel">FORMAT</div>
      {mediaType === 'image' ? (
        <div className="cam-seg">
          <button className={imgFmt === 'png' ? 'on' : ''} onClick={() => setImgFmt('png')}>PNG</button>
          <button className={imgFmt === 'jpg' ? 'on' : ''} onClick={() => setImgFmt('jpg')}>JPEG</button>
        </div>
      ) : (
        <div className="cam-seg">
          <button className={vidFmt === 'webm' ? 'on' : ''} onClick={() => setVidFmt('webm')}>WebM</button>
          <button className={vidFmt === 'mp4' ? 'on' : ''} onClick={() => setVidFmt('mp4')}>MP4</button>
        </div>
      )}

      {/* Resolution */}
      <div className="cam-sublabel">RESOLUTION</div>
      <div className="cam-seg4">
        {(['viewport', '1080p', '2k', '4k'] as CamRes[]).map((r) => (
          <button key={r} className={resolution === r ? 'on' : ''} onClick={() => setResolution(r)}>
            {resLabel(r)}
          </button>
        ))}
      </div>

      <button className="cam-export" onClick={onExport} disabled={busy}>
        {busy ? 'Rendering…' : mediaType === 'image' ? `⤓ Export ${imgFmt.toUpperCase()}` : '⏺ Video → Render tab'}
      </button>
      {note && <div className="cam-note">{note}</div>}
    </div>
  );
}
