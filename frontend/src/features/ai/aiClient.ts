import { localPlan, makeSystemPrompt, normalizePlan } from './aiActions';
import { ensureLocalModel, semanticPlan } from './localModel';

// Whether the on-device neural model has been enabled this session.
let _neuralOn = false;
export function neuralEnabled() { return _neuralOn; }
export async function enableNeuralModel(onProgress) {
  await ensureLocalModel(onProgress);
  _neuralOn = true;
}

/**
 * requestCopilotPlan — turn a natural-language request into an executable plan.
 *
 * Backends are tried in order of "most local first":
 *   1. Ollama (a small model running offline on this machine — no key, no internet)
 *   2. Anthropic cloud (only if an API key is configured in the desktop shell)
 *   3. Built-in rule-based planner (always available, fully offline)
 *
 * Every backend returns the same plan shape, so the UI/executor don't care which
 * one answered. This is the "one model, many backends" rule applied to AI.
 */
export async function requestCopilotPlan(input, doc) {
  const system = makeSystemPrompt(doc);

  // 1) Local offline model (Ollama), if reachable.
  const ollama = window.tetrobot?.askOllama;
  if (ollama) {
    try {
      const res = await ollama({ system, prompt: input });
      if (res?.ok && res.text) {
        const plan = normalizePlan(res.text, input, doc);
        return { ...plan, source: 'ollama', note: plan.actions.length ? null : 'Local model returned no action; using planner.' };
      }
    } catch { /* fall through */ }
  }

  // 2) Cloud (Anthropic) if configured.
  const cloud = window.tetrobot?.askAnthropic;
  if (cloud) {
    try {
      const res = await cloud({ system, prompt: input });
      if (res?.ok) return normalizePlan(res.text, input, doc);
    } catch { /* fall through */ }
  }

  // 3) Built-in rule-based planner (precise for parameterised commands).
  const base = localPlan(input, doc);
  if (base.actions.length) return base;

  // 4) On-device neural model recovers intents the rules missed (paraphrases).
  if (_neuralOn) {
    try {
      const sem = await semanticPlan(input, doc);
      if (sem && sem.actions.length) return sem;
    } catch { /* fall through to base */ }
  }
  return base;
}

/** Probe whether a local offline model is available (for the UI badge). */
export async function localModelStatus() {
  try {
    const s = await window.tetrobot?.ollamaStatus?.();
    if (s?.ok) return { available: true, model: s.model, models: s.models ?? [] };
  } catch { /* ignore */ }
  return { available: false };
}