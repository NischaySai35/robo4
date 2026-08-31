/**
 * sender — hand the whole sequence to the board and let IT do the playing.
 *
 * The streaming player (player.ts) puts every frame boundary on the network: a Wi-Fi
 * stall shows up directly as a stutter in the motion. This path uploads the sequence
 * once, the board validates it against a declared frame count and checksum, and only
 * then owns the timing. After that the link can drop entirely and the arm keeps moving.
 */
import { ttlUrl } from '@/state/espTtlStore';
import { useTimelineStore } from './timelineStore';

/** Same rolling hash the firmware computes over the payload. */
function checksum(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

/** Wire format: one line per frame, "timeMs speed id:deg id:deg ...". */
export function buildPayload(): { header: string; payload: string; frames: number } {
  const st = useTimelineStore.getState();
  const lines = st.frames.map(f => {
    const time = f.delayMs ?? st.globalDelayMs;
    const speed = f.speed ?? st.globalSpeed;
    const joints = Object.entries(f.pose)
      .map(([id, deg]) => `${id}:${(+deg).toFixed(1)}`)
      .join(' ');
    return `${Math.round(time)} ${Math.round(speed)} ${joints}`;
  });
  const payload = lines.join('\n') + '\n';
  return {
    header: `V1 ${st.frames.length} ${checksum(payload)}`,
    payload,
    frames: st.frames.length,
  };
}

export interface SendResult { ok: boolean; error?: string; frames?: number }

/** Upload the sequence. Does not start it — see startOnBoard(). */
export async function sendToBoard(): Promise<SendResult> {
  const st = useTimelineStore.getState();
  if (!st.frames.length) return { ok: false, error: 'timeline is empty' };

  const { header, payload, frames } = buildPayload();
  const body = header + '\n' + payload;
  const q = `?sine=${st.sine ? 1 : 0}&loop=${st.loop ? 1 : 0}`;

  try {
    const res = await fetch(`${ttlUrl()}/api/anim/load${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      signal: AbortSignal.timeout(20000),
    });
    const txt = await res.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch { /* keep the raw text as the error */ }
    if (!res.ok || !json?.ok) return { ok: false, error: json?.error || txt || `HTTP ${res.status}` };
    return { ok: true, frames: json.frames ?? frames };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function startOnBoard(from = 0): Promise<SendResult> {
  const st = useTimelineStore.getState();
  try {
    const res = await fetch(`${ttlUrl()}/api/anim/play?from=${from}&loop=${st.loop ? 1 : 0}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return { ok: false, error: j?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function stopOnBoard(): Promise<void> {
  try {
    await fetch(`${ttlUrl()}/api/anim/stop`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  } catch { /* the E-STOP button is the backstop if this cannot get through */ }
}
