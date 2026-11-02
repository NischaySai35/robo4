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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import './CameraPanel.css';
import { useEffect, useState } from 'react';
import { bridge } from '@/bridge/cameraBridge';
import { downloadBlob } from '@/core/serialization/fileIO';
import NumberField from '@/features/ui/NumberField';
import PropertyPane, { type PropDef } from '@/features/ui/PropertyPane';
import { scheduleFrame } from '@/runtime/frameScheduler';

type State = {
  fov: number; focalLength: number; near: number; far: number;
  minDistance: number; maxDistance: number; distance: number;
};

// Matches the values set in SceneManager._init.
const DEFAULTS: State = {
  fov: 52, focalLength: 0, near: 0.1, far: 100,
  minDistance: 0.1, maxDistance: 25, distance: 0,
};

// The lens and zoom settings, shown by the shared PropertyPane.
const LENS: PropDef[] = [
  { key: 'focalLength', label: 'Focal length', min: 8, max: 200, step: 1, unit: 'mm', folder: 'Lens' },
  { key: 'minDistance', label: 'Min distance', min: 0.001, max: 20, step: 0.001, unit: 'm', folder: 'Zoom' },
  { key: 'maxDistance', label: 'Max distance', min: 5, max: 200, step: 1, unit: 'm', folder: 'Zoom' },
  { key: 'fov', label: 'Field of view', min: 10, max: 120, step: 1, unit: '°', folder: 'Advanced', collapsed: true },
  { key: 'distance', label: 'Distance', min: 0.001, max: 200, step: 0.1, unit: 'm', folder: 'Advanced', collapsed: true },
  { key: 'near', label: 'Near clip', min: 0.01, max: 5, step: 0.01, unit: 'm', folder: 'Advanced', collapsed: true },
  { key: 'far', label: 'Far clip', min: 10, max: 500, step: 1, unit: 'm', folder: 'Advanced', collapsed: true },
];

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
    await new Promise((r) => scheduleFrame(r));
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
    <div className="cam-panel" data-ui="a">
      <PropertyPane props={LENS} values={s} onChange={(k, v) => apply({ [k]: v } as Partial<State>)} />

      <div className="cam-actions">
        <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => bridge.fitCamera?.()}>Fit to model</Button>
        <Button variant="outline" size="sm" className="tw:flex-1" onClick={reset}>Reset defaults</Button>
      </div>

      {/* ── RENDER ──────────────────────────────────────────────── */}
      <div className="cam-section">RENDER</div>

      <div className="cam-field">
        <span>Output name</span>
        <Input size="xs" className="tw:flex-1 tw:max-w-[60%]" value={outputName}
          onChange={(e) => setOutputName(e.target.value)} placeholder="filename" />
      </div>

      {/* Engine */}
      <div className="cam-sublabel">ENGINE</div>
      <Segmented value={engine} onChange={changeEngine}
        options={(['eevee', 'cycles', 'raycast'] as CamEngine[]).map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1), title: CAM_ENGINE_LABELS[e] }))} />
      <div className="cam-note-sm">{CAM_ENGINE_LABELS[engine]}</div>
      {engine === 'cycles' && (
        <>
          <div className="cam-compute-row">
            <span className="cam-sublabel" style={{ margin: 0 }}>COMPUTE</span>
            <Segmented className="tw:flex-1" value={compute} onChange={changeCompute} options={[
              { value: 'cpu', label: 'CPU', title: '2 bounces — lighter load, faster convergence' },
              { value: 'gpu', label: 'GPU', title: '5 bounces, MIS — full quality path tracing' }]} />
          </div>
          <div className="cam-compute-row">
            <span className="cam-sublabel" style={{ margin: 0 }}>MAX SAMPLES</span>
            <NumberField
              className="tw:w-20" value={maxSamples} min={1} max={1024} step={1}
              onCommit={changeMaxSamples}
            />
          </div>
        </>
      )}

      {/* Image / Video */}
      <div className="cam-sublabel">MODE</div>
      <Segmented value={mediaType} onChange={setMediaType} options={[{ value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }]} />

      {/* Format */}
      <div className="cam-sublabel">FORMAT</div>
      {mediaType === 'image' ? (
        <Segmented value={imgFmt} onChange={setImgFmt} options={[{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPEG' }]} />
      ) : (
        <Segmented value={vidFmt} onChange={setVidFmt} options={[{ value: 'webm', label: 'WebM' }, { value: 'mp4', label: 'MP4' }]} />
      )}

      {/* Resolution */}
      <div className="cam-sublabel">RESOLUTION</div>
      <Segmented value={resolution} onChange={setResolution}
        options={(['viewport', '1080p', '2k', '4k'] as CamRes[]).map((r) => ({ value: r, label: resLabel(r) }))} />

      <Button className="tw:mt-2 tw:w-full" onClick={onExport} disabled={busy}>
        {busy ? 'Rendering…' : mediaType === 'image' ? `⤓ Export ${imgFmt.toUpperCase()}` : '⏺ Video → Render tab'}
      </Button>
      {note && <div className="cam-note">{note}</div>}
    </div>
  );
}
