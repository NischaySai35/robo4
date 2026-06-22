/**
 * Timeline — the animation studio. ANIMATION tab: manage multiple clips (ani1, ani2…),
 * keyframe joint poses, scrub, play a single clip (loops) or the whole sequence, with
 * fps + snapping. RENDER tab: capture stills / settings for exporting the animation.
 * Playback is non-destructive (sampled pose via FK).
 */
import { useState } from 'react';
import './Timeline.css';
import { useAnimationStore } from '@/state/animationStore';
import { useModelStore } from '@/state/modelStore';
import { bridge } from '@/viewport/cameraBridge';
import { downloadBlob } from '@/core/serialization/fileIO';

function AnimationTab() {
  const a = useAnimationStore();
  const nJoints = Object.keys(useModelStore((s) => s.doc).joints).length;
  const keyTimes = useAnimationStore((s) => s.keyTimes)();

  const addKey = () => {
    const doc = useModelStore.getState().doc;
    const vals: Record<string, number> = {};
    for (const j of Object.values(doc.joints)) vals[j.id] = j.state?.value ?? 0;
    if (Object.keys(vals).length) a.addKeyframe(vals);
  };
  const rename = (id: string, cur: string) => {
    const name = window.prompt('Clip name', cur);
    if (name) a.renameClip(id, name.trim());
  };

  return (
    <div className="tl-body">
      {/* Clips */}
      <div className="tl-section">CLIPS · played top → bottom in sequence</div>
      <div className="tl-clips">
        {a.clips.map((c, i) => (
          <div key={c.id} className={`tl-clip ${c.id === a.activeClipId ? 'active' : ''}`} onClick={() => a.selectClip(c.id)}>
            <span className="tl-clip-idx">{i + 1}</span>
            <span className="tl-clip-name" onDoubleClick={() => rename(c.id, c.name)} title="Double-click to rename">{c.name}</span>
            <span className="tl-clip-meta">{Object.keys(c.tracks).length ? `${new Set(Object.values(c.tracks).flatMap((k) => k.map((x) => x.t))).size}k · ${c.duration}s` : 'empty'}</span>
            <span className="tl-clip-ops">
              <button onClick={(e) => { e.stopPropagation(); a.reorderClip(c.id, -1); }} disabled={i === 0} title="Move up">▲</button>
              <button onClick={(e) => { e.stopPropagation(); a.reorderClip(c.id, 1); }} disabled={i === a.clips.length - 1} title="Move down">▼</button>
              <button onClick={(e) => { e.stopPropagation(); a.deleteClip(c.id); }} disabled={a.clips.length <= 1} title="Delete clip">✕</button>
            </span>
          </div>
        ))}
        <button className="tl-addclip" onClick={() => a.addClip()}>＋ Add clip</button>
      </div>

      {/* Transport */}
      <div className="tl-section">TRANSPORT</div>
      <div className="tl-controls">
        <button onClick={() => (a.playing ? a.pause() : a.play())} title="Play / pause this clip (loops)">{a.playing && !a.sequence ? '⏸' : '▶'}</button>
        <button onClick={() => a.playAll()} title="Play all clips in order">⏭ All</button>
        <button onClick={() => a.stop()} title="Stop">⏹</button>
        <button className="tl-key" onClick={addKey} disabled={nJoints === 0} title="Keyframe current joint values at the playhead">◆ Key</button>
      </div>

      {/* Scrubber + keyframe ruler */}
      <div className="tl-ruler">
        {keyTimes.map((t) => (
          <span key={t} className="tl-tick" style={{ left: `${(t / a.duration) * 100}%` }}
            title={`${t.toFixed(2)}s — click: jump · right-click: delete`}
            onClick={() => a.setPlayhead(t)}
            onContextMenu={(e) => { e.preventDefault(); a.deleteKeyAt(t); }} />
        ))}
        <span className="tl-playmark" style={{ left: `${(a.playhead / a.duration) * 100}%` }} />
      </div>
      <div className="tl-scrub">
        <input type="range" min={0} max={a.duration} step={1 / a.fps} value={a.playhead}
          onChange={(e) => a.setPlayhead(parseFloat(e.target.value))} />
        <span className="tl-time">{a.playhead.toFixed(2)} / {a.duration}s</span>
      </div>

      {/* Settings */}
      <div className="tl-section">SETTINGS</div>
      <div className="tl-settings">
        <label>Duration (s)
          <input type="number" min={0.5} step={1} value={a.duration} onChange={(e) => a.setDuration(parseFloat(e.target.value) || 1)} />
        </label>
        <label>FPS
          <input type="number" min={1} max={120} step={1} value={a.fps} onChange={(e) => a.setFps(parseInt(e.target.value) || 30)} />
        </label>
        <label className="tl-snap">
          <input type="checkbox" checked={a.snap} onChange={() => a.toggleSnap()} /> Snap to fps grid
        </label>
        <button className="tl-clear" onClick={() => a.clear()} disabled={keyTimes.length === 0}>Clear keys</button>
      </div>

      {nJoints > 0 && keyTimes.length === 0 && (
        <div className="tl-hint">Pose the joints in the viewport, move the playhead, then ◆ Key to record. Add more clips and reorder them to choreograph a sequence.</div>
      )}
    </div>
  );
}

