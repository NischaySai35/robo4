/**
 * TrainingPanel — industry-grade robot training pipeline.
 *
 * TABS:
 *   SETUP  — task type, robot config, reward shaping
 *   TRAIN  — algorithm (ES / CMA-ES / BC), architecture, run/stop/watch, live curve
 *   DEMOS  — record demonstrations for BC (IK-generated or waypoint-based)
 *   SKILLS — saved skill library (run, delete, export)
 *   CLOUD  — VLM goal parser (OpenAI / Anthropic), HuggingFace inference (scaffold)
 *
 * Algorithms (in-browser, no GPU required):
 *   ES      — Evolution Strategies: robust, fast, works for any task
 *   CMA-ES  — Covariance Matrix Adaptation: adapts search shape, ~2× faster for manipulation
 *   BC      — Behavioral Cloning: supervised learning from demonstrations (fastest when demos exist)
 *
 * Cloud / GPU features (API key required):
 *   VLM goal parser — send natural-language instruction → 3D target (OpenAI / Anthropic)
 *   HuggingFace     — SmolVLA / Octo inference (planned)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './TrainingPanel.css';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useTrainingStore } from '@/state/trainingStore';
import { chainJoints } from '@/kinematics/modelIK';
import { computeFK } from '@/kinematics/modelFK';
import { ModelReachTask, REACH_DEFAULT_WEIGHTS } from '@/robotics/rl/modelTask';
import { ModelLocomotionTask, LOCO_DEFAULT_WEIGHTS } from '@/robotics/rl/locomotionTask';
import { NavigationTask, NAV_DEFAULT_WEIGHTS } from '@/robotics/rl/navigationTask';
import { PoseTask, POSE_DEFAULT_WEIGHTS } from '@/robotics/rl/poseTask';
import { AssembleTask, ASSEMBLE_DEFAULT_WEIGHTS, type AssembleGoalShape } from '@/robotics/rl/assembleTask';
import { initPhysics } from '@/robotics/rl/physicsWorld';
import { VectorESTrainer, makeRng } from '@/robotics/rl/vectorTrainer';
import { CMATrainer } from '@/robotics/rl/cmaTrainer';
import { BCTrainer, BCNet, makeReachDemo, makeNavDemo, type Demo } from '@/robotics/rl/bcTrainer';
import { LinearPolicy, MLPPolicy, policyFromSpec, type Policy } from '@/robotics/rl/policy';
import { putSkill, getSkill } from '@/robotics/rl/policyStore';
import { withJointValues } from '@/control/motionRuntime';
import type { Task } from '@/robotics/rl/task';
import { ObsNormalizer, NormalizedObsTask } from '@/robotics/rl/obsNormalizer';
import { CurriculumScheduler, REACH_CURRICULUM, NAV_CURRICULUM, LOCO_CURRICULUM, POSE_CURRICULUM, ASSEMBLE_CURRICULUM } from '@/robotics/rl/curriculum';
import { TopologyAwareTask, TOPO_OBS_DIM } from '@/robotics/rl/topologyEncoder';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'setup' | 'train' | 'demos' | 'skills' | 'cloud';
type TaskType = 'reach' | 'locomote' | 'navigate' | 'pose' | 'assemble';
type AlgoType = 'es' | 'cma' | 'bc';
type ArchType = 'linear' | 'mlp-s' | 'mlp-m' | 'mlp-l';

const ARCH_HIDDEN: Record<ArchType, number[]> = {
  linear: [],
  'mlp-s': [24, 24],
  'mlp-m': [64, 64],
  'mlp-l': [128, 128],
};

const TASK_WEIGHTS: Record<TaskType, Record<string, number>> = {
  reach: { ...REACH_DEFAULT_WEIGHTS },
  locomote: { ...LOCO_DEFAULT_WEIGHTS },
  navigate: { ...NAV_DEFAULT_WEIGHTS },
  pose: { ...POSE_DEFAULT_WEIGHTS },
  assemble: { ...ASSEMBLE_DEFAULT_WEIGHTS },
};

const TASK_REWARD_FIELDS: Record<TaskType, { key: string; label: string; min: number; max: number }[]> = {
  reach: [
    { key: 'progress', label: 'Progress (move closer)', min: 0, max: 30 },
    { key: 'success',  label: 'Success bonus',          min: 0, max: 20 },
    { key: 'control',  label: 'Control penalty',        min: -0.2, max: 0 },
    { key: 'alive',    label: 'Time penalty',           min: -0.1, max: 0 },
    { key: 'collision',label: 'Self-collision penalty', min: -2,   max: 0 },
  ],
  locomote: [
    { key: 'forward',  label: 'Forward progress (+X)',  min: 0,  max: 60 },
    { key: 'upright',  label: 'Stay upright',           min: 0,  max: 3  },
    { key: 'energy',   label: 'Energy penalty',         min: -0.1, max: 0 },
    { key: 'fell',     label: 'Fall penalty',           min: -20, max: 0 },
  ],
  navigate: [
    { key: 'progress', label: 'Progress to goal',       min: 0,    max: 30 },
    { key: 'align',    label: 'Heading alignment',      min: 0,    max: 5  },
    { key: 'control',  label: 'Smoothness penalty',     min: -0.2, max: 0  },
    { key: 'arrive',   label: 'Arrival bonus',          min: 0,    max: 20 },
  ],
  pose: [
    { key: 'match',    label: 'Pose accuracy',          min: -20,  max: 0  },
    { key: 'arrive',   label: 'Target reached bonus',   min: 0,    max: 20 },
    { key: 'control',  label: 'Smoothness penalty',     min: -0.1, max: 0  },
  ],
  assemble: [
    { key: 'progress', label: 'Progress (connectors closer)', min: 0,    max: 30 },
    { key: 'align',    label: 'Facing alignment',             min: 0,    max: 3  },
    { key: 'connect',  label: 'Connector snap bonus',         min: 0,    max: 20 },
    { key: 'success',  label: 'Full assembly bonus',          min: 0,    max: 40 },
    { key: 'control',  label: 'Control penalty',              min: -0.2, max: 0  },
    { key: 'alive',    label: 'Time penalty',                 min: -0.1, max: 0  },
  ],
};

// ── Known model lists (fallback when API key not set or fetch fails) ──────────
type Provider = 'openai' | 'anthropic' | 'gemini' | 'huggingface';

const KNOWN_MODELS: Record<Provider, string[]> = {
  openai: [
    'gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview', 'gpt-4.1', 'gpt-4.1-mini',
    'o4-mini', 'o3', 'o3-mini', 'o1', 'o1-mini',
  ],
  anthropic: [
    'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001',
    'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  gemini: [
    'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash',
    'gemini-1.5-pro', 'gemini-1.5-flash',
  ],
  huggingface: [
    'meta-llama/Llama-3.1-8B-Instruct', 'meta-llama/Llama-3.3-70B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.3', 'Qwen/Qwen2.5-7B-Instruct',
    'microsoft/Phi-3.5-mini-instruct',
  ],
};

const PROVIDER_KEY_HINT: Record<Provider, string> = {
  openai:       'sk-…  (from platform.openai.com/api-keys)',
  anthropic:    'sk-ant-…  (from console.anthropic.com/settings/keys)',
  gemini:       'AIza…  (from aistudio.google.com/apikey)',
  huggingface:  'hf_…  (from huggingface.co/settings/tokens)',
};

const PROVIDER_FETCH_CAPABLE: Record<Provider, boolean> = {
  openai: true, anthropic: false, gemini: true, huggingface: true,
};

const ALGO_INFO: Record<AlgoType, { label: string; desc: string; badge: string }> = {
  es:  { label: 'ES (Evolution Strategies)', badge: 'Robust', desc: 'Runs N parallel virtual robots, keeps what works. No gradient needed. Best for: getting started, noisy rewards, any task type.' },
  cma: { label: 'CMA-ES (Adaptive)', badge: 'Recommended', desc: 'Adapts the mutation shape to your fitness landscape — ~2× faster than plain ES for manipulation tasks. Still no GPU needed.' },
  bc:  { label: 'BC (Behavioral Cloning)', badge: 'From demos', desc: 'Supervised learning from demonstrations. Record waypoints, IK generates a trajectory, and BC trains the policy by imitation. Fastest when good demos exist.' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrainingPanel() {
  const selectedId = useSelectionStore((s) => s.kind === 'body' ? s.selectedId : null);
  const doc = useModelStore((s) => s.doc);
  // When the workspace is grounded (rigid mode), the reach/pose chain must span the
  // GRAPH from the grounded base to the tip — otherwise only the tip's tree-ancestors
  // (often just the top joints) move.
  const rigidRoot = useWorkspaceStore((s) => (s.bodyMode === 'rigid' ? s.activeBodyId : null));
  const target = useTrainingStore((s) => s.target);
  const picking = useTrainingStore((s) => s.picking);
  const running = useTrainingStore((s) => s.running);

  // Tab state
  const [tab, setTab] = useState<Tab>('setup');

  // Task config
  const [taskType, setTaskType] = useState<TaskType>('reach');
  const [weights, setWeights] = useState<Record<string, number>>({ ...REACH_DEFAULT_WEIGHTS });
  const [assembleShape, setAssembleShape] = useState<AssembleGoalShape>('chain');

  // Algorithm + architecture
  const [algo, setAlgo] = useState<AlgoType>('cma');
  const [arch, setArch] = useState<ArchType>('mlp-s');
  const [pop, setPop] = useState(32);
  const [sigma, setSigma] = useState(0.5);
  const [bcLr, setBcLr] = useState(0.001);

  // Training state
  const [training, setTraining] = useState(false);
  const [stat, setStat] = useState<{ gen: number; ret: number; best: number } | null>(null);
  const [log, setLog] = useState('');
  const [diag, setDiag] = useState<string[]>([]); // rolling per-term reward breakdown
  const [hasSkill, setHasSkill] = useState(false);

  // Demo state
  const [demos, setDemos] = useState<Demo[]>([]);
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [bcEpoch, setBcEpoch] = useState<{ epoch: number; loss: number } | null>(null);

  // Cloud state
  const [vlmText, setVlmText] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('tr-api-key') ?? '');
  const [apiProvider, setApiProvider] = useState<Provider>(() => (localStorage.getItem('tr-api-provider') as Provider) ?? 'openai');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [vlmLoading, setVlmLoading] = useState(false);
  const [hfEndpoint, setHfEndpoint] = useState('');
  const [cloudLog, setCloudLog] = useState('');

  // Training enhancers
  const [useObsNorm,   setUseObsNorm]   = useState(true);
  const [useCurriculum, setUseCurriculum] = useState(false);
  const [useTopoObs,   setUseTopoObs]   = useState(false);
  const [currStage, setCurrStage] = useState(0);
  const [currLabel, setCurrLabel] = useState('');

  const effectiveModels = availableModels.length ? availableModels : KNOWN_MODELS[apiProvider];
  const effectiveModel = selectedModel || effectiveModels[0] || '';

  // Refs (survive renders, safe in RAF loops)
  const trainerRef = useRef<VectorESTrainer | CMATrainer | null>(null);
  const bcRef = useRef<BCTrainer | null>(null);
  const timerRef = useRef<any>(null);
  const rafRef = useRef<any>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const curveRef = useRef<number[][]>([[], []]);
  const importRef = useRef<HTMLInputElement | null>(null);
  const normRef   = useRef<ObsNormalizer | null>(null);
  const currRef   = useRef<CurriculumScheduler | null>(null);
  const trainedTipRef = useRef<string | null>(null); // tip body used at train time (survives deselection)

  // Derived
  const tipId = selectedId && chainJoints(doc, selectedId, rigidRoot).length ? selectedId : null;
  const tipName = tipId ? doc.bodies[tipId]?.name : null;
  const joints = Object.values(doc.joints);
  const assembleModules = Object.values(doc.components ?? {}).filter((c) =>
    Object.values(doc.bodies).some((b) => b.componentId === c.id && ((b.meta?.connectors as unknown[] | undefined)?.length ?? 0) > 0));
  const ready = taskType === 'reach' ? !!tipId
    : taskType === 'locomote' ? joints.length > 0
    : taskType === 'navigate' ? Object.keys(doc.bodies).length > 0
    : taskType === 'pose' ? !!tipId
    : taskType === 'assemble' ? assembleModules.length >= 2
    : false;

  function chooseTask(t: TaskType) {
    setTaskType(t);
    setWeights({ ...TASK_WEIGHTS[t] });
  }

  useEffect(() => {
    setHasSkill(!!getSkill(doc as any, _skillName(taskType)));
  }, [doc, taskType]);

  useEffect(() => () => { stopAll(); }, []);

  // The TRAIN tab content unmounts when you switch tabs. On returning, re-attach the
  // uPlot chart to the fresh host div so a previously-recorded training curve reappears
  // (rather than an empty gap). Runs after the tab's DOM has mounted.
  useEffect(() => {
    if (tab !== 'train') return;
    const id = requestAnimationFrame(() => { ensurePlot(); plotRef.current?.setData(curveRef.current as any); });
    return () => cancelAnimationFrame(id);
  }, [tab]);

  // ── Task factory ─────────────────────────────────────────────────────────────

  const TASK_CURRICULA = {
    reach: REACH_CURRICULUM, navigate: NAV_CURRICULUM,
    locomote: LOCO_CURRICULUM, pose: POSE_CURRICULUM, assemble: ASSEMBLE_CURRICULUM,
  };

  function makeBaseTask(): Task {
    const w = weights;
    const curr = currRef.current;
    const navR = curr ? curr.current().arenaRadius : 2.5;
    switch (taskType) {
      case 'reach':    return new ModelReachTask(doc, tipId!, { weights: w, rigidRoot });
      case 'locomote': return new ModelLocomotionTask(doc, { weights: w });
      case 'navigate': return new NavigationTask({ weights: w, arenaRadius: navR });
      case 'pose':     return new PoseTask(doc, tipId!, undefined, { weights: w, rigidRoot });
      case 'assemble': return new AssembleTask(doc, {
        weights: w, goalShape: assembleShape,
        moduleComponentIds: assembleModules.map((c) => c.id),
        maxSteps: curr ? curr.current().maxSteps : undefined,
        scatterRadius: curr ? curr.current().targetRadius : undefined,
      });
    }
  }

  function makeTask(): Task {
    let task: Task = makeBaseTask();
    if (useTopoObs) task = new TopologyAwareTask(task, doc);
    if (useObsNorm && normRef.current) task = new NormalizedObsTask(task, normRef.current);
    return task;
  }

  /** Wrap a freshly-built base task with the SAME observation enhancers that were
   *  active during training (TopoObs + ObsNorm), so a trained policy receives
   *  observations in the exact distribution it learned on. Without this, a policy
   *  trained with ObsNorm (on by default) gets raw, out-of-distribution obs at watch
   *  time and produces near-zero actions → "nothing moves". We keep the base task
   *  reference for reading joint/pose state; only the policy's obs flow through here. */
  function wrapForPolicy(base: Task): Task {
    let t: Task = base;
    if (useTopoObs) t = new TopologyAwareTask(t, doc);
    if (useObsNorm && normRef.current) t = new NormalizedObsTask(t, normRef.current);
    return t;
  }

  function makePolicy(task: Task): Policy {
    const hidden = ARCH_HIDDEN[arch];
    if (hidden.length === 0) return new LinearPolicy(task.obsDim, task.actionDim);
    return new MLPPolicy(task.obsDim, task.actionDim, hidden);
  }

  function _skillName(t: TaskType) {
    return { reach: 'reach', locomote: 'walk', navigate: 'navigate', pose: 'pose', assemble: 'assemble' }[t];
  }

  // ── Plot ──────────────────────────────────────────────────────────────────────

  function ensurePlot() {
    const host = hostRef.current;
    if (!host) return;
    // If a plot already lives inside the CURRENT host div, keep it. Otherwise the
    // old instance is orphaned in a destroyed DOM node (happens after switching
    // tabs away from TRAIN and back, since the tab content unmounts) — rebuild it
    // in the fresh host and restore whatever curve we have so far.
    if (plotRef.current) {
      if (host.contains(plotRef.current.root)) return;
      plotRef.current.destroy();
      plotRef.current = null;
    }
    plotRef.current = new uPlot(
      {
        width: host.clientWidth || 280, height: 120,
        scales: { x: { time: false } },
        legend: { show: false },
        series: [{ label: 'gen' }, { label: 'return', stroke: '#22c55e', width: 1.8, points: { show: false } }],
        axes: [{ stroke: '#555' }, { stroke: '#555' }],
      },
      curveRef.current as any,
      host,
    );
  }

  function pushCurve(gen: number, ret: number) {
    const c = curveRef.current; c[0].push(gen); c[1].push(ret);
    plotRef.current?.setData(c as any);
  }

  // ── Training ──────────────────────────────────────────────────────────────────

  async function startTraining() {
    if (!ready) { setLog(_notReadyMsg()); return; }
    stopAll();
    setDiag([]); // fresh diagnostics for this run
    trainedTipRef.current = tipId; // remember the tip so Diagnose/Watch work after deselect

    if (taskType === 'locomote') { setLog('Initialising physics…'); await initPhysics(); }
    if (algo === 'bc') { startBC(); return; }

    // Initialise obs normalizer (determine obsDim from a probe task)
    if (useCurriculum) {
      currRef.current = new CurriculumScheduler(TASK_CURRICULA[taskType]);
      setCurrStage(0);
      setCurrLabel(TASK_CURRICULA[taskType][0].label);
    } else {
      currRef.current = null;
      setCurrLabel('');
    }
    const probeBase = makeBaseTask();
    const probeObsDim = probeBase.obsDim + (useTopoObs ? TOPO_OBS_DIM : 0);
    normRef.current = useObsNorm ? new ObsNormalizer(probeObsDim) : null;

    ensurePlot(); curveRef.current = [[], []];
    const probe = makeTask();
    const policy = makePolicy(probe);
    const maxGen = taskType === 'locomote' ? 200 : 150;
    const enhancers = [useObsNorm && 'ObsNorm', useTopoObs && 'TopoObs', useCurriculum && 'Curriculum']
      .filter(Boolean).join('+');

    function handleGenResult(r: { evalReturn: number; best: number }, gen: number, done: () => void) {
      setStat({ gen, ret: r.evalReturn, best: r.best });
      pushCurve(gen, r.evalReturn);
      // Capture a per-term reward breakdown periodically so the stuck score is explainable.
      if (gen === 1 || gen % 10 === 0) pushDiag(diagnose(`g${gen}`));
      // Curriculum update
      const curr = currRef.current;
      if (curr) {
        const advanced = curr.update(r.evalReturn);
        if (advanced) {
          setCurrStage(curr.stageIndex());
          setCurrLabel(curr.current().label);
          setLog(`Curriculum → Stage ${curr.stageIndex() + 1}/${curr.stageCount()}: "${curr.current().label}"`);
          // Update reach target radius if applicable
          if (taskType === 'reach') {
            const r2 = curr.current().targetRadius;
            const rng = Math.random;
            const theta = rng() * Math.PI * 2, phi = rng() * Math.PI;
            const x = r2 * Math.sin(phi) * Math.cos(theta);
            const y = Math.max(0.05, Math.abs(r2 * Math.cos(phi)));
            const z = r2 * Math.sin(phi) * Math.sin(theta);
            useTrainingStore.getState().setTarget([x, y, z]);
          }
        }
      }
      if (gen >= maxGen) done();
    }

    if (algo === 'cma') {
      const trainer = new CMATrainer(makeTask, policy, { sigma, episodesPerEval: 2, seed: 1234 });
      trainerRef.current = trainer as any;
      setTraining(true);
      setLog(`CMA-ES · ${taskType} · pop=${trainer.lambda} λ · D=${trainer.D} params${enhancers ? ' · ' + enhancers : ''}`);
      timerRef.current = setInterval(() => {
        const r = trainer.generation();
        handleGenResult(r, trainer.gen, stopTraining);
      }, 30);
    } else {
      const trainer = new VectorESTrainer(makeTask, policy, { pop, sigma, episodesPerEval: taskType === 'locomote' ? 1 : 2, seed: 1234 });
      trainerRef.current = trainer;
      setTraining(true);
      setLog(`ES · ${taskType} · pop=${pop} · D=${policy.nParams} params${enhancers ? ' · ' + enhancers : ''}`);
      timerRef.current = setInterval(() => {
        const r = trainer.generation();
        handleGenResult(r, trainer.gen, stopTraining);
      }, 30);
    }
  }

  function startBC() {
    if (demos.length === 0) {
      setLog('No demonstrations yet — go to the DEMOS tab to record some.');
      return;
    }
    const totalPairs = demos.reduce((s, d) => s + d.pairs.length, 0);
    if (totalPairs < 10) { setLog('Need at least 10 demo pairs. Add more demos.'); return; }

    // Build BCNet from first demo's obs/action dims
    const obsD = demos[0].pairs[0].obs.length;
    const actD = demos[0].pairs[0].action.length;
    const hidden = ARCH_HIDDEN[arch].length ? ARCH_HIDDEN[arch] : [32, 32];
    const trainer = new BCTrainer(obsD, actD, hidden);
    for (const d of demos) trainer.addDemo(d);
    bcRef.current = trainer;

    ensurePlot(); curveRef.current = [[], []];
    setTraining(true);
    setLog(`BC · ${totalPairs} pairs · ${obsD}→${actD} policy · Adam lr=${bcLr}`);

    let ep = 0;
    const maxEp = 300;
    timerRef.current = setInterval(() => {
      const loss = trainer.trainEpoch(bcLr, 32);
      ep++;
      setStat({ gen: ep, ret: -loss, best: -trainer.loss });
      pushCurve(ep, -loss);
      setBcEpoch({ epoch: ep, loss });
      if (ep >= maxEp || loss < 1e-4) stopTraining();
    }, 20);
  }

  function stopTraining() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTraining(false);
    if (algo === 'bc' && bcRef.current) {
      setLog(`BC done · epoch ${bcRef.current.epoch} · loss ${bcRef.current.loss.toExponential(2)}`);
    } else if (trainerRef.current) {
      setLog(`Stopped gen ${trainerRef.current.gen} · best ${trainerRef.current.best.toFixed(2)}`);
    }
  }

  function stopAll() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }

  function _notReadyMsg(): string {
    if (taskType === 'reach' || taskType === 'pose') return 'Select a body on a movable joint chain first.';
    if (taskType === 'locomote') return 'Add joints to the robot first.';
    return 'Add at least one body first.';
  }

  // ── Watch ─────────────────────────────────────────────────────────────────────

  function getTrainedPolicy(): Policy | null {
    if (algo === 'bc' && bcRef.current) return bcRef.current.trained();
    if (trainerRef.current) return trainerRef.current.trained();
    return null;
  }

  function watch(policy?: Policy | null) {
    const p = policy ?? getTrainedPolicy();
    if (!p) { setLog('Train first (or load a saved skill).'); return; }
    stopAll();

    if (taskType === 'reach' || taskType === 'pose') watchReach(p);
    else if (taskType === 'locomote') watchLoco(p);
    else if (taskType === 'navigate') watchNav(p);
  }

  function watchReach(policy: Policy) {
    const useTip = tipId ?? getSkill(doc as any, 'reach')?.robotId;
    if (!useTip) { setLog('Select the arm tip body.'); return; }
    const base = taskType === 'pose'
      ? new PoseTask(doc, useTip, undefined, { weights, rigidRoot })
      : new ModelReachTask(doc, useTip, { weights, rigidRoot });
    if (policy.actionDim !== base.actionDim) {
      setLog(`Policy has ${policy.actionDim} joints; selected chain has ${base.actionDim}.`);
      return;
    }
    // Use the target the user PLACED (reach task) — clamped into the arm's reachable
    // sphere so a far point becomes "reach as far toward it as you physically can",
    // instead of leaving Watch to chase an invisible random target.
    const placed = useTrainingStore.getState().target;
    let fixedTarget: [number, number, number] | undefined;
    if (placed && base instanceof ModelReachTask) {
      const c = base.workspaceCenter(), R = base.reachRadius() * 0.98;
      const dx = placed[0] - c[0], dy = placed[1] - c[1], dz = placed[2] - c[2];
      const d = Math.hypot(dx, dy, dz) || 1;
      fixedTarget = d <= R ? [placed[0], placed[1], placed[2]]
        : [c[0] + dx / d * R, c[1] + dy / d * R, c[2] + dz / d * R];
    }
    base.reset(makeRng(Date.now() & 0xffff), { randomizeStart: false, target: fixedTarget } as any);
    const task = wrapForPolicy(base);           // policy sees the same obs it trained on
    const ids = (base as ModelReachTask).jointIds?.() ?? (base as PoseTask).jointIds?.();
    let obs = task.observe(), step = 0;
    setLog(fixedTarget ? 'Reaching toward your placed target…' : 'Reaching a random target (place one in Setup to aim it)…');
    const tick = () => {
      const out = task.act(policy.forward(obs));
      obs = task.observe();
      const vals: Record<string, number> = {};
      const cv = (base as any).currentValues?.();
      ids?.forEach((id: string, i: number) => { if (cv) vals[id] = cv[i]; });
      if (ids) useModelStore.getState().applyTransient((d) => withJointValues(d, vals));
      step++;
      // Reaching a fixed target: keep holding at the closest pose (don't stop at maxSteps)
      // so you can see where it settled; stop only on success or a long safety cap.
      const dist = (base as ModelReachTask).tipDistance?.() ?? 0;
      if (out.done && dist < 0.06) { setLog(`Reached · ${(dist * 100).toFixed(1)} cm from target.`); return; }
      if (step > (fixedTarget ? 600 : 250)) { setLog(`Closest it got: ${(dist * 100).toFixed(1)} cm from target.`); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function watchLoco(policy: Policy) {
    initPhysics().then(() => {
      const locoTask = new ModelLocomotionTask(doc, { weights });
      locoTask.reset(makeRng(Date.now() & 0xffff));
      const task = wrapForPolicy(locoTask);       // policy sees the same obs it trained on
      const baseId = locoTask.baseBodyId(); const ids = locoTask.jointIds();
      let obs = task.observe(), step = 0;
      const tick = () => {
        const out = task.act(policy.forward(obs)); obs = task.observe();
        const base = locoTask.basePose(); const tv = locoTask.jointTargets();
        const vals: Record<string, number> = {};
        ids.forEach((id, i) => { vals[id] = tv[i]; });
        useModelStore.getState().applyTransient((d) => {
          let nd = withJointValues(d, vals);
          const b = nd.bodies[baseId];
          if (b) nd = { ...nd, bodies: { ...nd.bodies, [baseId]: { ...b, transform: { ...b.transform, position: base.position, quaternion: base.quaternion } } } };
          return nd;
        });
        step++;
        if (out.done || step > 400) { setLog(`Walked to x=${out.info?.x?.toFixed(2)} m`); locoTask.dispose(); return; }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  }

  function watchNav(policy: Policy) {
    // Find root body (no parent joint → the chassis)
    const parentBodyIds = new Set(Object.values(doc.joints).map((j: any) => j.childBodyId).filter(Boolean));
    const rootId = Object.keys(doc.bodies).find(id => !parentBodyIds.has(id));
    if (!rootId) { setLog('No root body (chassis) found.'); return; }

    const navTask = new NavigationTask({ weights });
    navTask.reset(makeRng(Date.now() & 0xffff));
    const task = wrapForPolicy(navTask);         // policy sees the same obs it trained on
    const goal = navTask.currentGoal();
    let obs = task.observe(), step = 0;
    setLog(`Navigating to (${goal.x.toFixed(2)}, ${goal.y.toFixed(2)}) m…`);

    const tick = () => {
      const out = task.act(policy.forward(obs)); obs = task.observe();
      const pose = navTask.currentPose();
      useModelStore.getState().applyTransient((d) => {
        const body = d.bodies[rootId];
        if (!body) return d;
        const hy = pose.heading / 2;
        return {
          ...d,
          bodies: {
            ...d.bodies,
            [rootId]: {
              ...body,
              transform: {
                ...body.transform,
                position: [pose.x, body.transform?.position?.[1] ?? 0, pose.y] as [number, number, number],
                quaternion: [0, Math.sin(hy), 0, Math.cos(hy)] as [number, number, number, number],
              },
            },
          },
        };
      });
      step++;
      if (out.done || step > 400) { setLog(`Arrived at dist ${out.info?.dist?.toFixed(3)} m in ${step} steps.`); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  // ── Diagnostics: per-term reward breakdown ──────────────────────────────────────
  /** Replay ONE deterministic episode with the current best policy and sum each
   *  reward term's WEIGHTED contribution, so you can see exactly what's pushing the
   *  score down (e.g. collision penalty vs. lack of progress). Returns a log line. */
  function diagnose(tag = ''): string | null {
    const p = getTrainedPolicy();
    if (!p) return `${tag}  — no trained policy yet. Click ▶ Train first.`;
    // Only reach/pose expose per-term info today (that's what surfaces `terms`).
    if (taskType !== 'reach' && taskType !== 'pose') {
      return `${tag}  — per-term breakdown is available for reach/pose tasks only.`;
    }
    const useTip = tipId ?? trainedTipRef.current ?? getSkill(doc as any, 'reach')?.robotId;
    if (!useTip) return `${tag}  — no tip body. Select the arm-tip body in the 3D view, then Diagnose.`;
    const base = taskType === 'pose'
      ? new PoseTask(doc, useTip, undefined, { weights, rigidRoot })
      : new ModelReachTask(doc, useTip, { weights, rigidRoot });
    if (p.actionDim !== base.actionDim) {
      return `${tag}  — joint mismatch: policy has ${p.actionDim}, this chain has ${base.actionDim}. Re-train on this body.`;
    }
    base.reset(makeRng(20260704), { randomizeStart: false } as any); // fixed seed → comparable across gens
    const task = wrapForPolicy(base);
    let obs = task.observe();
    const acc: Record<string, number> = {};
    let steps = 0, collided = 0, total = 0, done = false, lastDist = 0;
    for (let s = 0; s < base.maxSteps; s++) {
      const out = task.act(p.forward(obs));
      obs = task.observe();
      total += out.reward; steps++;
      const t = (out.info as any)?.terms as Record<string, number> | undefined;
      if (t) for (const k of Object.keys(t)) acc[k] = (acc[k] ?? 0) + (weights[k] ?? 0) * t[k];
      if ((out.info as any)?.collided) collided++;
      lastDist = (out.info as any)?.dist ?? lastDist;
      if (out.done) { done = true; break; }
    }
    const parts = Object.entries(acc)
      .sort((a, b) => a[1] - b[1]) // most-negative (biggest drag) first
      .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v.toFixed(1)}`)
      .join('  ');
    const g = trainerRef.current?.gen ?? 0;
    const reached = done && lastDist < 0.06; // done can also mean "ran out of steps"
    return `${tag || `g${g}`}  Σ${total.toFixed(1)}  [${parts}]  collide ${collided}/${steps}${reached ? ' ✓reached' : ''}  end ${lastDist.toFixed(3)}m`;
  }

  function pushDiag(line: string | null) {
    if (!line) return;
    setDiag((d) => [...d.slice(-49), line]); // keep last 50 lines
  }

  // ── Save / load skill ─────────────────────────────────────────────────────────

  function saveSkill() {
    const p = getTrainedPolicy();
    if (!p) { setLog('Train first.'); return; }
    const name = _skillName(taskType);
    const meta: any = {
      generations: trainerRef.current?.gen ?? bcRef.current?.epoch ?? 0,
      bestReturn: trainerRef.current?.best ?? -(bcRef.current?.loss ?? 0),
      trainedAt: Date.now(),
      algo,
    };
    const skill = { name, robotId: tipId ?? undefined, policy: p.spec(), task: taskType, rewardWeights: weights, meta };
    useModelStore.getState().applyTransient((d) => putSkill(d as any, skill) as any);
    setHasSkill(true);
    setLog(`Saved skill "${name}" (${meta.generations} iters, algo=${algo}).`);
  }

  function runSaved() {
    const s = getSkill(doc as any, _skillName(taskType));
    if (!s) { setLog('No saved skill.'); return; }
    watch(policyFromSpec(s.policy));
  }

  function deleteSaved() {
    setLog('Delete skill: remove from model not yet wired in this build.');
  }

  // ── Run to target ─────────────────────────────────────────────────────────────

  const setAxis = (i: number, v: number) => {
    const t: [number, number, number] = [...(target ?? [0, 0, 0])] as [number, number, number];
    t[i] = v;
    useTrainingStore.getState().setTarget(t);
  };

  function runToTarget() {
    const tgt = useTrainingStore.getState().target;
    if (!tgt) { setLog('Place a target first.'); return; }
    const p = getTrainedPolicy() ?? (hasSkill ? policyFromSpec(getSkill(doc as any, 'reach')!.policy) : null);
    if (!p) { setLog('Train a reach brain first.'); return; }
    const useTip = tipId ?? getSkill(doc as any, 'reach')?.robotId;
    if (!useTip) { setLog('Select the arm tip.'); return; }
    const base = new ModelReachTask(doc, useTip, { weights, rigidRoot });
    if (p.actionDim !== base.actionDim) { setLog(`Mismatch: ${p.actionDim} vs ${base.actionDim} joints.`); return; }
    stopAll();
    base.reset(makeRng(1), { randomizeStart: false, target: tgt } as any);
    const task = wrapForPolicy(base);            // policy sees the same obs it trained on
    const ids = base.jointIds();
    useTrainingStore.getState().setRunning(true);
    let frame = 0;
    const tick = () => {
      const st = useTrainingStore.getState();
      if (!st.running || !st.target) { useTrainingStore.getState().setRunning(false); return; }
      base.setTarget(st.target);
      task.act(p.forward(task.observe()));
      const vals: Record<string, number> = {};
      ids.forEach((id, i) => { vals[id] = base.currentValues()[i]; });
      useModelStore.getState().applyTransient((d) => withJointValues(d, vals));
      if (++frame % 12 === 0) setLog(`Tracking · tip ${base.tipDistance().toFixed(3)} m away`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }
  function stopRun() { useTrainingStore.getState().setRunning(false); stopAll(); }

  // ── Demo recording ────────────────────────────────────────────────────────────

  function recordReachDemo() {
    if (!tipId) { setLog('Select a tip body first.'); return; }
    if (!target) { setLog('Set a reach target first (REACH TO A POINT section).'); return; }
    const fk = computeFK(doc);
    const chain = chainJoints(doc, tipId, rigidRoot);
    if (chain.length === 0) { setLog('No joint chain found.'); return; }

    const startVals = chain.map((j: any) => j.state?.value ?? 0);
    // Compute target joint values using IK approximation via FK end state
    // Simple approach: use current FK tip and target position to compute joint targets
    const tipFn = (vals: number[]): [number, number, number] => {
      const joints: any = { ...doc.joints };
      chain.forEach((j: any, i: number) => { joints[j.id] = { ...j, state: { ...j.state, value: vals[i] } }; });
      const p = computeFK({ ...doc, joints }).get(tipId)?.position ?? [0, 0, 0];
      return [p[0], p[1], p[2]];
    };
    // For IK-like target: move all joints to their midpoint toward limits as a rough "reach" pose
    const midVals = chain.map((j: any) => {
      const lo = j.limit?.lower ?? -Math.PI, hi = j.limit?.upper ?? Math.PI;
      return (lo + hi) / 2;
    });

    const demo = makeReachDemo(startVals, midVals, target, tipFn, `Reach demo #${demos.length + 1}`);
    setDemos(d => [...d, demo]);
    setLog(`Recorded demo "${demo.label}" — ${demo.pairs.length} steps.`);
  }

  function recordNavWaypoint() {
    const t = target;
    if (!t) { setLog('Place a target (3D pick) to add as a nav waypoint.'); return; }
    setWaypoints(w => [...w, [t[0], t[2]]]);  // XZ plane for navigation
    setLog(`Waypoint ${waypoints.length + 1} added: (${t[0].toFixed(2)}, ${t[2].toFixed(2)})`);
  }

  function generateNavDemo() {
    if (waypoints.length === 0) { setLog('Add at least one waypoint first.'); return; }
    const demo = makeNavDemo(waypoints, `Nav demo #${demos.length + 1}`);
    setDemos(d => [...d, demo]);
    setWaypoints([]);
    setLog(`Nav demo recorded — ${demo.pairs.length} steps over ${waypoints.length} waypoints.`);
  }

  function deleteDemo(id: string) {
    setDemos(d => d.filter(x => x.id !== id));
  }

  // ── Provider helpers ──────────────────────────────────────────────────────────

  function saveProviderPrefs(provider: Provider, key: string) {
    localStorage.setItem('tr-api-provider', provider);
    localStorage.setItem('tr-api-key', key);
  }

  // ── Dynamic model fetching ────────────────────────────────────────────────────

  async function fetchAvailableModels() {
    if (!apiKey) { setCloudLog('Enter an API key first.'); return; }
    setFetchingModels(true);
    setCloudLog('Fetching models…');
    try {
      let models: string[] = [];
      if (apiProvider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}`);
        const data = await res.json();
        models = (data.data as any[])
          .map((m: any) => m.id as string)
          .filter((id) => /^(gpt-|o[0-9]|chatgpt-|codex)/i.test(id))
          .sort();
      } else if (apiProvider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!res.ok) throw new Error(`Gemini ${res.status}`);
        const data = await res.json();
        models = (data.models as any[])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => (m.name as string).replace('models/', ''))
          .sort();
      } else if (apiProvider === 'huggingface') {
        // HF Inference API doesn't have a simple model list — use known list
        models = KNOWN_MODELS.huggingface;
      }
      setAvailableModels(models);
      setSelectedModel(models[0] ?? '');
      setCloudLog(`Fetched ${models.length} models.`);
    } catch (e: any) {
      setCloudLog(`Fetch failed: ${e.message}`);
      setAvailableModels([]);
    } finally {
      setFetchingModels(false);
    }
  }

  // ── VLM goal parser (all providers) ──────────────────────────────────────────

  async function parseVlmGoal() {
    if (!apiKey) { setCloudLog('Enter an API key first.'); return; }
    if (!vlmText) { setCloudLog('Enter an instruction.'); return; }
    setVlmLoading(true);
    const model = effectiveModel;
    const sysPrompt = 'You are a robot arm spatial controller. Given a user instruction and workspace bounds, output a target 3D position as JSON only — no explanation, just JSON.';
    const userPrompt = `Workspace (meters): X[-1.0 to 1.0], Y[0.0 to 1.0], Z[-1.0 to 1.0]. Instruction: "${vlmText}". Reply with only: {"x": number, "y": number, "z": number}`;

    try {
      let url = '', headers: Record<string, string> = {}, body: any;
      if (apiProvider === 'openai') {
        url = 'https://api.openai.com/v1/chat/completions';
        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        body = {
          model, max_tokens: 80,
          messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
          response_format: { type: 'json_object' },
        };
      } else if (apiProvider === 'anthropic') {
        url = 'https://api.anthropic.com/v1/messages';
        headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
        body = { model, max_tokens: 80, system: sysPrompt, messages: [{ role: 'user', content: userPrompt }] };
      } else if (apiProvider === 'gemini') {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        headers = { 'Content-Type': 'application/json' };
        body = {
          contents: [{ parts: [{ text: `${sysPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 80 },
        };
      } else {
        // HuggingFace Inference API (text-generation)
        const ep = hfEndpoint || `https://api-inference.huggingface.co/models/${model}`;
        url = ep;
        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        body = { inputs: `${sysPrompt}\n\n${userPrompt}`, parameters: { max_new_tokens: 80, return_full_text: false } };
      }

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`${res.status} ${err.slice(0, 120)}`);
      }
      const data = await res.json();

      let text = '';
      if (apiProvider === 'openai')     text = data.choices?.[0]?.message?.content ?? '';
      else if (apiProvider === 'anthropic') text = data.content?.[0]?.text ?? '';
      else if (apiProvider === 'gemini')    text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      else                                  text = Array.isArray(data) ? (data[0]?.generated_text ?? '') : (data.generated_text ?? '');

      // Extract JSON from possibly-wrapped response
      const jsonMatch = text.match(/\{[^}]*"x"[^}]*\}/s);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number' && typeof parsed.z === 'number') {
        const x = Math.max(-1, Math.min(1, parsed.x));
        const y = Math.max(0,  Math.min(1, parsed.y));
        const z = Math.max(-1, Math.min(1, parsed.z));
        useTrainingStore.getState().setTarget([x, y, z]);
        setCloudLog(`✓ VLM → (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) m — switching to Setup`);
        setTab('setup');
      } else {
        setCloudLog('Could not parse x/y/z from response. Try rephrasing.');
      }
    } catch (e: any) {
      setCloudLog(`Error: ${e.message}`);
    } finally {
      setVlmLoading(false);
    }
  }

  // ── Colab export ──────────────────────────────────────────────────────────────

  function exportToColab() {
    const jCount = Object.values(doc.joints).length;
    const obsDim = taskType === 'reach' ? jCount + 3
      : taskType === 'navigate' ? 5
      : taskType === 'pose' ? jCount * 2
      : jCount + 5;
    const actDim = taskType === 'navigate' ? 2 : jCount;
    const limits = Object.values(doc.joints).map((j: any) =>
      [j.limit?.lower ?? -3.14159, j.limit?.upper ?? 3.14159]);
    const configJson = JSON.stringify({
      taskType, nJoints: jCount, obsDim, actDim,
      limits, weights, tipBodyId: tipId ?? null,
    }, null, 2);

    const pyCode = `import numpy as np, json, math

# ── Robot config exported from Tetrobot ──────────────────────────────────────
config = ${configJson}

task_type = config["taskType"]
n_joints  = config["nJoints"]
obs_dim   = config["obsDim"]
act_dim   = config["actDim"]
limits    = np.array(config["limits"])   # shape [n_joints, 2]
w         = config["weights"]

# ── MLP policy (same architecture as browser) ─────────────────────────────────
HIDDEN = [32, 32]

def make_offsets(obs, act, hidden):
    sizes = [obs] + hidden + [act]
    offs, n = [], 0
    for i in range(len(sizes)-1):
        inp, out = sizes[i], sizes[i+1]
        offs.append((n, n + inp*out, inp, out, i == len(sizes)-2))
        n += inp*out + out
    return offs, n

OFFSETS, N_PARAMS = make_offsets(obs_dim, act_dim, HIDDEN)

def mlp(theta, obs):
    x = np.asarray(obs, dtype=float)
    for (woff, boff, inp, out, last) in OFFSETS:
        W = theta[woff:woff+inp*out].reshape(out, inp)
        b = theta[boff:boff+out]
        z = W @ x + b
        x = np.tanh(z) if last else np.maximum(0, z)
    return x

def clip_action(a):
    return np.clip(a, -1, 1)

# ── Task simulation ───────────────────────────────────────────────────────────
def run_episode(theta, seed=None):
    rng = np.random.default_rng(seed)
    joints = rng.uniform(limits[:, 0], limits[:, 1]) if task_type != "navigate" else None

    if task_type == "reach":
        target = rng.uniform([-0.8, 0.1, -0.8], [0.8, 0.9, 0.8])
        total = 0
        for _ in range(80):
            tip = np.sin(joints) * 0.3          # simple FK approximation
            err = target - tip[:3] if len(tip) >= 3 else target
            obs = np.concatenate([joints, err[:3]])[:obs_dim]
            act = clip_action(mlp(theta, obs))
            joints = np.clip(joints + act * 0.08, limits[:, 0], limits[:, 1])
            dist = float(np.linalg.norm(err))
            total += w.get("progress", 10) * max(0, 0.05 - dist) - dist * 0.1
            if dist < 0.06: total += w.get("success", 5); break
        return total

    elif task_type == "navigate":
        x, y, heading = 0.0, 0.0, rng.uniform(-math.pi, math.pi)
        gx, gy = rng.uniform(-2, 2), rng.uniform(-2, 2)
        total, prev_d = 0, math.hypot(x-gx, y-gy)
        for _ in range(120):
            desired = math.atan2(gy-y, gx-x)
            err = (desired - heading + math.pi) % (2*math.pi) - math.pi
            dist = math.hypot(x-gx, y-gy)
            obs = [math.cos(err), math.sin(err), dist/2.5, 0, 0]
            act = clip_action(mlp(theta, obs))
            heading += act[1]*2*0.05; x += act[0]*1.5*math.cos(heading)*0.05; y += act[0]*1.5*math.sin(heading)*0.05
            total += w.get("progress", 10)*(prev_d-dist); prev_d=dist
            if dist < 0.15: total += w.get("arrive", 10); break
        return total

    elif task_type == "pose":
        target_joints = np.zeros(n_joints)
        total = 0
        for _ in range(80):
            err = target_joints - joints
            obs = np.concatenate([joints, err])[:obs_dim]
            act = clip_action(mlp(theta, obs))
            joints = np.clip(joints + act*0.075, limits[:,0], limits[:,1])
            d = float(np.linalg.norm(err))
            total += w.get("match", 5) * (-d)
            if d < 0.05*math.sqrt(n_joints): total += w.get("arrive", 10); break
        return total

    else:   # locomote (simplified, no Rapier in Python here)
        total = 0
        for step in range(40):
            obs = np.concatenate([joints, [0,1,0,0,0]])[:obs_dim]
            act = clip_action(mlp(theta, obs))
            joints = np.clip(joints + act*0.25, limits[:,0], limits[:,1])
            fwd = float(np.sum(np.sin(joints)) * 0.01)
            total += w.get("forward", 30)*fwd - w.get("energy", 0.02)*float(np.sum(act**2))
        return total

# ── sep-CMA-ES training (same algorithm as browser, but NumPy = much faster) ──
POP   = 64
SIGMA = 0.5
MAX_GENERATIONS = 300

rng_main = np.random.default_rng(1234)
theta    = rng_main.normal(0, 0.1, N_PARAMS)
diagC    = np.ones(N_PARAMS)
ps       = np.zeros(N_PARAMS)
pc       = np.zeros(N_PARAMS)
mu       = POP // 2
raw_w    = np.log(mu + 0.5) - np.log(np.arange(1, mu+1))
weights_arr = raw_w / raw_w.sum()
mueff    = 1.0 / (weights_arr**2).sum()
cc = (4+mueff/N_PARAMS)/(N_PARAMS+4+2*mueff/N_PARAMS)
cs = (mueff+2)/(N_PARAMS+mueff+5)
c1 = 2/((N_PARAMS+1.3)**2+mueff)*(1+1/N_PARAMS)
cmu = min(1-c1, 2*(mueff-2+1/mueff)/((N_PARAMS+2)**2+mueff))*(1+1/N_PARAMS)
damps = 1 + 2*max(0, math.sqrt((mueff-1)/(N_PARAMS+1))-1) + cs
chiN = N_PARAMS**0.5 * (1 - 1/(4*N_PARAMS) + 1/(21*N_PARAMS**2))
best = -1e9

print(f"Training {N_PARAMS} params  pop={POP}  task={task_type}  ({MAX_GENERATIONS} generations)")
for gen in range(MAX_GENERATIONS):
    zs = rng_main.standard_normal((POP, N_PARAMS))
    xs = theta + SIGMA * np.sqrt(diagC) * zs
    rets = np.array([run_episode(xs[k], seed=gen*POP+k) for k in range(POP)])
    order = np.argsort(rets)[::-1]

    newM = weights_arr @ xs[order[:mu]]
    zw   = weights_arr @ zs[order[:mu]]
    ps   = (1-cs)*ps + math.sqrt(cs*(2-cs)*mueff)*zw
    psN  = float(np.linalg.norm(ps))
    SIGMA *= math.exp((cs/damps)*(psN/chiN-1)); SIGMA = min(SIGMA, 10)
    hsig = 1 if psN/math.sqrt(1-(1-cs)**(2*(gen+1)))/chiN < 1.4+2/(N_PARAMS+1) else 0
    ccq  = math.sqrt(cc*(2-cc)*mueff)
    pc   = (1-cc)*pc + hsig*ccq*(newM-theta)/SIGMA
    mu_sum = weights_arr @ zs[order[:mu]]**2
    diagC  = np.maximum(1e-20,
             (1-c1-cmu)*diagC + c1*(pc**2+(1-hsig)*cc*(2-cc)*diagC) + cmu*mu_sum*diagC)
    theta  = newM
    ev     = run_episode(theta, seed=999)
    best   = max(best, ev)
    if gen % 30 == 0:
        print(f"  gen {gen:4d}  eval_ret={ev:8.2f}  best={best:8.2f}  sigma={SIGMA:.3f}")

print(f"\\nDone. Best return: {best:.2f}")

# ── Save policy (Tetrobot-compatible PolicySpec) ──────────────────────────────
policy = {
    "kind": "mlp",
    "obsDim": obs_dim,
    "actionDim": act_dim,
    "hidden": HIDDEN,
    "params": theta.tolist(),
}
with open("trained_policy.json", "w") as f:
    json.dump(policy, f)
print("\\n✓ Saved trained_policy.json")
print("  In Colab: Files panel (left sidebar) → right-click → Download")
print("  Then: Training page → Cloud tab → Import trained policy")
`;

    const nb = {
      nbformat: 4, nbformat_minor: 0,
      metadata: {
        colab: { provenance: [], name: `tetrobot-training-${taskType}.ipynb` },
        kernelspec: { name: 'python3', display_name: 'Python 3' },
        language_info: { name: 'python', version: '3.10.0' },
      },
      cells: [
        {
          cell_type: 'markdown', metadata: {},
          source: [
            `# Tetrobot Cloud Training — ${taskType}\n`,
            '\nThis notebook was auto-exported from Tetrobot. Run all cells.\n',
            '**Expected time:** 2–5 min on Colab CPU (much faster than browser ES).\n',
            '\nWhen done, download `trained_policy.json` from the Files panel and import it back in Tetrobot → Training → Cloud → Import trained policy.',
          ],
        },
        {
          cell_type: 'code', metadata: {}, execution_count: null, outputs: [],
          source: pyCode.split('\n').map((l) => l + '\n'),
        },
      ],
    };

    const blob = new Blob([JSON.stringify(nb, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tetrobot-training-${taskType}.ipynb`;
    a.click();
    setCloudLog(`Downloaded tetrobot-training-${taskType}.ipynb — open in Google Colab and run all cells.`);
  }

  // ── Import policy from file ───────────────────────────────────────────────────

  function importPolicyFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const spec = JSON.parse(ev.target?.result as string);
        if (!spec.kind || !Array.isArray(spec.params) || !spec.obsDim || !spec.actionDim)
          throw new Error('Invalid policy file — expected {kind, obsDim, actionDim, params}');
        policyFromSpec(spec); // validates spec shape before saving
        const name = _skillName(taskType);
        const skill = { name, robotId: tipId ?? undefined, policy: spec, task: taskType, rewardWeights: weights, meta: { generations: 0, bestReturn: 0, trainedAt: Date.now(), algo: 'cloud' } };
        useModelStore.getState().applyTransient((d) => putSkill(d as any, skill) as any);
        setCloudLog(`✓ Imported: ${spec.kind} [${spec.obsDim}→${(spec.hidden??[]).join('×')}→${spec.actionDim}], ${spec.params.length} params. Saved as skill "${name}". Go to Skills tab to run it.`);
      } catch (e: any) {
        setCloudLog(`Import error: ${e.message}`);
      }
    };
    reader.readAsText(file);
  }

  // ── Render helpers ────────────────────────────────────────────────────────────

  function renderSetup() {
    const fields = TASK_REWARD_FIELDS[taskType];
    const savedSkill = getSkill(doc as any, _skillName(taskType));
    return (
      <>
        <div className="tr-sec">TASK</div>
        <div className="tr-task-grid">
          {(['reach', 'navigate', 'locomote', 'pose', 'assemble'] as TaskType[]).map((t) => (
            <button key={t} className={`tr-task-btn${taskType === t ? ' tr-task-btn--on' : ''}`}
              disabled={training} onClick={() => chooseTask(t)}>
              <span className="tr-task-icon">{taskIcons[t]}</span>
              <span>{taskLabels[t]}</span>
            </button>
          ))}
        </div>
        <div className="tr-hint">{taskHints[taskType]}</div>

        {(taskType === 'reach' || taskType === 'pose') && (
          <div className="tr-row">
            <span>Tip body</span>
            <strong className={tipId ? '' : 'tr-warn'}>{tipName ?? '— click a body in the 3D view —'}</strong>
          </div>
        )}

        {taskType === 'assemble' && (
          <>
            <div className="tr-row">
              <span>Modules (components with connectors)</span>
              <strong className={assembleModules.length >= 2 ? '' : 'tr-warn'}>
                {assembleModules.length >= 2 ? assembleModules.slice(0, 4).map((c) => c.name).join(', ') : '— need ≥2 components with connectors —'}
              </strong>
            </div>
            <div className="tr-sec">GOAL SHAPE</div>
            <div className="tr-btns">
              <button className={assembleShape === 'chain' ? 'tr-primary' : ''} disabled={training}
                onClick={() => setAssembleShape('chain')} title="Modules connect end-to-end: 0-1-2-3">
                ⛓ Chain
              </button>
              <button className={assembleShape === 'star' ? 'tr-primary' : ''} disabled={training}
                onClick={() => setAssembleShape('star')} title="Module 0 is a hub connected to every other module">
                ✦ Star
              </button>
            </div>
            <div className="tr-hint">
              Chain vs. Star are topologically different goal shapes — same module count, different
              adjacency. Uses the first {Math.min(4, assembleModules.length)} components with connectors,
              in Project Explorer order.
            </div>
          </>
        )}

        <div className="tr-sec">REWARD SHAPING</div>
        {fields.map((f) => (
          <label key={f.key} className="tr-weight">
            <span>{f.label}</span>
            <input type="range" min={f.min} max={f.max} step={(f.max - f.min) / 100}
              value={weights[f.key] ?? 0} disabled={training}
              onChange={(e) => setWeights((w) => ({ ...w, [f.key]: +e.target.value }))} />
            <em>{(weights[f.key] ?? 0).toFixed(3)}</em>
          </label>
        ))}

        {taskType === 'reach' && (
          <>
            <div className="tr-sec">REACH TARGET</div>
            <div className="tr-hint">Place a 3D target, then "Run to target" drives the trained brain to it live.</div>
            <div className="tr-btns">
              <button className={picking ? 'tr-primary' : ''} onClick={() => useTrainingStore.getState().setPicking(!picking)}>
                {picking ? 'Click the scene…' : '◎ Pick in 3D'}
              </button>
              <button onClick={() => useTrainingStore.getState().setTarget(null)} disabled={!target}>Clear</button>
            </div>
            <div className="tr-xyz">
              {(['X', 'Y', 'Z'] as const).map((ax, i) => (
                <label key={ax}><span>{ax}</span>
                  <input type="number" step={0.05} value={target ? +target[i].toFixed(3) : 0}
                    onChange={(e) => setAxis(i, +e.target.value)} />
                </label>
              ))}
            </div>
            <div className="tr-btns">
              {!running
                ? <button className="tr-primary" onClick={runToTarget} disabled={!target || !ready}>▶ Run to target</button>
                : <button className="tr-stop" onClick={stopRun}>■ Stop</button>}
            </div>
          </>
        )}

        {savedSkill && (
          <div className="tr-saved-banner">
            Saved skill: <strong>{savedSkill.name}</strong> · {savedSkill.meta?.generations} iters
            <button onClick={runSaved} className="tr-saved-run">▶ Run</button>
          </div>
        )}
      </>
    );
  }

  function renderTrain() {
    return (
      <>
        <div className="tr-sec">ALGORITHM</div>
        {(['es', 'cma', 'bc'] as AlgoType[]).map((a) => {
          const info = ALGO_INFO[a];
          return (
            <button key={a} className={`tr-algo-btn${algo === a ? ' tr-algo-btn--on' : ''}`}
              disabled={training} onClick={() => setAlgo(a)}>
              <div className="tr-algo-top">
                <span>{info.label}</span>
                <span className="tr-algo-badge">{info.badge}</span>
              </div>
              {algo === a && <div className="tr-algo-desc">{info.desc}</div>}
            </button>
          );
        })}

        {algo !== 'bc' && (
          <>
            <div className="tr-sec">ARCHITECTURE</div>
            <div className="tr-arch-grid">
              {(['linear', 'mlp-s', 'mlp-m', 'mlp-l'] as ArchType[]).map((a) => (
                <button key={a} className={`tr-arch-btn${arch === a ? ' tr-arch-btn--on' : ''}`}
                  disabled={training} onClick={() => setArch(a)}>
                  {archLabels[a]}
                </button>
              ))}
            </div>
            <div className="tr-hint">{archHints[arch]}</div>

            <div className="tr-sec">HYPERPARAMETERS</div>
            {algo === 'es' && (
              <label className="tr-weight">
                <span>Population (parallel robots)</span>
                <input type="range" min={8} max={256} step={8} value={pop} disabled={training} onChange={(e) => setPop(+e.target.value)} />
                <em>{pop}</em>
              </label>
            )}
            <label className="tr-weight">
              <span>Initial step size σ</span>
              <input type="range" min={0.05} max={1.5} step={0.05} value={sigma} disabled={training} onChange={(e) => setSigma(+e.target.value)} />
              <em>{sigma.toFixed(2)}</em>
            </label>
          </>
        )}

        {algo === 'bc' && (
          <>
            <div className="tr-sec">BC SETTINGS</div>
            <div className="tr-hint">Uses demonstrations from the DEMOS tab. Adam optimizer with backpropagation.</div>
            <div className="tr-arch-grid">
              {(['mlp-s', 'mlp-m', 'mlp-l'] as ArchType[]).map((a) => (
                <button key={a} className={`tr-arch-btn${arch === a ? ' tr-arch-btn--on' : ''}`}
                  disabled={training} onClick={() => setArch(a)}>
                  {archLabels[a]}
                </button>
              ))}
            </div>
            <label className="tr-weight">
              <span>Learning rate (Adam)</span>
              <input type="range" min={1e-4} max={5e-3} step={1e-4} value={bcLr} disabled={training}
                onChange={(e) => setBcLr(+e.target.value)} />
              <em>{bcLr.toExponential(1)}</em>
            </label>
            <div className="tr-demos-stat">
              {demos.length} demos · {demos.reduce((s, d) => s + d.pairs.length, 0)} pairs
              {demos.length === 0 && <span className="tr-warn"> — Add demos first</span>}
            </div>
            {bcEpoch && <div className="tr-row"><span>Epoch {bcEpoch.epoch}</span><strong>loss {bcEpoch.loss.toExponential(2)}</strong></div>}
          </>
        )}

        <div className="tr-sec">ENHANCERS</div>
        <div className="tr-enhancers">
          <label className="tr-enhancer-btn" title="Welford's online normalization — most impactful single change for training stability. Normalizes each obs dim to zero-mean / unit-variance across all parallel episodes.">
            <input type="checkbox" checked={useObsNorm} onChange={(e) => setUseObsNorm(e.target.checked)} disabled={training} />
            <span>ObsNorm</span>
            <span className="tr-enh-badge">+stability</span>
          </label>
          <label className="tr-enhancer-btn" title="Automatically advance task difficulty (target radius, arena size, episode length) as the agent improves. Prevents getting stuck, enables complex morphologies.">
            <input type="checkbox" checked={useCurriculum} onChange={(e) => setUseCurriculum(e.target.checked)} disabled={training} />
            <span>Curriculum</span>
            <span className="tr-enh-badge">+speed</span>
          </label>
          <label className="tr-enhancer-btn" title="Append a 60-dim topology encoding (joint types, limits, tree depth, current values) to observations. Enables ONE policy to control ANY configuration of your shape-changing robot.">
            <input type="checkbox" checked={useTopoObs} onChange={(e) => setUseTopoObs(e.target.checked)} disabled={training} />
            <span>TopoObs</span>
            <span className="tr-enh-badge enh-gold">shape-change</span>
          </label>
        </div>
        {useTopoObs && (
          <div className="tr-hint" style={{ color: '#f59e0b' }}>
            Topology obs: +60 dims ({Object.values(doc.joints).length} joints encoded, padded to 12). Policy learns "what shape am I in right now?"
          </div>
        )}

        <div className="tr-sec">RUN</div>
        <div className="tr-btns">
          {!training
            ? <button className="tr-primary" onClick={startTraining} disabled={!ready}>▶ Train</button>
            : <button className="tr-stop" onClick={stopTraining}>■ Stop</button>}
          <button onClick={() => watch()} disabled={!getTrainedPolicy() || training}>Watch</button>
          <button onClick={saveSkill} disabled={!getTrainedPolicy() || training}>Save</button>
        </div>
        <div className="tr-btns">
          <button onClick={() => pushDiag(diagnose('now'))} disabled={!getTrainedPolicy()}
            title="Replay one episode with the best policy and break the score into its reward terms.">
            🔍 Diagnose reward
          </button>
          {diag.length > 0 && <button onClick={() => setDiag([])} title="Clear the breakdown log">Clear</button>}
        </div>
        {diag.length > 0 && (
          <div className="tr-diag">
            <div className="tr-diag-head">REWARD BREAKDOWN · weighted per-term totals (most-negative first)</div>
            {diag.map((line, i) => <div key={i} className="tr-diag-line">{line}</div>)}
          </div>
        )}

        {stat && (
          <div className="tr-stat-row">
            <span>Iter <strong>{stat.gen}</strong></span>
            <span>Return <strong>{stat.ret.toFixed(2)}</strong></span>
            <span>Best <strong>{stat.best.toFixed(2)}</strong></span>
            {currLabel && <span style={{ color: '#f59e0b' }}>Stage <strong>{currStage + 1}: {currLabel}</strong></span>}
          </div>
        )}
        {useObsNorm && normRef.current && normRef.current.count() > 10 && (
          <div className="tr-hint" style={{ color: '#22c55e', fontSize: 10 }}>
            ObsNorm: {normRef.current.count().toLocaleString()} obs seen — normalizer active
          </div>
        )}
        <div className="tr-plot" ref={hostRef} />
        {log && <div className="tr-log">{log}</div>}
      </>
    );
  }

  function renderDemos() {
    return (
      <>
        <div className="tr-sec">RECORD DEMONSTRATIONS</div>
        <div className="tr-hint">
          BC learns by imitating demonstrations. The more demos and the more varied the starting poses, the better the policy generalises.
        </div>

        {(taskType === 'reach' || taskType === 'pose') && (
          <>
            <div className="tr-hint">Set a reach target (in Setup → Reach Target) then click Record.</div>
            <div className="tr-btns">
              <button className="tr-primary" onClick={recordReachDemo} disabled={!tipId || !target}>
                ◉ Record reach demo
              </button>
            </div>
          </>
        )}

        {taskType === 'navigate' && (
          <>
            <div className="tr-hint">Add waypoints (use 3D Pick in Setup), then generate a navigation demo.</div>
            <div className="tr-btns">
              <button onClick={recordNavWaypoint} disabled={!target}>+ Add waypoint</button>
              <button className="tr-primary" onClick={generateNavDemo} disabled={waypoints.length === 0}>
                ◉ Generate nav demo
              </button>
            </div>
            {waypoints.length > 0 && (
              <div className="tr-hint">{waypoints.length} waypoints queued: {waypoints.map(([x, y]) => `(${x.toFixed(1)},${y.toFixed(1)})`).join(' → ')}</div>
            )}
          </>
        )}

        {taskType === 'locomote' && (
          <div className="tr-hint">Locomotion uses RL (ES/CMA-ES) — no demos needed. Switch to ES or CMA-ES in the Train tab.</div>
        )}

        <div className="tr-sec">DEMO LIBRARY ({demos.length})</div>
        {demos.length === 0 && <div className="tr-empty">No demos yet.</div>}
        {demos.map((d) => (
          <div key={d.id} className="tr-demo-card">
            <div className="tr-demo-name">{d.label}</div>
            <div className="tr-demo-meta">{d.pairs.length} steps · {d.taskType} · {new Date(d.timestamp).toLocaleTimeString()}</div>
            <button className="tr-demo-del" onClick={() => deleteDemo(d.id)}>✕</button>
          </div>
        ))}
        {demos.length > 0 && (
          <div className="tr-btns">
            <button onClick={() => setDemos([])}>Clear all demos</button>
          </div>
        )}

        <div className="tr-sec">BC READINESS</div>
        <div className="tr-demos-stat">
          <div>Total pairs: <strong>{demos.reduce((s, d) => s + d.pairs.length, 0)}</strong></div>
          <div className="tr-hint">10–50 pairs: basic. 200+: good generalisation. 1000+: robust.</div>
          {demos.length >= 1 && (
            <button className="tr-primary" style={{ marginTop: 6 }} onClick={() => { setAlgo('bc'); setTab('train'); }}>
              → Train BC now
            </button>
          )}
        </div>
        {log && <div className="tr-log">{log}</div>}
      </>
    );
  }

  function renderSkills() {
    const skillName = _skillName(taskType);
    const s = getSkill(doc as any, skillName);
    return (
      <>
        <div className="tr-sec">SAVED SKILLS</div>
        {!s && <div className="tr-empty">No "{skillName}" skill saved yet. Train and save one first.</div>}
        {s && (
          <div className="tr-skill-card">
            <div className="tr-skill-name">{s.name}</div>
            <div className="tr-skill-meta">
              Task: {s.task} · Algo: {(s.meta as any)?.algo ?? 'es'} ·
              Iters: {s.meta?.generations ?? '?'} ·
              Best: {s.meta?.bestReturn?.toFixed(1) ?? '?'}
            </div>
            <div className="tr-skill-meta">
              Policy: {s.policy.kind} [{s.policy.obsDim}→{(s.policy.hidden ?? []).join('×')}→{s.policy.actionDim}] · {s.policy.params.length} params
            </div>
            <div className="tr-btns" style={{ marginTop: 6 }}>
              <button className="tr-primary" onClick={runSaved}>▶ Run</button>
              <button onClick={() => {
                const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = `skill-${s.name}.json`; a.click();
              }}>⬇ Export</button>
              <button onClick={deleteSaved}>✕ Delete</button>
            </div>
          </div>
        )}

        <div className="tr-sec">EVAL</div>
        <div className="tr-hint">Watch the saved skill run on the robot in the 3D viewport.</div>
        <div className="tr-btns">
          <button disabled={!s} onClick={runSaved}>▶ Run saved "{skillName}"</button>
          <button onClick={() => stopAll()}>■ Stop</button>
        </div>
        {log && <div className="tr-log">{log}</div>}
      </>
    );
  }

  function renderCloud() {
    const inputStyle = {
      background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
      borderRadius: 5, padding: '4px 8px', fontSize: 11, width: '100%',
      fontFamily: 'var(--font-mono)',
    } as const;

    return (
      <>
        {/* ── VLM Goal Parser ─────────────────────────────────────────────── */}
        <div className="tr-sec">VLM GOAL PARSER</div>
        <div className="tr-hint">
          Type a natural-language instruction → AI parses it into a 3D reach target.
          API keys stored in browser only — never sent to our servers.
        </div>

        {/* Provider */}
        <div className="tr-row">
          <span>Provider</span>
          <select value={apiProvider} style={{ maxWidth: 160 }} onChange={(e) => {
            const p = e.target.value as Provider;
            setApiProvider(p);
            setAvailableModels([]);
            setSelectedModel('');
            saveProviderPrefs(p, apiKey);
          }}>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="gemini">Google Gemini</option>
            <option value="huggingface">HuggingFace</option>
          </select>
        </div>

        {/* API key */}
        <div className="tr-weight" style={{ gridTemplateColumns: '1fr', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>API Key</span>
          <input type="password" placeholder={PROVIDER_KEY_HINT[apiProvider]} value={apiKey}
            style={inputStyle}
            onChange={(e) => { setApiKey(e.target.value); saveProviderPrefs(apiProvider, e.target.value); }} />
        </div>

        {/* Model selector */}
        <div className="tr-row" style={{ gap: 6 }}>
          <span style={{ flexShrink: 0 }}>Model</span>
          <select value={effectiveModel} style={{ flex: 1, minWidth: 0 }}
            onChange={(e) => setSelectedModel(e.target.value)}>
            {effectiveModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {PROVIDER_FETCH_CAPABLE[apiProvider] && (
            <button style={{ flexShrink: 0, fontSize: 11, padding: '3px 8px', cursor: 'pointer',
              background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5 }}
              disabled={!apiKey || fetchingModels}
              onClick={fetchAvailableModels}>
              {fetchingModels ? '…' : '↻'}
            </button>
          )}
        </div>
        {availableModels.length > 0 && (
          <div className="tr-hint" style={{ color: 'var(--accent)' }}>
            {availableModels.length} models fetched from API
          </div>
        )}
        {!availableModels.length && (
          <div className="tr-hint">
            Showing {effectiveModels.length} known models
            {PROVIDER_FETCH_CAPABLE[apiProvider] ? ' — click ↻ to fetch current list' : ''}
          </div>
        )}

        {/* HuggingFace custom endpoint */}
        {apiProvider === 'huggingface' && (
          <div className="tr-weight" style={{ gridTemplateColumns: '1fr', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Custom endpoint (optional, e.g. HF Spaces URL)</span>
            <input type="text" placeholder="https://…hf.space/…" value={hfEndpoint}
              style={inputStyle} onChange={(e) => setHfEndpoint(e.target.value)} />
          </div>
        )}

        {/* Instruction + parse */}
        <div className="tr-weight" style={{ gridTemplateColumns: '1fr', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Natural-language instruction</span>
          <input type="text" placeholder='"Reach to the top shelf" / "Go to far left"'
            value={vlmText} onChange={(e) => setVlmText(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'inherit' }}
            onKeyDown={(e) => e.key === 'Enter' && parseVlmGoal()} />
        </div>
        <div className="tr-btns">
          <button className="tr-primary" onClick={parseVlmGoal}
            disabled={vlmLoading || !apiKey || !vlmText}>
            {vlmLoading ? '⏳ Parsing…' : '✦ Parse goal → 3D target'}
          </button>
        </div>

        {/* ── Cloud Training ────────────────────────────────────────────────── */}
        <div className="tr-sec" style={{ marginTop: 8 }}>CLOUD TRAINING</div>
        <div className="tr-hint">
          Export your robot + task as a Google Colab notebook (NumPy, runs on free CPU, 2–5 min).
          Import the trained policy back — it works with Watch and Run-saved exactly like browser-trained policies.
        </div>
        <div className="tr-btns">
          <button className="tr-primary" onClick={exportToColab}>
            ⬆ Export to Colab (.ipynb)
          </button>
          <button onClick={() => importRef.current?.click()}>
            ⬇ Import policy (.json)
          </button>
        </div>
        <div className="tr-hint" style={{ marginTop: 2 }}>
          Colab notebook embeds your robot config (joints, limits, task, rewards) + sep-CMA-ES training loop.
          Run all cells → download <code>trained_policy.json</code> → Import here.
        </div>

        {/* ── HuggingFace VLA Models ────────────────────────────────────────── */}
        <div className="tr-sec" style={{ marginTop: 8 }}>HUGGINGFACE VLA MODELS</div>
        <div className="tr-hint">
          Vision-Language-Action models (SmolVLA, Octo, GR-00T) require image + language input and
          output joint actions directly. Browser inference needs ONNX export — not yet available for
          these models. Use HuggingFace Inference API (serverless) or a Spaces endpoint above.
        </div>
        <div className="tr-row">
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>VLA model list (text input)</span>
        </div>
        {[
          { id: 'lerobot/smolvla_base', label: 'SmolVLA (450M)', badge: 'server' },
          { id: 'octo-model/octo-base', label: 'Octo (93M)', badge: 'server' },
          { id: 'nvidia/GR00T-N1-2B', label: 'GR-00T N1 (2B)', badge: 'server' },
        ].map(({ id, label, badge }) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 6, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6,
            background: 'var(--bg-card)', fontSize: 11 }}>
            <div>
              <strong style={{ color: 'var(--text)' }}>{label}</strong>
              <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>{id}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: '#6366f122',
                color: '#818cf8', border: '1px solid #6366f144', fontWeight: 700, textTransform: 'uppercase' }}>
                {badge}
              </span>
              <button style={{ fontSize: 10, padding: '2px 7px', cursor: 'pointer',
                background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }}
                onClick={() => setSelectedModel(id)}>
                Use
              </button>
            </div>
          </div>
        ))}
        <div className="tr-hint">
          Select a VLA model above (or type one in the Model field), enter your HF token, then use "Parse goal" — the model receives your instruction and returns joint targets.
        </div>

        {cloudLog && <div className="tr-log">{cloudLog}</div>}
      </>
    );
  }

  return (
    <div className="tr-panel">
      {/* Tab bar */}
      <div className="tr-tabs">
        {(['setup', 'train', 'demos', 'skills', 'cloud'] as Tab[]).map((t) => (
          <button key={t} className={`tr-tab${tab === t ? ' tr-tab--on' : ''}`}
            onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="tr-body">
        {tab === 'setup'  && renderSetup()}
        {tab === 'train'  && renderTrain()}
        {tab === 'demos'  && renderDemos()}
        {tab === 'skills' && renderSkills()}
        {tab === 'cloud'  && renderCloud()}
      </div>

      {/* Hidden file input for policy import */}
      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importPolicyFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ── Static label maps ─────────────────────────────────────────────────────────

const taskIcons:  Record<TaskType, string> = { reach: '⊕', navigate: '⊛', locomote: '⊞', pose: '⊡', assemble: '⛓' };
const taskLabels: Record<TaskType, string> = { reach: 'Reach', navigate: 'Navigate', locomote: 'Walk', pose: 'Pose', assemble: 'Assemble' };
const taskHints:  Record<TaskType, string> = {
  reach: 'Move the arm tip to a 3D target point. Works for any robot arm or manipulator.',
  navigate: 'Drive a wheeled/car robot to a 2D goal position. Uses differential-drive kinematics.',
  locomote: 'Walk the robot forward (+X) using full physics simulation (Rapier). For legged/modular robots.',
  pose: 'Drive the robot to a target joint configuration. Good for keyframe following or "hold pose" skills.',
  assemble: 'Move whole modules so their connectors snap together into a target shape (chain or star). First slice of shape-changing training — see PLAN Phase 5.',
};

const archLabels: Record<ArchType, string> = {
  linear: 'Linear', 'mlp-s': 'MLP-S (24×24)', 'mlp-m': 'MLP-M (64×64)', 'mlp-l': 'MLP-L (128×128)',
};
const archHints: Record<ArchType, string> = {
  linear: '10–50 params. Fast, debuggable. Works for simple tasks and BC with many demos.',
  'mlp-s': '~1K params. Good for reach, navigate, pose with ≤8 joints.',
  'mlp-m': '~8K params. For complex locomotion, many joints, or multi-goal tasks.',
  'mlp-l': '~32K params. Use only with BC (backprop) and 1000+ demo pairs.',
};
const tabLabels: Record<Tab, string> = { setup: 'Setup', train: 'Train', demos: 'Demos', skills: 'Skills', cloud: 'Cloud' };
