/**
 * Timeline — keyframe + playback controls for joint animation (Phase 9).
 * "Keyframe" snapshots the current joint values at the playhead; Play scrubs the
 * sampled pose live (non-destructive). Save/load travels with the project.
 */
import './Timeline.css';
import { useAnimationStore } from '@/state/animationStore.js';
import { useModelStore } from '@/state/modelStore.js';

export default function Timeline() {
  const duration = useAnimationStore((s) => s.duration);
  const playhead = useAnimationStore((s) => s.playhead);
  const playing = useAnimationStore((s) => s.playing);
  const tracks = useAnimationStore((s) => s.tracks);
  const a = useAnimationStore.getState();

  const keyTimes = useAnimationStore((s) => s.keyTimes)();
  const nJoints = Object.keys(useModelStore((s) => s.doc).joints).length;

  const addKey = () => {
    const doc = useModelStore.getState().doc;
    const vals = {};
    for (const j of Object.values(doc.joints)) vals[j.id] = j.state?.value ?? 0;
    if (Object.keys(vals).length) a.addKeyframe(vals);
  };

  return (
    <div className="tl-panel">
      <div className="tl-head">
        <span className="tl-title">ANIMATION</span>
        <span className="tl-count">{keyTimes.length} keys</span>
      </div>

      <div className="tl-controls">
        <button onClick={() => (playing ? a.pause() : a.play())} title="Play/Pause">{playing ? '⏸' : '▶'}</button>
        <button onClick={() => a.stop()} title="Stop">⏹</button>
        <button className="tl-key" onClick={addKey} disabled={nJoints === 0} title="Keyframe current joint values">◆ Key</button>
      </div>

      <div className="tl-scrub">
        <input type="range" min="0" max={duration} step="0.01" value={playhead}
          onChange={(e) => a.setPlayhead(parseFloat(e.target.value))} />
        <span className="tl-time">{playhead.toFixed(2)}s</span>
      </div>

      <div className="tl-row">
        <label className="tl-dur">Duration
          <input type="number" min="0.5" step="0.5" value={duration}
            onChange={(e) => a.setDuration(parseFloat(e.target.value) || 1)} />
        </label>
        <button className="tl-clear" onClick={() => a.clear()} disabled={keyTimes.length === 0}>Clear</button>
      </div>

      {keyTimes.length > 0 && (
        <div className="tl-keys">
          {keyTimes.map((t) => (
            <button key={t} className="tl-keychip" onClick={() => a.setPlayhead(t)}
              onContextMenu={(e) => { e.preventDefault(); a.deleteKeyAt(t); }}
              title="Click: jump · Right-click: delete">{t.toFixed(2)}s</button>
          ))}
        </div>
      )}
      {Object.keys(tracks).length === 0 && nJoints > 0 && (
        <div className="tl-hint">Pose the joints, then ◆ Key to record. Right-click a key to delete.</div>
      )}
    </div>
  );
}
