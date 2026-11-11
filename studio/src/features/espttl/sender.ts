/**
 * sender — hand the sequence to the module boards and let THEM play it, in step.
 *
 * Every module gets its own joints of every frame (same times, speeds and pauses), checked by a frame count and a
 * checksum, with one group number. Then ONE module is asked to play: it says GO over the radio and every module starts
 * at the same instant. While they move they tell each other where they are (firmware groupsync.h): one ahead of the
 * slowest slows down, and nobody starts the next frame before all finished this one. The laptop link can drop after
 * the start and they keep going.
 *
 * Fallback: a module that did not hear GO (not on the same radio channel) is started over Wi-Fi a moment later, and
 * the message says so.
 */
import { byModule, boardUrl } from '@/state/espTtlStore';
import { useTimelineStore, type Frame } from './timelineStore';
import { speakForPath } from '@/features/voice/phrases';

/** Same rolling hash the firmware computes over the payload. */
function checksum(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

/** Modules that appear anywhere in these frames, lowest first. */
export function modulesOf(frames: Frame[]): number[] {
  const mods = new Set<number>();
  for (const f of frames) for (const m of byModule(f.pose).keys()) mods.add(m);
  return [...mods].sort((a, b) => a - b);
}
export const timelineModules = () => modulesOf(useTimelineStore.getState().frames);

/** Wire format: one line per frame, "timeMs speed holdMs id:deg id:deg ...". timeMs 0 = auto.
 *  For one module. A frame without that module's joints repeats its last angles (or the first ones it ever gets), so
 *  every board has every frame and they stay in step. */
export function buildPayload(mod: number, frames: Frame[] = useTimelineStore.getState().frames): { header: string; payload: string; frames: number } {
  const st = useTimelineStore.getState();
  const per = frames.map(f => byModule(f.pose).get(mod) ?? {});
  let carry: Record<number, number> = { ...(per.find(p => Object.keys(p).length) ?? {}) };
  const lines = frames.map((f, i) => {
    carry = { ...carry, ...per[i] };
    const time = f.delayMs ?? st.globalDelayMs;
    const speed = f.speed ?? st.globalSpeed;
    const hold = f.holdMs ?? st.globalHoldMs;
    const joints = Object.entries(carry).map(([id, deg]) => `${id}:${(+deg).toFixed(1)}`).join(' ');
    return `${Math.round(time)} ${Math.round(speed)} ${Math.round(hold)} ${joints}`;
  });
  const payload = lines.join('\n') + '\n';
  return { header: `V2 ${frames.length} ${checksum(payload)}`, payload, frames: frames.length };
}

export interface SendResult { ok: boolean; error?: string; frames?: number; modules?: number; note?: string }

/** Run one request per module at once; the first failure is reported with its module number. */
async function eachModule(mods: number[], fn: (mod: number, base: string) => Promise<string | null>): Promise<string | null> {
  if (!mods.length) return 'timeline is empty';
  const errs = await Promise.all(mods.map(async mod => {
    const base = boardUrl(mod);
    if (!base) return `module ${mod} has no board address — add it in the module bar`;
    try { const e = await fn(mod, base); return e ? `module ${mod}: ${e}` : null; }
    catch (e: any) { return `module ${mod}: ${e?.message || String(e)}`; }
  }));
  return errs.find(Boolean) ?? null;
}

const getJson = async (url: string, ms: number) => {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) });
  const j = await res.json().catch(() => null);
  return { ok: res.ok && !!j?.ok, j, status: res.status };
};

// The upload that is on the boards now (which modules, which group), for Play and Stop.
let loaded: { group: number; mods: number[]; frames: number } | null = null;

