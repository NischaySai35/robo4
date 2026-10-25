/**
 * speech — spoken feedback through this computer's speaker.
 *
 * Voice: Piper "en_US-ryan" (a US male neural voice, ~60 MB). It downloads once from
 * HuggingFace into the browser's private storage (OPFS), then works from cache. Until it
 * is ready — or if it can't be loaded (offline first run, blocked CDN) — the operating
 * system's own male English voice speaks instead, so announcements are never silent.
 *
 * Phrases are short and fixed, so each one is synthesised once and replayed from memory.
 */
import { useVoiceStore } from './voiceStore';

export const PIPER_VOICE = 'en_US-ryan-medium';

type Piper = typeof import('@mintplex-labs/piper-tts-web');
let piperMod: Promise<Piper> | null = null;
const loadPiper = () => (piperMod ??= import('@mintplex-labs/piper-tts-web'));

// ── model download ────────────────────────────────────────────────────────────
let downloading: Promise<void> | null = null;

/** Look at what's already cached, without downloading anything. */
export async function checkVoiceModel(): Promise<void> {
  const S = useVoiceStore.getState();
  try {
    const p = await loadPiper();
    const have = (await p.stored()).includes(PIPER_VOICE);
    S._status({ model: have ? 'ready' : 'missing', engine: have ? 'piper' : 'system', error: null });
  } catch (e: any) {
    S._status({ model: 'error', engine: 'system', error: e?.message || String(e) });
  }
}

/** Fetch the Ryan voice (idempotent; safe to call from several places). */
export function downloadVoiceModel(): Promise<void> {
  if (downloading) return downloading;
  const S = useVoiceStore.getState();
  S._status({ model: 'downloading', progress: 0, error: null });
  downloading = (async () => {
    try {
      const p = await loadPiper();
      await p.download(PIPER_VOICE, (pr) => {
        if (pr.total > 0) useVoiceStore.getState()._status({ progress: pr.loaded / pr.total });
      });
      useVoiceStore.getState()._status({ model: 'ready', engine: 'piper', progress: 1 });
    } catch (e: any) {
      useVoiceStore.getState()._status({ model: 'error', engine: 'system', error: e?.message || String(e) });
    } finally {
      downloading = null;
    }
  })();
  return downloading;
}

// ── system (fallback) voice ───────────────────────────────────────────────────
let sysVoice: SpeechSynthesisVoice | null = null;

function pickSystemVoice(): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis?.getVoices?.() ?? [];
  const en = all.filter(v => /^en[-_]/i.test(v.lang));
  const male = /david|mark|guy|ryan|james|george|daniel|alex|fred|male|christopher|eric|roger|steffan/i;
  return en.find(v => male.test(v.name)) ?? en[0] ?? all[0] ?? null;
}

function speakSystem(text: string, volume: number): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) { resolve(); return; }
    sysVoice ||= pickSystemVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (sysVoice) { u.voice = sysVoice; u.lang = sysVoice.lang; }
    u.volume = volume; u.rate = 1.0; u.pitch = 0.9;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

// ── Piper playback ────────────────────────────────────────────────────────────
const cache = new Map<string, string>();      // phrase -> object URL of the rendered wav
let current: HTMLAudioElement | null = null;

async function render(text: string): Promise<string> {
  const hit = cache.get(text);
  if (hit) return hit;
  const p = await loadPiper();
  const blob = await p.predict({ text, voiceId: PIPER_VOICE });
  const url = URL.createObjectURL(blob);
  if (cache.size > 120) { const k = cache.keys().next().value!; URL.revokeObjectURL(cache.get(k)!); cache.delete(k); }
  cache.set(text, url);
  return url;
}

function play(url: string, volume: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const a = new Audio(url);
    a.volume = volume;
    current = a;
    a.onended = () => resolve();
    a.onerror = () => reject(new Error('audio playback failed'));
    a.play().catch(reject);
  });
}

// ── queue ─────────────────────────────────────────────────────────────────────
let chain: Promise<void> = Promise.resolve();
let generation = 0;                            // bumped to drop everything still queued
const lastSaid = new Map<string, number>();

export interface SpeakOpts {
  /** Interrupt whatever is playing and drop the queue (E-STOP, battery). */
  urgent?: boolean;
  /** Same key within `cooldownMs` is ignored, so a dragged slider can't spam. */
  key?: string;
  cooldownMs?: number;
}

export function stopSpeaking() {
  generation++;
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  if (current) { current.pause(); current = null; }
}

export function speak(text: string, opts: SpeakOpts = {}): void {
  const S = useVoiceStore.getState();
  if (!S.enabled || !text) return;

  const key = opts.key ?? text;
  const now = Date.now();
  if (now - (lastSaid.get(key) ?? 0) < (opts.cooldownMs ?? 2500)) return;
  lastSaid.set(key, now);

  if (opts.urgent) stopSpeaking();
  const gen = generation;

  chain = chain.then(async () => {
    if (gen !== generation) return;            // cancelled while waiting
    const { volume, model } = useVoiceStore.getState();
    try {
      if (model === 'ready') {
        const url = await render(text);
        if (gen !== generation) return;
        useVoiceStore.getState()._status({ engine: 'piper' });
        await play(url, volume);
        return;
      }
    } catch { /* fall through to the OS voice */
      useVoiceStore.getState()._status({ engine: 'system' });
    }
    if (gen !== generation) return;
    await speakSystem(text, volume);
  });
}

/** Render phrases ahead of time so the first real announcement has no delay. */
export async function warmUp(phrases: string[]) {
  if (useVoiceStore.getState().model !== 'ready') return;
  for (const t of phrases) { try { await render(t); } catch { return; } }
}
