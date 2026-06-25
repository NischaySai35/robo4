/**
 * Timeline — the animation studio. ANIMATION tab: manage multiple clips (ani1, ani2…),
 * keyframe joint poses, scrub, play a single clip (loops) or the whole sequence, with
 * fps + snapping. RENDER tab: capture stills / settings for exporting the animation.
 * Playback is non-destructive (sampled pose via FK).
 */
import { useState, useRef } from 'react';
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

type RenderMode = 'still' | 'video';
type StillFmt  = 'png' | 'jpeg';
type VideoFmt  = 'webm' | 'pngseq';
type Quality   = 1 | 2 | 4;

function RenderTab() {
  const animFps      = useAnimationStore((s) => s.fps);
  const animDuration = useAnimationStore((s) => s.duration);

  const [mode,       setMode]       = useState<RenderMode>('still');
  const [stillFmt,   setStillFmt]   = useState<StillFmt>('png');
  const [videoFmt,   setVideoFmt]   = useState<VideoFmt>('webm');
  const [quality,    setQuality]    = useState<Quality>(1);
  const [outputName, setOutputName] = useState('tetrobot');
  const [startTime,  setStartTime]  = useState(0);
  const [endTime,    setEndTime]    = useState(animDuration);
  const [busy,       setBusy]       = useState(false);
  const [progress,   setProgress]   = useState('');
  const abortRef = useRef(false);

  // Keep endTime in sync if animation duration changes and user hasn't touched it.
  const endTimeRef = useRef(animDuration);
  if (animDuration !== endTimeRef.current) {
    endTimeRef.current = animDuration;
    setEndTime(animDuration);
  }

  const clampEnd   = Math.min(endTime, animDuration);
  const renderDur  = Math.max(0.1, clampEnd - startTime);
  const totalFrames = Math.round(renderDur * animFps);

  // ── Still ─────────────────────────────────────────────────────────────────
  const exportStill = () => {
    bridge.setRenderScale?.(quality);
    const mime = stillFmt === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext  = stillFmt;
    const url  = bridge.captureImage?.(mime, 0.95);
    bridge.setRenderScale?.(1);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `${outputName}.${ext}`; a.click();
  };

  // ── WebM video via MediaRecorder + captureStream ───────────────────────────
  const exportWebm = async () => {
    const stream = bridge.captureStream?.();
    if (!stream) { setProgress('captureStream not available — reload the page.'); return; }

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
    if (!mime) { setProgress('WebM MediaRecorder not supported in this browser.'); return; }

    setBusy(true); abortRef.current = false;
    setProgress('Recording…');
    bridge.setRenderScale?.(quality);

    const anim = useAnimationStore.getState();
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.start(200);
      anim.setPlayhead(startTime);
      anim.play();

      const poll = setInterval(() => {
        const st = useAnimationStore.getState();
        const elapsed = st.playhead - startTime;
        const pct = Math.min(100, Math.round((elapsed / renderDur) * 100));
        setProgress(`Recording… ${pct}%`);
        if (abortRef.current || st.playhead >= clampEnd || !st.playing) {
          clearInterval(poll);
          anim.stop();
          if (recorder.state === 'recording') recorder.stop();
        }
      }, 100);

      // Hard timeout safety
      setTimeout(() => {
        if (recorder.state === 'recording') { clearInterval(poll); anim.stop(); recorder.stop(); }
      }, (renderDur + 3) * 1000);
    });

    bridge.setRenderScale?.(1);
    if (!abortRef.current) {
      const blob = new Blob(chunks, { type: mime });
      downloadBlob(blob, `${outputName}.webm`);
      setProgress(`Done — ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
    } else {
      setProgress('Cancelled.');
    }
    setBusy(false);
  };

  // ── PNG sequence ───────────────────────────────────────────────────────────
  const exportPngSeq = async () => {
    const anim = useAnimationStore.getState();
    if (!anim.clips.some((c) => Object.keys(c.tracks).length)) {
      setProgress('No keyframes to render.'); return;
    }
    setBusy(true); abortRef.current = false;
    bridge.setRenderScale?.(quality);

    const n = totalFrames;
    for (let i = 0; i <= n && !abortRef.current; i++) {
      const t = startTime + (i / n) * renderDur;
      anim.setPlayhead(t);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const url = bridge.captureImage?.('image/png', 1.0);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${outputName}_${String(i).padStart(4, '0')}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 40)); // throttle downloads
      }
      setProgress(`Frame ${i + 1} / ${n + 1}`);
    }
    anim.stop();
    bridge.setRenderScale?.(1);
    setProgress(abortRef.current ? 'Cancelled.' : 'Done.');
    setBusy(false);
  };

  const doExport = () => {
    if (mode === 'still') { exportStill(); return; }
    if (videoFmt === 'webm') { exportWebm(); }
    else { exportPngSeq(); }
  };

  const webmSupported = typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') || MediaRecorder.isTypeSupported('video/webm'));

  return (
    <div className="tl-body">
      <div className="tl-section">OUTPUT</div>
      <label className="tl-field">
        <span>Name</span>
        <input className="tl-input" value={outputName} onChange={(e) => setOutputName(e.target.value)} />
      </label>

      <div className="tl-section">MODE</div>
      <div className="tl-toggle2">
        <button className={mode === 'still' ? 'on' : ''} onClick={() => setMode('still')}>Image</button>
        <button className={mode === 'video' ? 'on' : ''} onClick={() => setMode('video')}>Video</button>
      </div>

      {mode === 'still' && (
        <>
          <div className="tl-section">FORMAT</div>
          <div className="tl-toggle2">
            <button className={stillFmt === 'png'  ? 'on' : ''} onClick={() => setStillFmt('png')}>PNG</button>
            <button className={stillFmt === 'jpeg' ? 'on' : ''} onClick={() => setStillFmt('jpeg')}>JPEG</button>
          </div>
        </>
      )}

      {mode === 'video' && (
        <>
          <div className="tl-section">FORMAT</div>
          <div className="tl-toggle2">
            <button className={videoFmt === 'webm'   ? 'on' : ''} onClick={() => setVideoFmt('webm')}>
              WebM{!webmSupported ? ' ✗' : ''}
            </button>
            <button className={videoFmt === 'pngseq' ? 'on' : ''} onClick={() => setVideoFmt('pngseq')}>PNG Seq</button>
          </div>
          {videoFmt === 'webm' && !webmSupported && (
            <div className="tl-warn">WebM not supported in this browser — use PNG Sequence.</div>
          )}
          {videoFmt === 'webm' && webmSupported && (
            <div className="tl-hint">Real-time capture via MediaRecorder. Plays and records at the same time.</div>
          )}
          {videoFmt === 'pngseq' && (
            <div className="tl-hint">Downloads each frame as a numbered PNG. Import in Blender / DaVinci / Premiere.</div>
          )}

          <div className="tl-section">TIME RANGE</div>
          <div className="tl-field-row">
            <label className="tl-field">
              <span>Start (s)</span>
              <input className="tl-input" type="number" min={0} max={animDuration} step={0.1}
                value={startTime} onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))} />
            </label>
            <label className="tl-field">
              <span>End (s)</span>
              <input className="tl-input" type="number" min={0} max={animDuration} step={0.1}
                value={endTime} onChange={(e) => setEndTime(Math.min(animDuration, parseFloat(e.target.value) || animDuration))} />
            </label>
          </div>
        </>
      )}

      <div className="tl-section">QUALITY</div>
      <div className="tl-toggle3">
        {([1, 2, 4] as Quality[]).map((q) => (
          <button key={q} className={quality === q ? 'on' : ''} onClick={() => setQuality(q)}>{q}×</button>
        ))}
      </div>

      <div className="tl-section">INFO</div>
      <div className="tl-settings">
        {mode === 'video' && <>
          <div className="tl-row2"><span>Frames</span><strong>{totalFrames} @ {animFps} fps</strong></div>
          <div className="tl-row2"><span>Duration</span><strong>{renderDur.toFixed(1)}s</strong></div>
        </>}
        <div className="tl-row2"><span>Resolution</span><strong>{quality}× viewport</strong></div>
        <div className="tl-row2"><span>Format</span>
          <strong>{mode === 'still' ? stillFmt.toUpperCase() : videoFmt === 'webm' ? 'WebM (VP9)' : 'PNG Sequence'}</strong>
        </div>
      </div>

      {progress && <div className="tl-progress">{progress}</div>}

      <div className="tl-render-row">
        <button className="tl-render" onClick={doExport} disabled={busy || (mode === 'video' && videoFmt === 'webm' && !webmSupported)}>
          {busy ? progress || 'Working…' : mode === 'still' ? `⤓ Export ${stillFmt.toUpperCase()}` : videoFmt === 'webm' ? '⏺ Record WebM' : '⤓ Export PNG Sequence'}
        </button>
        {busy && (
          <button className="tl-cancel" onClick={() => { abortRef.current = true; }}>✕</button>
        )}
      </div>
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