function RenderTab() {
  const fps = useAnimationStore((s) => s.fps);
  const duration = useAnimationStore((s) => s.duration);
  const [busy, setBusy] = useState(false);

  const captureStill = () => {
    const url = bridge.captureImage?.('image/png', 0.95);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `tetrobot-frame.png`; a.click();
  };

  // Render the active clip to a PNG sequence (zipped would need a lib; here each frame
  // downloads is noisy — instead we capture into a single contact-sheet-free flow:
  // step the clip, capture frames, and download the FIRST + report count). Kept light.
  const renderSequence = async () => {
    const anim = useAnimationStore.getState();
    if (!anim.clips.some((c) => Object.keys(c.tracks).length)) { alert('No keyframes to render yet.'); return; }
    setBusy(true);
    const frames: string[] = [];
    const n = Math.max(1, Math.round(duration * fps));
    for (let i = 0; i <= n; i++) {
      anim.setPlayhead((i / n) * duration);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // let it render
      const url = bridge.captureImage?.('image/jpeg', 0.8);
      if (url) frames.push(url);
    }
    anim.stop();
    // bundle as a simple JSON manifest of data-URLs (a real MP4/zip needs a worker lib)
    downloadBlob(new Blob([JSON.stringify({ fps, frames })], { type: 'application/json' }), 'tetrobot-render.frames.json');
    setBusy(false);
  };

  return (
    <div className="tl-body">
      <div className="tl-section">RENDER</div>
      <div className="tl-settings">
        <div className="tl-row2"><span>Frames</span><strong>{Math.round(duration * fps)} @ {fps} fps</strong></div>
        <div className="tl-row2"><span>Length</span><strong>{duration}s</strong></div>
      </div>
      <div className="tl-controls">
        <button onClick={captureStill}>📷 Capture still (PNG)</button>
      </div>
      <button className="tl-render" onClick={renderSequence} disabled={busy}>{busy ? 'Rendering…' : '⤓ Render frame sequence'}</button>
      <div className="tl-hint">Captures every frame of the active clip at the chosen fps and downloads them as a frame bundle. (MP4/GIF muxing is a planned follow-up — needs an encoder worker.)</div>
    </div>
  );
}

const TABS = [
  { id: 'animation', label: 'Animation' },
  { id: 'render', label: 'Render' },
] as const;

export default function Timeline() {
  const [tab, setTab] = useState<'animation' | 'render'>('animation');
  return (
    <div className="tl-panel">
      <div className="tl-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'animation' ? <AnimationTab /> : <RenderTab />}
    </div>
  );
}
