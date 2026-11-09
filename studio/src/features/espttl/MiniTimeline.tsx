/**
 * MiniTimeline — the small timeline bar for the Control tab.
 *
 * Same timeline as the Animation tab (one store, useTimelineStore), just a compact view:
 * record a pose, then copy / paste / duplicate / delete / drag frames with small icons.
 * Timing, saving and sending stay on the Animation tab ("open full timeline").
 *
 * REUSE-CHECKED: copyFrame|pasteFrame|MiniTimeline|clipboard|recordPose -> only appOps.ts (copies 3D
 * bodies, unrelated); the frame data, undo, drag-move and playback all reuse timelineStore + player.
 */
import { useState } from 'react';
import { Circle, ClipboardPaste, Copy, CopyPlus, Crosshair, Play, Redo2, Square, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEspTtlStore, currentPose, splitKey } from '@/state/espTtlStore';
import { useTimelineStore } from './timelineStore';
import { playTimeline, stopPlayback, gotoFrame } from './player';

/** Add the live pose of EVERY online module as a new frame. Shared by the Control and Animation tabs. */
export function recordPose(say: (m: string) => void) {
  const pose = currentPose();
  if (!Object.keys(pose).length) { say('nothing to record — no servo is reporting an angle'); return; }
  useTimelineStore.getState().addFrame(pose);
  const mods = new Set(Object.keys(pose).map(k => splitKey(k).mod));
  say(`recorded ${Object.keys(pose).length} joint(s) from ${mods.size} module${mods.size === 1 ? '' : 's'} (M${[...mods].sort((x, y) => x - y).join(', M')})`);
}

export default function MiniTimeline({ say }: { say: (m: string) => void }) {
  const online = useEspTtlStore(s => s.online);
  const t = useTimelineStore();
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const sel = t.frames.find(f => f.id === t.selectedId) || null;
  const selIdx = sel ? t.frames.indexOf(sel) : -1;

  const copy  = () => { if (sel) { t.copyFrame(sel.id); say(`copied ${sel.name}`); } };
  const paste = () => t.pasteAfter(sel?.id ?? null);
  const del   = () => { if (sel) t.deleteFrame(sel.id); };

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'c') copy();
    else if (mod && k === 'v') paste();
    else if (mod && k === 'd') { if (sel) t.duplicate(sel.id); }
    else if (mod && k === 'z') (e.shiftKey ? t.redo : t.undo)();
    else if (mod && k === 'y') t.redo();
    else if (k === 'delete' || k === 'backspace') del();
    else if (k === 'arrowleft' || k === 'arrowright') {
      if (!t.frames.length) return;
      const i = selIdx < 0 ? 0 : Math.min(t.frames.length - 1, Math.max(0, selIdx + (k === 'arrowleft' ? -1 : 1)));
      t.select(t.frames[i].id);
    } else return;
    e.preventDefault();
  };

  const icon = (title: string, Ico: typeof Copy, onClick: () => void, disabled = false, danger = false) => (
    <Button variant={danger ? 'destructive' : 'outline'} size="icon-xs" title={title} aria-label={title}
            onClick={onClick} disabled={disabled}><Ico /></Button>
  );

  return (
    <div className="ettl-card" onKeyDown={onKey}>
      <h4>
        Timeline · {t.frames.length} frame{t.frames.length === 1 ? '' : 's'}
        <button className="ettl-link" onClick={() => useEspTtlStore.getState().setTab('animation')}>open full timeline →</button>
      </h4>
      <div className="ettl-row">
        <Button variant="destructive" size="sm" onClick={() => recordPose(say)} disabled={!online}
                title="Add the arm's current pose as a new frame"><Circle className="tw:fill-current" /> Record pose</Button>
        <span className="ettl-sep" />
        {icon('Undo (Ctrl+Z)', Undo2, t.undo, !t.canUndo())}
        {icon('Redo (Ctrl+Y)', Redo2, t.redo, !t.canRedo())}
        <span className="ettl-sep" />
        {icon('Copy frame (Ctrl+C)', Copy, copy, !sel)}
        {icon('Paste after the selected frame (Ctrl+V)', ClipboardPaste, paste, !t.clipboard)}
        {icon('Duplicate frame (Ctrl+D)', CopyPlus, () => sel && t.duplicate(sel.id), !sel)}
        {icon('Delete frame (Del)', Trash2, del, !sel, true)}
        <span className="ettl-sep" />
        {icon('Move the arm to this frame', Crosshair, () => sel && gotoFrame(sel, say), !sel || !online)}
        {t.playing
          ? icon('Stop', Square, stopPlayback)
          : icon('Play from the selected frame', Play, () => playTimeline(Math.max(0, selIdx), say), !t.frames.length || !online)}
      </div>
      {!t.frames.length ? (
        <div className="ettl-dim">No frames yet. Pose the arm, then press <b>Record pose</b>.</div>
      ) : (
        <div className="ettl-mini" tabIndex={0}
             title="click to select · drag to reorder · double-click moves the arm there · Ctrl+C / Ctrl+V / Del">
          {t.frames.map((f, i) => (
            <div key={f.id} draggable
                 className={`ettl-mini-f${t.selectedId === f.id ? ' sel' : ''}${t.playIdx === i && t.playing ? ' playing' : ''}${over === i ? ' over' : ''}`}
                 onClick={() => t.select(t.selectedId === f.id ? null : f.id)}
                 onDoubleClick={() => online && gotoFrame(f, say)}
                 onDragStart={() => setDrag(i)}
                 onDragOver={e => { e.preventDefault(); setOver(i); }}
                 onDrop={() => { if (drag != null && drag !== i) t.moveFrame(drag, i); setDrag(null); setOver(null); }}
                 onDragEnd={() => { setDrag(null); setOver(null); }}>
              <span className="ettl-frame-n">{i + 1}</span>
              <span className="ettl-mini-name">{f.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
