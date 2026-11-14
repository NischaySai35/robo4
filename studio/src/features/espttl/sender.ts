/**
 * sender — hand the sequence to the module boards and let THEM play it, in step.
 *
 * Every module gets its own joints of every frame (same times, speeds and pauses), checked by a frame count and a
 * checksum, with one group number. Then the LAPTOP starts them all at one instant (startOnBoard, 13 Nov 2026): no module
 * talks to another. Each plays alone on its own clock; the laptop stops all if one does not start or stops part-way.
 */
import { byModule, boardUrl, ttlTargets, askOffline, nodeModule } from '@/state/espTtlStore';
import { useTimelineStore, type Frame } from './timelineStore';
import { speakForPath } from '@/features/voice/phrases';
import { laptopLog } from '@/features/servo/espPoll';

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
let loaded: { group: number; mods: number[]; frames: number; times: number[] } | null = null;

/** Upload `frames` to every module in them, with one fresh group number. Does not start — see startOnBoard(). */
export async function sendToBoard(frames: Frame[] = useTimelineStore.getState().frames): Promise<SendResult> {
  const st = useTimelineStore.getState();
  if (!frames.length) return { ok: false, error: 'timeline is empty' };
  // only the modules picked at the top of the page (default all); one offline -> asked first (Nischay 12 Nov).
  // A target with no frames in the timeline gets nothing and stays still - and is never asked about (12 Nov: it asked
  // "mod1 offline, send to mod2 only?" for a mod2-only recording).
  const inFrames = modulesOf(frames), all = ttlTargets();
  const used = all.filter(n => inFrames.includes(nodeModule(n)));
  const still = [...new Set(all.filter(n => !inFrames.includes(nodeModule(n))).map(n => `mod${nodeModule(n)}`))];
  if (!used.length) return { ok: false, error: `the timeline has no frames for ${all.map(n => `mod${nodeModule(n)}`).join(', ') || 'any module'}` };
  const tg = askOffline(used);
  if (!tg) return { ok: false, error: 'cancelled' };
  const want = new Set(tg.map(nodeModule));
  const mods = inFrames.filter(m => want.has(m));
  if (!mods.length) return { ok: false, error: 'cancelled' };
  const group = mods.length > 1 ? (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0 : 0;   // 0 = one module, no group
  // mods: who is in the group, so a member that is switched off (never starts) makes the others stop instead of
  // playing without it (firmware groupsync.h missingNow)
  const q = `?sine=${st.sine ? 1 : 0}&loop=${st.loop ? 1 : 0}${group ? `&group=${group}&mods=${mods.join('.')}` : ''}`;
  loaded = null;
  const need: number[] = new Array(frames.length).fill(0);   // the timetable: per frame, the longest any module needs
  laptopLog(`send animation: ${frames.length} frames to mod${mods.join(', mod')}`);
  const err = await eachModule(mods, async (mod, base) => {
    const { header, payload } = buildPayload(mod, frames);
    const res = await fetch(`${base}/api/anim/load${q}`, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: header + '\n' + payload,
      signal: AbortSignal.timeout(20000),
    });
    const txt = await res.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch { /* keep the raw text as the error */ }
    if (res.ok && json?.ok && Array.isArray(json.needMs)) json.needMs.forEach((v: number, i: number) => { if (i < need.length) need[i] = Math.max(need[i], v); });
    const e = !res.ok || !json?.ok ? (json?.error || txt || `HTTP ${res.status}`) : null;
    laptopLog(`mod${mod}: animation ${e ? `NOT received (${e})` : `received (${json.frames} frames, checked)`}`);
    return e;
  });
  if (err) return { ok: false, error: err };
  loaded = { group, mods, frames: frames.length, times: need.map(v => Math.max(120, Math.round(v))) };
  speakForPath('/api/anim/load');
  return { ok: true, frames: frames.length, modules: mods.length, note: still.length ? `${still.join(', ')}: no frames, stays still` : undefined };
}

/** One module's clock: its millis() at the laptop's performance.now() `t`, from the quickest of 3 reads (the reply
 *  delay is split evenly, so the error is at most half the quickest round trip). */
async function readClock(base: string): Promise<{ off: number; rtt: number } | null> {
  let best: { off: number; rtt: number } | null = null;
  for (let i = 0; i < 3; i++) {
    try {
      const t0 = performance.now();
      const r = await getJson(`${base}/api/clock`, 2500);
      const t1 = performance.now();
      if (!r.ok || typeof r.j?.ms !== 'number') continue;
      const rtt = t1 - t0, off = r.j.ms - (t0 + t1) / 2;   // module ms = laptop ms + off
      if (!best || rtt < best.rtt) best = { off, rtt };
    } catch { /* try again */ }
  }
  return best;
}

/**
 * Start what sendToBoard() uploaded, on every module at the SAME instant (Nischay 13 Nov 2026: "just start both at the
 * same time; no module-to-module, not even via the master or router - the laptop takes care of it; if one does not
 * start the other must not start either").
 *   1. read every module's clock          any module not answering -> nothing starts
 *   2. pick one instant a little ahead, and tell each module that instant in ITS OWN clock (play?at=)
 *      any module refusing                -> stop all (cancels the waiting start), nothing moves
 *   3. just after the instant, check every module is playing; one is not -> stop all
 * After that each module plays alone (the firmware no longer waits for the others); follow() in player.ts stops all
 * if one stops part-way.
 */
