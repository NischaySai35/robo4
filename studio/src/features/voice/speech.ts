/**
 * speech — spoken feedback through this computer's speaker.
 *
 * Voice: Piper "en_US-ryan" (a US male neural voice, ~60 MB). It downloads once from
 * HuggingFace into the browser's private storage (OPFS), then works from cache. Ryan is the
 * ONLY voice (Nischay 12 Nov 2026): until it is ready a line waits for it, and if it cannot be
 * loaded (offline first run, blocked CDN) the Studio stays silent - never the Windows voice.
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

// ── Piper playback ────────────────────────────────────────────────────────────
const cache = new Map<string, string>();      // phrase -> object URL of the rendered wav
let current: HTMLAudioElement | null = null;

/** Piper's default runtime URL is pinned to onnxruntime-web 1.18, whose files don't match the
 *  installed package (404, no backend), so point it at the version actually installed. */
async function piperSession() {
  const [p, ort] = await Promise.all([loadPiper(), import('onnxruntime-web')]);
  const { piperData, piperWasm } = p.TtsSession.WASM_LOCATIONS;
  const onnxWasm = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`;
  return p.TtsSession.create({ voiceId: PIPER_VOICE, wasmPaths: { onnxWasm, piperData, piperWasm } });
}

async function render(text: string): Promise<string> {
  const hit = cache.get(text);
  if (hit) return hit;
  const session = await piperSession();
  const blob = await session.predict(text);
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
const SAID_PREFIX = 'tetrobot:voice:said:';

export interface SpeakOpts {
  /** Interrupt whatever is playing and drop the queue (E-STOP, battery). */
  urgent?: boolean;
  /** Same key within `cooldownMs` is ignored, so a dragged slider can't spam. */
  key?: string;
  cooldownMs?: number;
}

export function stopSpeaking() {
  generation++;
  if (current) { current.pause(); current = null; }
}

export function speak(text: string, opts: SpeakOpts = {}): void {
  const S = useVoiceStore.getState();
  if (!S.enabled || !text) return;

  const key = opts.key ?? text;
  const now = Date.now();
  const cool = opts.cooldownMs ?? 2500;
  if (now - (lastSaid.get(key) ?? 0) < cool) return;
  // Shared with every other Studio window/tab on this computer: two open windows both watch the
  // board, and without this each one announced "Module detected, connected!" — two voices.
  // Only a deliberate repeat (cooldown 0, e.g. upload progress) skips the check.
  const shared = SAID_PREFIX + key;
  if (cool > 0) {
    try { if (now - Number(localStorage.getItem(shared) ?? 0) < Math.max(cool, 1500)) return; } catch { /* storage blocked */ }
  }
  lastSaid.set(key, now);
  try { localStorage.setItem(shared, String(now)); } catch { /* storage blocked */ }

  if (opts.urgent) stopSpeaking();
  const gen = generation;

  chain = chain.then(async () => {
    if (gen !== generation) return;            // cancelled while waiting
    // RYAN ONLY (Nischay 12 Nov 2026: "I want only Ryan"). No Windows voice, ever: it used to step in while Ryan was still
    // loading or when a render failed, so the same Studio spoke in two voices. Ryan not on this computer yet -> fetch it
    // (once) and say this line when it is ready; if it cannot be fetched or rendered, stay silent.
    if (useVoiceStore.getState().model !== 'ready') {
      await checkVoiceModel();
      if (useVoiceStore.getState().model !== 'ready') await downloadVoiceModel();
    }
    const { volume, model } = useVoiceStore.getState();
    if (model !== 'ready' || gen !== generation) return;
    try {
      const url = await render(text);
      if (gen !== generation) return;
      useVoiceStore.getState()._status({ engine: 'piper' });
      await play(url, volume);
    } catch { /* silent: never another voice */ }
  });
}

/** Render phrases ahead of time so the first real announcement has no delay. */
export async function warmUp(phrases: string[]) {
  if (useVoiceStore.getState().model !== 'ready') return;
  for (const t of phrases) { try { await render(t); } catch { return; } }
}
