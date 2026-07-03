/**
 * Timeline — the animation studio. ANIMATION tab: manage multiple clips (ani1, ani2…),
 * keyframe joint poses, scrub, play a single clip (loops) or the whole sequence, with
 * fps + snapping. RENDER tab: capture stills / settings for exporting the animation.
 * Playback is non-destructive (sampled pose via FK).
 */
import { useState, useRef, useEffect } from 'react';
import './Timeline.css';

/** Number input that lets you type freely (backspace, clear, retype) and only
 *  commits — parse + clamp — on Enter or blur, instead of re-clamping every
 *  keystroke (which made "4" → backspace → "1", and typing "10" → "110"). */
function CommitNumber({ value, onCommit, min, max, step, int }: {
  value: number; onCommit: (v: number) => void; min?: number; max?: number; step?: number; int?: boolean;
}) {
  const [buf, setBuf] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setBuf(String(value)); }, [value, editing]);
  const commit = () => {
    setEditing(false);
    let v = int ? parseInt(buf, 10) : parseFloat(buf);
    if (isNaN(v)) { setBuf(String(value)); return; } // empty/garbage → revert
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    setBuf(String(v));
    if (v !== value) onCommit(v);
  };
  return (
    <input
      type="number" min={min} max={max} step={step} value={buf}
      onFocus={() => setEditing(true)}
      onChange={(e) => setBuf(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') e.currentTarget.blur();      // commit
        else if (e.key === 'Escape') { setBuf(String(value)); setEditing(false); e.currentTarget.blur(); }
      }}
    />
  );
}
import { useAnimationStore, type ClipGroup } from '@/state/animationStore';
import { useModelStore } from '@/state/modelStore';
import { bridge } from '@/viewport/cameraBridge';
import { downloadBlob } from '@/core/serialization/fileIO';