/** Upload `frames` to every module in them, with one fresh group number. Does not start — see startOnBoard(). */
export async function sendToBoard(frames: Frame[] = useTimelineStore.getState().frames): Promise<SendResult> {
  const st = useTimelineStore.getState();
  if (!frames.length) return { ok: false, error: 'timeline is empty' };
  const mods = modulesOf(frames);
  const group = mods.length > 1 ? (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0 : 0;   // 0 = one module, no group
  // mods: who is in the group, so a member that is switched off (never starts) makes the others stop instead of
  // playing without it (firmware groupsync.h missingNow)
  const q = `?sine=${st.sine ? 1 : 0}&loop=${st.loop ? 1 : 0}${group ? `&group=${group}&mods=${mods.join('.')}` : ''}`;
  loaded = null;
  const err = await eachModule(mods, async (mod, base) => {
    const { header, payload } = buildPayload(mod, frames);
    const res = await fetch(`${base}/api/anim/load${q}`, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: header + '\n' + payload,
      signal: AbortSignal.timeout(20000),
    });
    const txt = await res.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch { /* keep the raw text as the error */ }
    return !res.ok || !json?.ok ? (json?.error || txt || `HTTP ${res.status}`) : null;
  });
  if (err) return { ok: false, error: err };
  loaded = { group, mods, frames: frames.length };
  speakForPath('/api/anim/load');
  return { ok: true, frames: frames.length, modules: mods.length };
}

/** Start what sendToBoard() uploaded: ask the first module, which says GO to the rest. */
export async function startOnBoard(from = 0): Promise<SendResult> {
  if (!loaded) return { ok: false, error: 'nothing uploaded yet' };
  const { mods, group } = loaded, loop = useTimelineStore.getState().loop ? 1 : 0;
  const lead = mods[0], base = boardUrl(lead);
  if (!base) return { ok: false, error: `module ${lead} has no board address` };
  let startsIn = 0;   // a group lead counts down (firmware GROUP_GO_LEAD_MS) and every module starts at that instant
  try {
    const r = await getJson(`${base}/api/anim/play?from=${from}&loop=${loop}`, 8000);
    if (!r.ok) return { ok: false, error: `module ${lead}: ${r.j?.error || `HTTP ${r.status}`}` };
    startsIn = +r.j?.startsInMs || 0;
  } catch (e: any) { return { ok: false, error: `module ${lead}: ${e?.message || String(e)}` }; }
  speakForPath('/api/anim/play');
  if (!group) return { ok: true, modules: 1 };

  // Did everyone hear GO? A module still armed but not playing after a moment is started over Wi-Fi (a bit late).
  await new Promise(r => setTimeout(r, Math.max(400, startsIn + 250)));
  const late: number[] = [];
  await eachModule(mods.slice(1), async (mod, b) => {
    const s = await getJson(`${b}/api/anim/status`, 3000);
    // no "group" in its answer = older firmware without group play: it never hears GO, so it is started here too
    if (s.ok && !s.j.playing && (s.j.group === group || s.j.group == null)) {
      late.push(mod);
      const p = await getJson(`${b}/api/anim/play?from=${from}&loop=${loop}`, 8000);
      return p.ok ? null : (p.j?.error || `HTTP ${p.status}`);
    }
    return null;
  });
  return { ok: true, modules: mods.length,
           note: late.length ? `M${late.join(', M')} did not hear GO over the radio — started over Wi-Fi, a little late` : undefined };
}

/** Stop every module of the last upload and of the timeline, at once. */
export async function stopOnBoard(): Promise<void> {
  const mods = [...new Set([...(loaded?.mods ?? []), ...timelineModules()])];
  await eachModule(mods, async (_m, base) => {
    await fetch(`${base}/api/anim/stop`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    return null;
  });   // the E-STOP button is the backstop if this cannot get through
  speakForPath('/api/anim/stop');
}

/** What the first module of the last upload is doing (frame index), for the timeline highlight. */
export async function boardStatus(): Promise<{ playing: boolean; idx: number } | null> {
  const base = loaded ? boardUrl(loaded.mods[0]) : null;
  if (!base) return null;
  try { const s = await getJson(`${base}/api/anim/status`, 2000); return s.ok ? { playing: !!s.j.playing, idx: s.j.idx ?? 0 } : null; }
  catch { return null; }
}
