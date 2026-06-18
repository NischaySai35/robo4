import { localPlan, makeSystemPrompt, normalizePlan } from './aiActions.js';

export async function requestCopilotPlan(input, doc) {
  const desktopClient = window.tetrobot?.askAnthropic;
  if (!desktopClient) return localPlan(input, doc);

  try {
    const res = await desktopClient({
      system: makeSystemPrompt(doc),
      prompt: input,
    });
    if (!res?.ok) {
      return {
        ...localPlan(input, doc),
        note: res?.error || 'Anthropic key is not configured; using local planner.',
      };
    }
    return normalizePlan(res.text, input, doc);
  } catch (err) {
    return {
      ...localPlan(input, doc),
      note: err?.message || 'Cloud planner failed; using local planner.',
    };
  }
}