// ── Clip Groups Panel ──────────────────────────────────────────────────────────
function GroupsPanel({ clips, groups, playingGroupId }: {
  clips: any[];
  groups: ClipGroup[];
  playingGroupId: string | null;
}) {
  const store = useAnimationStore.getState;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<{ groupId: string; from: number } | null>(null);
  const [dropOver,  setDropOver]  = useState<{ groupId: string; to: number } | null>(null);

  const toggle = (gid: string) => setExpanded((s) => {
    const n = new Set(s); n.has(gid) ? n.delete(gid) : n.add(gid); return n;
  });

  const renameGroup = (g: ClipGroup) => {
    const name = window.prompt('Group name', g.name);
    if (name) store().renameGroup(g.id, name.trim());
  };

  const clipName = (clipId: string) => clips.find((c) => c.id === clipId)?.name ?? clipId;

  return (
    <div className="tl-groups-wrap">
      <div className="tl-section tl-groups-hdr">
        GROUPS
        <button className="tl-addclip tl-addclip--inline" onClick={() => { store().addGroup(); }}>＋ New</button>
      </div>

      {groups.length === 0 && (
        <div className="tl-groups-empty">No groups yet. Create one and drag clips into it to sequence them with delays.</div>
      )}

      {groups.map((g) => {
        const isExpanded = expanded.has(g.id);
        const isPlaying  = playingGroupId === g.id;

        return (
          <div key={g.id} className={`tl-group${isPlaying ? ' tl-group--playing' : ''}`}>
            {/* Group header */}
            <div className="tl-group-hdr">
              <button className="tl-group-chevron" onClick={() => toggle(g.id)}>
                {isExpanded ? '▼' : '▶'}
              </button>
              <span className="tl-group-name" onDoubleClick={() => renameGroup(g)} title="Double-click to rename">
                {g.name}
              </span>
              <span className="tl-group-meta">{g.entries.length} clip{g.entries.length !== 1 ? 's' : ''}</span>
              <div className="tl-group-ops">
                <button title="Rename group" onClick={() => renameGroup(g)}>✎</button>
                <button
                  title={isPlaying ? 'Playing…' : 'Play this group'}
                  className={isPlaying ? 'tl-group-playing-btn' : ''}
                  onClick={() => store().playGroup(g.id)}
                  disabled={g.entries.length === 0}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button title="Delete group" onClick={() => store().deleteGroup(g.id)}>✕</button>
              </div>
            </div>

            {/* Clip drop zone (even when collapsed, allow dropping) */}
            <div
              className={`tl-group-dropzone${!isExpanded ? ' tl-group-dropzone--collapsed' : ''}`}
              onDragOver={(e) => { e.preventDefault(); if (!dragging) setDropOver({ groupId: g.id, to: g.entries.length }); }}
              onDragLeave={() => setDropOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                const clipId = e.dataTransfer.getData('clipId');
                if (clipId) store().addClipToGroup(g.id, clipId);
                setDropOver(null);
              }}
            >
              {!isExpanded && g.entries.length === 0 && (
                <span className="tl-group-drop-hint">drop clips here</span>
              )}
            </div>

            {/* Entries */}
            {isExpanded && (
              <div className="tl-group-entries"
                onDragOver={(e) => { e.preventDefault(); if (!dragging) setDropOver({ groupId: g.id, to: g.entries.length }); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const clipId = e.dataTransfer.getData('clipId');
                  if (clipId && !dragging) store().addClipToGroup(g.id, clipId);
                  setDropOver(null);
                }}
              >
                {g.entries.length === 0 && (
                  <div className="tl-group-drop-hint tl-group-drop-hint--padded">
                    Drag clips from the CLIPS list above into this group.
                  </div>
                )}
                {g.entries.map((entry, idx) => {
                  const isOver = dropOver?.groupId === g.id && dropOver?.to === idx;
                  return (
                    <div key={idx}>
                      {isOver && <div className="tl-entry-drop-line" />}
                      <div
                        className={`tl-entry${dragging?.groupId === g.id && dragging?.from === idx ? ' tl-entry--dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          setDragging({ groupId: g.id, from: idx });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropOver({ groupId: g.id, to: idx }); }}
                        onDragLeave={() => setDropOver(null)}
                        onDrop={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          const clipId = e.dataTransfer.getData('clipId');
                          if (dragging && dragging.groupId === g.id) {
                            store().reorderGroupEntry(g.id, dragging.from, idx); // reorder within group
                          } else if (clipId) {
                            store().addClipToGroup(g.id, clipId); // a clip dragged in from the CLIPS list
                          }
                          setDragging(null); setDropOver(null);
                        }}
                        onDragEnd={() => { setDragging(null); setDropOver(null); }}
                      >
                        <span className="tl-entry-grip">⋮⋮</span>
                        <span className="tl-entry-name">{clipName(entry.clipId)}</span>
                        <label className="tl-entry-delay" title="Delay before this clip starts (seconds)">
                          delay
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={entry.delayBefore}
                            onChange={(e) => store().setGroupEntryDelay(g.id, idx, parseFloat(e.target.value) || 0)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          s
                        </label>
                        <button
                          className="tl-entry-remove"
                          title="Remove from group"
                          onClick={() => store().removeClipFromGroup(g.id, idx)}
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnimationTab() {
  const a = useAnimationStore();
  const nJoints = Object.keys(useModelStore((s) => s.doc).joints).length;
  const keyTimes = useAnimationStore((s) => s.keyTimes)();
  const [clipDragOver, setClipDragOver] = useState<number | null>(null);

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
          <div key={c.id} className={`tl-clip ${c.id === a.activeClipId ? 'active' : ''}${clipDragOver === i ? ' tl-clip--dropover' : ''}`}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('clipId', c.id); e.dataTransfer.effectAllowed = 'copyMove'; }}
            onDragOver={(e) => { e.preventDefault(); setClipDragOver(i); }}
            onDragLeave={() => setClipDragOver((v) => (v === i ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              const clipId = e.dataTransfer.getData('clipId');
              if (clipId && clipId !== c.id) a.moveClipToIndex(clipId, i); // drag to reorder the list
              setClipDragOver(null);
            }}
            onDragEnd={() => setClipDragOver(null)}
            onClick={() => a.selectClip(c.id)}
            title="Click to select · drag to reorder · drag onto a group to add"
          >
            <span className="tl-entry-grip" title="Drag to reorder">⋮⋮</span>
            <span className="tl-clip-idx">{i + 1}</span>
            <span className="tl-clip-name" onDoubleClick={() => rename(c.id, c.name)} title="Double-click to rename">{c.name}</span>
            <span className="tl-clip-meta">{Object.keys(c.tracks).length ? `${new Set(Object.values(c.tracks).flatMap((k) => k.map((x) => x.t))).size}k · ${c.duration}s` : 'empty'}</span>
            <span className="tl-clip-ops">
              <button onClick={(e) => { e.stopPropagation(); rename(c.id, c.name); }} title="Rename clip">✎</button>
              <button onClick={(e) => { e.stopPropagation(); a.deleteClip(c.id); }} disabled={a.clips.length <= 1} title="Delete clip">✕</button>
            </span>
          </div>
        ))}
        <button className="tl-addclip" onClick={() => a.addClip()}>＋ Add clip</button>
        <div className="tl-hint">◆ Key records into the <strong>selected</strong> clip automatically (its key count shows on the right). Ctrl+S saves every clip, key and group into your .nischay file.</div>
      </div>

      {/* Groups */}
      <GroupsPanel clips={a.clips} groups={a.groups} playingGroupId={a.playingGroupId} />

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
          <CommitNumber value={a.duration} min={0.5} step={1} onCommit={(v) => a.setDuration(v)} />
        </label>
        <label>FPS
          <CommitNumber value={a.fps} min={1} max={120} step={1} int onCommit={(v) => a.setFps(v)} />
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

type RenderMode  = 'still' | 'video';
type StillFmt    = 'png' | 'jpeg';
type VideoFmt    = 'webm' | 'mp4' | 'pngseq';
type Resolution  = 'viewport' | '720p' | '1080p' | '2k' | '4k';
type RenderFps   = 12 | 24 | 30 | 60;
type Engine      = 'eevee' | 'cycles' | 'raycast';

const RES_PRESETS: Record<Resolution, [number, number] | null> = {
  viewport: null,
  '720p':   [1280,  720],
  '1080p':  [1920, 1080],
  '2k':     [2560, 1440],
  '4k':     [3840, 2160],
};

const ENGINE_HINTS: Record<Engine, string> = {
  eevee:   'Rasterization — one render pass per frame, always 60fps. PCFSoft shadow kernel → soft penumbra. ACES tone map + bloom. No GI.',
  cycles:  'BVH path tracer — builds acceleration structure, then accumulates samples each frame. Starts noisy, converges clean over ~200 samples. Camera move resets. GPU mode: 4 samples × 8 bounces per frame.',
  raycast: 'Hard shadow rays — BasicShadowMap casts one binary ray per shadow texel (no blur filter). Crisp pixel-edge shadows. Cineon tone curve.',
};

function RenderTab() {
  const animFps      = useAnimationStore((s) => s.fps);
  const animDuration = useAnimationStore((s) => s.duration);

  const [engine,     setEngineState] = useState<Engine>(() => (bridge.getRenderEngine?.() as Engine) ?? 'eevee');
  const [ptSamples,  setPtSamples]   = useState(0);
  const [compute,    setComputeState] = useState<'cpu'|'gpu'>(() => bridge.getComputeDevice?.() ?? 'gpu');
  const [mode,       setMode]        = useState<RenderMode>('still');
  const [stillFmt,   setStillFmt]    = useState<StillFmt>('png');
  const [videoFmt,   setVideoFmt]    = useState<VideoFmt>('webm');
  const [resolution, setResolution]  = useState<Resolution>('viewport');
  const [renderFps,  setRenderFps]   = useState<RenderFps>(30);
  const [outputName, setOutputName]  = useState('tetrobot');
  const [startTime,  setStartTime]   = useState(0);
  const [endTime,    setEndTime]     = useState(animDuration);
  const [busy,       setBusy]        = useState(false);
  const [progress,   setProgress]    = useState('');
  const abortRef = useRef(false);

  const endTimeRef = useRef(animDuration);
  if (animDuration !== endTimeRef.current) {
    endTimeRef.current = animDuration;
    setEndTime(animDuration);
  }

  const clampEnd    = Math.min(endTime, animDuration);
  const renderDur   = Math.max(0.1, clampEnd - startTime);
  const totalFrames = Math.round(renderDur * renderFps);

  // Poll path-tracer sample count while in Cycles mode.
  useEffect(() => {
    if (engine !== 'cycles') { setPtSamples(0); return; }
    const id = window.setInterval(() => {
      setPtSamples(bridge.getPathTracerSamples?.() ?? 0);
    }, 250);
    return () => window.clearInterval(id);
  }, [engine]);

  const changeEngine = (e: Engine) => {
    setEngineState(e);
    bridge.setRenderEngine?.(e);
    setPtSamples(0);
  };

  const changeCompute = (d: 'cpu' | 'gpu') => {
    setComputeState(d);
    bridge.setComputeDevice?.(d);
  };

  const resLabel = () => {
    const p = RES_PRESETS[resolution];
    if (!p) return 'Viewport';
    return `${p[0]}×${p[1]}`;
  };

  const applyRes = () => {
    const p = RES_PRESETS[resolution];
    if (p) bridge.setRenderResolution?.(p[0], p[1]);
  };
  const resetRes = () => {
    if (RES_PRESETS[resolution]) bridge.resetRenderResolution?.();
  };

  // ── Still export ──────────────────────────────────────────────────────────
  const exportStill = async () => {
    setBusy(true); setProgress('Rendering…');
    applyRes();
    await new Promise((r) => requestAnimationFrame(r));
    const mime = stillFmt === 'jpeg' ? 'image/jpeg' : 'image/png';
    const url  = bridge.captureImage?.(mime, 0.95);
    resetRes();
    if (url) {
      const a = document.createElement('a');
      a.href = url; a.download = `${outputName}.${stillFmt}`; a.click();
      setProgress('Done.');
    } else {
      setProgress('Viewport not ready.');
    }
    setBusy(false);
  };

  // ── WebM / MP4 via MediaRecorder ──────────────────────────────────────────
  const exportVideo = async (fmt: 'webm' | 'mp4') => {
    const mime = fmt === 'mp4'
      ? (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '')
      : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
    if (!mime) { setProgress(`${fmt.toUpperCase()} not supported in this browser.`); return; }

    setBusy(true); abortRef.current = false; setProgress('Preparing…');
    applyRes();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const stream = bridge.captureStream?.(renderFps);
    if (!stream) { resetRes(); setProgress('captureStream unavailable — reload.'); setBusy(false); return; }

    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    setProgress('Recording…');
    const anim = useAnimationStore.getState();
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

      setTimeout(() => {
        if (recorder.state === 'recording') { clearInterval(poll); anim.stop(); recorder.stop(); }
      }, (renderDur + 4) * 1000);
    });

    resetRes();
    if (!abortRef.current) {
      const ext = fmt === 'mp4' ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mime });
      downloadBlob(blob, `${outputName}.${ext}`);
      setProgress(`Done — ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
    } else {
      setProgress('Cancelled.');
    }
    setBusy(false);
  };

  // ── PNG sequence ──────────────────────────────────────────────────────────
  const exportPngSeq = async () => {
    const anim = useAnimationStore.getState();
    if (!anim.clips.some((c) => Object.keys(c.tracks).length)) {
      setProgress('No keyframes — nothing to render.'); return;
    }
    setBusy(true); abortRef.current = false;
    applyRes();

    for (let i = 0; i <= totalFrames && !abortRef.current; i++) {
      const t = startTime + (i / renderFps);
      anim.setPlayhead(t);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const url = bridge.captureImage?.('image/png', 1.0);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${outputName}_${String(i).padStart(4, '0')}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 40));
      }
      setProgress(`Frame ${i + 1} / ${totalFrames + 1}`);
    }
    anim.stop();
    resetRes();
    setProgress(abortRef.current ? 'Cancelled.' : 'Done.');
    setBusy(false);
  };

  const doExport = () => {
    if (mode === 'still') { exportStill(); return; }
    if (videoFmt === 'pngseq') { exportPngSeq(); return; }
    exportVideo(videoFmt as 'webm' | 'mp4');
  };

  const webmOk = typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') || MediaRecorder.isTypeSupported('video/webm'));
  const mp4Ok = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4');

  const fmtLabel = mode === 'still'
    ? stillFmt.toUpperCase()
    : videoFmt === 'webm' ? 'WebM (VP9)'
    : videoFmt === 'mp4' ? 'MP4 (H.264)'
    : 'PNG Sequence';

  const btnLabel = busy ? (progress || 'Working…')
    : mode === 'still' ? `⤓ Export ${stillFmt.toUpperCase()}`
    : videoFmt === 'pngseq' ? '⤓ Export PNG Seq'
    : `⏺ Record ${videoFmt.toUpperCase()}`;

  const btnDisabled = busy
    || (mode === 'video' && videoFmt === 'webm' && !webmOk)
    || (mode === 'video' && videoFmt === 'mp4' && !mp4Ok);

  return (
    <div className="tl-body">

      {/* ENGINE */}
      <div className="tl-section">ENGINE</div>
      <div className="tl-toggle4">
        {(['eevee', 'cycles', 'raycast'] as Engine[]).map((e) => (
          <button key={e} className={engine === e ? 'on' : ''} onClick={() => changeEngine(e)}>
            {e === 'raycast' ? 'Raycast' : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>
      <div className="tl-hint">{ENGINE_HINTS[engine]}</div>
      {engine === 'cycles' && (
        <div className="tl-cycles-info">
          <div className="tl-cycles-row">
            <span className="tl-cycles-label">COMPUTE</span>
            <div className="tl-cycles-compute">
              <button className={compute === 'cpu' ? 'on' : ''} onClick={() => changeCompute('cpu')}
                title="Fewer ray bounces — lighter per-frame GPU load. Good for slow machines.">CPU</button>
              <button className={compute === 'gpu' ? 'on' : ''} onClick={() => changeCompute('gpu')}
                title="Full path tracing — 5 bounces, multiple importance sampling. Best quality.">GPU</button>
            </div>
          </div>
          <div className="tl-cycles-row">
            <span className="tl-cycles-label">SAMPLES</span>
            <span className="tl-cycles-val">{ptSamples}</span>
          </div>
          <div className="tl-cycles-note">
            {compute === 'gpu'
              ? 'GPU · WebGL path tracer · 5 bounces · MIS'
              : 'CPU preset · WebGL · 2 bounces · lighter load'}
          </div>
        </div>
      )}

      {/* OUTPUT */}
      <div className="tl-section">OUTPUT</div>
      <label className="tl-field">
        <span>Name</span>
        <input className="tl-input" value={outputName} onChange={(e) => setOutputName(e.target.value)} />
      </label>

      {/* MODE */}
      <div className="tl-section">MODE</div>
      <div className="tl-toggle2">
        <button className={mode === 'still' ? 'on' : ''} onClick={() => setMode('still')}>Image</button>
        <button className={mode === 'video' ? 'on' : ''} onClick={() => setMode('video')}>Video</button>
      </div>

      {/* FORMAT */}
      <div className="tl-section">FORMAT</div>
      {mode === 'still' ? (
        <div className="tl-toggle2">
          <button className={stillFmt === 'png'  ? 'on' : ''} onClick={() => setStillFmt('png')}>PNG</button>
          <button className={stillFmt === 'jpeg' ? 'on' : ''} onClick={() => setStillFmt('jpeg')}>JPEG</button>
        </div>
      ) : (
        <>
          <div className="tl-toggle3">
            <button className={videoFmt === 'webm'   ? 'on' : ''} onClick={() => setVideoFmt('webm')}>
              WebM{!webmOk ? ' ✗' : ''}
            </button>
            <button className={videoFmt === 'mp4' ? 'on' : ''} onClick={() => setVideoFmt('mp4')}
              title={mp4Ok ? 'H.264 MP4' : 'Not supported in this browser'}>
              MP4{!mp4Ok ? ' ✗' : ''}
            </button>
            <button className={videoFmt === 'pngseq' ? 'on' : ''} onClick={() => setVideoFmt('pngseq')}>PNG Seq</button>
          </div>
          {videoFmt === 'webm' && !webmOk && <div className="tl-warn">WebM not supported — use PNG Seq.</div>}
          {videoFmt === 'mp4' && !mp4Ok && <div className="tl-warn">MP4 not supported in this browser (try Safari).</div>}
          {videoFmt === 'pngseq' && <div className="tl-hint">Frame-by-frame PNG — import in Blender / DaVinci.</div>}
        </>
      )}

      {/* RESOLUTION */}
      <div className="tl-section">RESOLUTION</div>
      <div className="tl-toggle2x2">
        {(['viewport', '1080p', '2k', '4k'] as Resolution[]).map((r) => {
          const p = RES_PRESETS[r];
          return (
            <button key={r} className={resolution === r ? 'on' : ''} onClick={() => setResolution(r)}>
              {r === 'viewport' ? 'Viewport' : p ? `${p[0]}×${p[1]}` : r.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* FPS — video only */}
      {mode === 'video' && (
        <>
          <div className="tl-section">FRAME RATE</div>
          <div className="tl-toggle4">
            {([12, 24, 30, 60] as RenderFps[]).map((f) => (
              <button key={f} className={renderFps === f ? 'on' : ''} onClick={() => setRenderFps(f)}>
                {f} fps
              </button>
            ))}
          </div>
        </>
      )}

      {/* TIME RANGE — video only */}
      {mode === 'video' && (
        <>
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

      {/* INFO */}
      <div className="tl-section">INFO</div>
      <div className="tl-settings">
        {mode === 'video' && <>
          <div className="tl-row2"><span>Frames</span><strong>{totalFrames} @ {renderFps} fps</strong></div>
          <div className="tl-row2"><span>Duration</span><strong>{renderDur.toFixed(1)}s</strong></div>
        </>}
        <div className="tl-row2"><span>Resolution</span><strong>{resLabel()}</strong></div>
        <div className="tl-row2"><span>Format</span><strong>{fmtLabel}</strong></div>
        <div className="tl-row2"><span>Engine</span><strong>{engine.charAt(0).toUpperCase() + engine.slice(1)}</strong></div>
      </div>

      {progress && <div className="tl-progress">{progress}</div>}

      <div className="tl-render-row">
        <button className="tl-render" onClick={doExport} disabled={btnDisabled}>
          {btnLabel}
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