export async function startOnBoard(from = 0): Promise<SendResult> {
  if (!loaded) return { ok: false, error: 'nothing uploaded yet' };
  const { mods } = loaded, loop = useTimelineStore.getState().loop ? 1 : 0;
  const bases = new Map<number, string>();
  for (const m of mods) { const b = boardUrl(m); if (!b) return { ok: false, error: `module ${m} has no board address` }; bases.set(m, b); }

  const clocks = new Map<number, { off: number; rtt: number }>();
  await Promise.all(mods.map(async m => { const c = await readClock(bases.get(m)!); if (c) clocks.set(m, c); }));
  const deaf = mods.filter(m => !clocks.has(m));
  if (deaf.length) return { ok: false, error: `mod${deaf.join(', mod')} did not answer - nothing started` };

  const worst = Math.max(...[...clocks.values()].map(c => c.rtt));
  const at = performance.now() + Math.min(4000, Math.max(700, 3 * worst + 400));   // the shared instant (laptop time)
  const refused: string[] = [];
  await Promise.all(mods.map(async m => {
    const own = Math.round(at + clocks.get(m)!.off) >>> 0;
    try {
      const tt = loaded!.times.every(v => v > 0) ? `&times=${loaded!.times.join('.')}` : '';
      const r = await getJson(`${bases.get(m)}/api/anim/play?from=${from}&loop=${loop}&at=${own}${tt}`, Math.max(500, at - performance.now() - 30));
      if (!r.ok) refused.push(`mod${m}: ${r.j?.error || `HTTP ${r.status}`}`);
    } catch (e: any) { refused.push(`mod${m}: ${e?.name === 'TimeoutError' ? 'no answer in time' : e?.message || e}`); }
  }));
  if (refused.length) { laptopLog(`start cancelled - ${refused.join('; ')} (nothing moves)`); await stopOnBoard(`${refused.join('; ')}`); return { ok: false, error: `${refused.join('; ')} - stopped all, nothing moves` }; }
  speakForPath('/api/anim/play');
  laptopLog(`start: mod${mods.join(', mod')} all received the timetable (${(loaded.times.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} s of moves) - they start together and run on their own`);

  await new Promise(r => setTimeout(r, Math.max(0, at - performance.now()) + 350));
  const notStarted: number[] = [];
  await Promise.all(mods.map(async m => {
    // started = playing now, OR already finished its part (ended 1): a module whose joints were nearly there ends in
    // a fraction of a second (13 Nov: mod2 done in 0.26 s was taken for "did not start" and everyone was stopped)
    try { const s = await getJson(`${bases.get(m)}/api/anim/status`, 2500); if (!s.ok || !(s.j.playing || s.j.ended === 1)) notStarted.push(m); }
    catch { notStarted.push(m); }
  }));
  if (notStarted.length) {   // only a report: a module that does not answer is most likely playing (the laptop's Wi-Fi)
    laptopLog(`after the start: no "playing" answer from mod${notStarted.join(', mod')} (link?) - nothing is stopped`);
    return { ok: true, modules: mods.length, note: `no answer from mod${notStarted.join(', mod')} just after the start - they keep running on their timetable` };
  }
  const spread = Math.round(Math.max(...[...clocks.values()].map(c => c.rtt)) / 2);
  return { ok: true, modules: mods.length, note: mods.length > 1 ? `all started together (within ~${spread} ms)` : undefined };
}

/** Stop every module of the last upload and of the timeline, at once. */
export async function stopOnBoard(why = 'Stop pressed'): Promise<void> {
  const mods = [...new Set([...(loaded?.mods ?? []), ...timelineModules()])];
  laptopLog(`stop animation on mod${mods.join(', mod')}: ${why}`);
  await eachModule(mods, async (_m, base) => {
    await fetch(`${base}/api/anim/stop?why=${encodeURIComponent(why.slice(0, 120))}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    return null;
  });   // the E-STOP button is the backstop if this cannot get through
  speakForPath('/api/anim/stop');
}

/** What the modules of the last upload are doing: the first one's frame for the highlight, plus whether any of them
 *  STOPPED part-way while another still plays (then player.ts stops them all - one never pushes on alone). */
export async function boardStatus(): Promise<{ playing: boolean; idx: number; stoppedMod?: number } | null> {
  if (!loaded) return null;
  const rs = await Promise.all(loaded.mods.map(async m => {
    const b = boardUrl(m); if (!b) return null;
    try { const s = await getJson(`${b}/api/anim/status`, 2000); return s.ok ? { m, ...s.j } : null; } catch { return null; }
  }));
  const first = rs[0];
  if (!first) return null;
  const anyPlaying = rs.some(r => r?.playing);
  const stopped = rs.find(r => r && !r.playing && r.ended === 2);
  // 14 Nov 2026: modules play a fixed timetable on their own - the laptop only watches (no pausing, no stopping others).
  return { playing: anyPlaying, idx: (rs.find(r => r?.playing) ?? first).idx ?? 0, stoppedMod: anyPlaying && stopped ? stopped.m : undefined };   // shown, never acted on
}
