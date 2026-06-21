/**
 * localModel — a tiny neural model that runs fully on-device for understanding
 * commands. It uses sentence embeddings (all-MiniLM-L6-v2, ~23 MB quantized) to
 * match what you type to a known intent by MEANING, so paraphrases work ("can you
 * zoom out so I see everything" → fit view) without an LLM or any server.
 *
 * The model + its runtime download once from the HuggingFace CDN, then are cached
 * by the browser/Electron and work offline. Everything here is lazy: the heavy
 * library is only imported the first time the copilot actually needs it.
 */

// Intents the embedding model can recognise. Each has example phrasings; at match
// time we take the best cosine similarity across all phrases of an intent.
const INTENTS = [
  { id: 'fit_view',     phrases: ['fit the view', 'zoom to fit', 'frame the scene', 'center the camera', 'fit to screen', 'show me everything', 'zoom out so I can see all'] },
  { id: 'home_all',     phrases: ['home all modules', 'go to the home position', 'reset the robot', 'reset the pose', 'home everything', 'return to start'] },
  { id: 'add_box',      phrases: ['add a box', 'create a cube', 'new box body', 'put a block in the scene'] },
  { id: 'add_cylinder', phrases: ['add a cylinder', 'create a cylinder', 'new cylinder body'] },
  { id: 'add_sphere',   phrases: ['add a sphere', 'create a ball', 'new sphere body'] },
  { id: 'build_arm',    phrases: ['build a robot arm', 'make an arm', 'create a manipulator with joints', 'generate a serial arm'] },
];

const THRESHOLD = 0.45; // min cosine similarity to accept an intent

let _extractor: any = null;
let _loading: any = null;
let _intentVecs: any = null; // [{ id, vecs: Float32Array[] }]

/** Lazy-load the embedding pipeline and precompute the intent vectors. */
export async function ensureLocalModel(onProgress) {
  if (_extractor) return _extractor;
  if (!_loading) {
    _loading = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false; // fetch from the HF hub, then cache
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        dtype: 'q8',
        progress_callback: onProgress,
      });
      const embed = async (t) => (await extractor(t, { pooling: 'mean', normalize: true })).data;
      _intentVecs = [];
      for (const intent of INTENTS) {
        const vecs: any[] = [];
        for (const p of intent.phrases) vecs.push(await embed(p));
        _intentVecs.push({ id: intent.id, vecs });
      }
      _extractor = extractor;
      return extractor;
    })();
  }
  return _loading;
}

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** Classify text → { intent, score } using the loaded model, or null. */
export async function classifyIntent(text) {
  if (!_extractor || !_intentVecs) return null;
  const v = (await _extractor(text, { pooling: 'mean', normalize: true })).data;
  let best: any = null;
  for (const { id, vecs } of _intentVecs) {
    for (const iv of vecs) {
      const score = dot(v, iv); // vectors are normalised → cosine = dot
      if (!best || score > best.score) best = { intent: id, score };
    }
  }
  return best;
}

/**
 * Turn text into an executable plan using the neural classifier (+ a little number
 * extraction). Returns a plan { reply, actions, source } or null if not confident.
 */
export async function semanticPlan(text, doc) {
  const hit = await classifyIntent(text);
  if (!hit || hit.score < THRESHOLD) return null;

  const n = Object.keys(doc.bodies).length;
  const pos = [n * 1.1, 0.6, 3.5];
  const num = (text.match(/(\d+)/) || [])[1];

  switch (hit.intent) {
    case 'fit_view':     return plan('Fitting the view.', [{ type: 'fit_view' }]);
    case 'home_all':     return plan('Homing all modules.', [{ type: 'home_all' }]);
    case 'add_box':      return plan('Adding a box.', [{ type: 'add_primitive', shape: 'box', position: pos }]);
    case 'add_cylinder': return plan('Adding a cylinder.', [{ type: 'add_primitive', shape: 'cylinder', position: pos }]);
    case 'add_sphere':   return plan('Adding a sphere.', [{ type: 'add_primitive', shape: 'sphere', position: pos }]);
    case 'build_arm': {
      const joints = Math.max(1, Math.min(12, parseInt(num ?? '3', 10) || 3));
      return plan(`Building a ${joints}-joint arm.`, [{ type: 'build_serial_arm', joints }]);
    }
    default: return null;
  }
}

const plan = (reply, actions) => ({ reply, actions, source: 'neural' });
