/**
 * TrainingPanel — train a robot skill by reinforcement learning, in the GUI.
 *
 * Pick a tip body, shape the reward with sliders, set the population/hyperparams, and
 * hit Train: a population of brains evolves (VectorESTrainer) with a live return curve.
 * Watch the trained brain drive the real arm, then Save it as a skill in the model
 * (persists in the .nischay project) and Run it any time. This is the GUI front-end to
 * robotics/rl/* — generic enough to extend to any robot/task next.
 */
import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './TrainingPanel.css';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useTrainingStore } from '@/state/trainingStore';
import { chainJoints } from '@/kinematics/modelIK';
import { ModelReachTask, REACH_DEFAULT_WEIGHTS } from '@/robotics/rl/modelTask';
import { ModelLocomotionTask, LOCO_DEFAULT_WEIGHTS } from '@/robotics/rl/locomotionTask';
import { initPhysics } from '@/robotics/rl/physicsWorld';
import { VectorESTrainer, makeRng } from '@/robotics/rl/vectorTrainer';
import { LinearPolicy, MLPPolicy, policyFromSpec, type Policy } from '@/robotics/rl/policy';
import { putSkill, getSkill } from '@/robotics/rl/policyStore';
import { withJointValues } from '@/control/motionRuntime';
import type { Task } from '@/robotics/rl/task';

type TaskType = 'reach' | 'locomote';
const WEIGHT_FIELDS: Record<TaskType, { key: string; label: string; min: number; max: number }[]> = {
  reach: [
    { key: 'progress', label: 'Progress (move closer)', min: 0, max: 30 },
    { key: 'success', label: 'Success bonus', min: 0, max: 20 },
    { key: 'control', label: 'Control penalty', min: -0.2, max: 0 },
    { key: 'alive', label: 'Time penalty', min: -0.1, max: 0 },
    { key: 'collision', label: 'Self-collision penalty', min: -2, max: 0 },
  ],
  locomote: [
    { key: 'forward', label: 'Forward progress (+X)', min: 0, max: 60 },
    { key: 'upright', label: 'Stay upright', min: 0, max: 3 },
    { key: 'energy', label: 'Energy penalty', min: -0.1, max: 0 },
    { key: 'fell', label: 'Fall penalty', min: -20, max: 0 },
  ],
};
const SKILL_NAME: Record<TaskType, string> = { reach: 'reach', locomote: 'walk' };

export default function TrainingPanel() {
  const selectedId = useSelectionStore((s) => (s.kind === 'body' ? s.selectedId : null));
  const doc = useModelStore((s) => s.doc);
  const target = useTrainingStore((s) => s.target);
  const picking = useTrainingStore((s) => s.picking);
  const running = useTrainingStore((s) => s.running);

  const [taskType, setTaskType] = useState<TaskType>('reach');
  const [weights, setWeights] = useState<Record<string, number>>({ ...REACH_DEFAULT_WEIGHTS });
  const [kind, setKind] = useState<'mlp' | 'linear'>('mlp');
  const [pop, setPop] = useState(48);
  const [hidden, setHidden] = useState(24);
  const [training, setTraining] = useState(false);
  const [stat, setStat] = useState<{ gen: number; ret: number; best: number } | null>(null);
  const [log, setLog] = useState('');
  const [hasSkill, setHasSkill] = useState(false);

  const trainerRef = useRef<VectorESTrainer | null>(null);
  const timerRef = useRef<any>(null);
  const rafRef = useRef<any>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const curveRef = useRef<number[][]>([[], []]);

  const tipId = selectedId && chainJoints(doc, selectedId).length ? selectedId : null;
  const tipName = tipId ? doc.bodies[tipId]?.name : null;
  const ready = taskType === 'reach' ? !!tipId : Object.keys(doc.joints).length > 0;

  // switch reward defaults when the task changes
  function chooseTask(t: TaskType) {
    setTaskType(t);
    setWeights({ ...(t === 'reach' ? REACH_DEFAULT_WEIGHTS : LOCO_DEFAULT_WEIGHTS) });
  }

  useEffect(() => { setHasSkill(!!getSkill(doc as any, SKILL_NAME[taskType])); }, [doc, taskType]);
  useEffect(() => () => { stopAll(); }, []);

  function makeTask(): Task {
    return taskType === 'reach'
      ? new ModelReachTask(doc, tipId!, { weights })
      : new ModelLocomotionTask(doc, { weights });
  }

  function ensurePlot() {
    const host = hostRef.current;
    if (!host || plotRef.current) return;
    curveRef.current = [[], []];
    plotRef.current = new uPlot({
      width: host.clientWidth || 260, height: 130,
      scales: { x: { time: false } },
      legend: { show: false },
      series: [{ label: 'gen' }, { label: 'return', stroke: '#22c55e', width: 1.8, points: { show: false } }],
      axes: [{ stroke: '#888' }, { stroke: '#888' }],
    }, curveRef.current as any, host);
  }

  function makePolicy(t: Task): Policy {
    return kind === 'mlp'
      ? new MLPPolicy(t.obsDim, t.actionDim, [hidden, hidden])
      : new LinearPolicy(t.obsDim, t.actionDim);
  }

  async function startTraining() {
    if (!ready) { setLog(taskType === 'reach' ? 'Select a tip body on a movable chain.' : 'This robot has no movable joints to actuate.'); return; }
    stopAll();
    if (taskType === 'locomote') { setLog('Initialising physics…'); await initPhysics(); }
    ensurePlot();
    curveRef.current = [[], []];
    const probe = makeTask();
    const policy = makePolicy(probe);
    const trainer = new VectorESTrainer(makeTask, policy,
      { pop, sigma: 0.12, alpha: 0.06, episodesPerEval: taskType === 'locomote' ? 1 : 2, seed: 1234 });
    trainerRef.current = trainer;
    setTraining(true);
    setLog(`Training ${pop} brains · ${taskType === 'reach' ? `reach "${tipName}"` : 'modular locomotion'}…`);

    const maxGen = taskType === 'locomote' ? 200 : 120;
    timerRef.current = setInterval(() => {
      const r = trainer.generation();
      setStat({ gen: trainer.gen, ret: r.evalReturn, best: r.best });
      const c = curveRef.current; c[0].push(trainer.gen); c[1].push(r.evalReturn);
      plotRef.current?.setData(c as any);
      if (trainer.gen >= maxGen) stopTraining();
    }, 30);
  }

  function stopTraining() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTraining(false);
    if (trainerRef.current) setLog(`Stopped at gen ${trainerRef.current.gen} · best return ${trainerRef.current.best.toFixed(2)}. Watch or Save it.`);
  }

  function stopAll() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }

  /** Run a policy on the REAL robot so you watch the learned skill.
   *  `tipOverride` lets "Run saved" use the skill's own trained tip body even when
   *  nothing is currently selected. */
  function watch(policy: Policy, tipOverride?: string | null) {
    stopAll();
    if (taskType === 'reach') {
      const useTip = tipOverride && chainJoints(doc, tipOverride).length ? tipOverride : tipId;
      if (!useTip) { setLog('Select the arm tip this skill was trained on (a hand/finger), then run again.'); return; }
      const task = new ModelReachTask(doc, useTip, { weights });
      if (policy.actionDim !== task.actionDim) { setLog(`Skill was trained on a ${policy.actionDim}-joint chain; "${doc.bodies[useTip]?.name}" has ${task.actionDim}. Pick the matching tip.`); return; }
      task.reset(makeRng(Date.now() & 0xffff), { randomizeStart: false }); // start from home pose
      const ids = task.jointIds();
      let obs = task.observe(); let step = 0;
      const tick = () => {
        const out = task.act(policy.forward(obs));
        obs = task.observe();
        const vals: Record<string, number> = {};
        ids.forEach((id, i) => { vals[id] = task.currentValues()[i]; });
        useModelStore.getState().applyTransient((d) => withJointValues(d, vals));
        step++;
        if (out.done || step > 200) { setLog(`Reached dist ${out.info?.dist?.toFixed(3)} m in ${step} steps.`); return; }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    // locomotion: replay through the FK root — set the base body's transform from the
    // physics base pose and the joint values, so the model walks across the viewport.
    initPhysics().then(() => {
      const task = new ModelLocomotionTask(doc, { weights });
      task.reset(makeRng(Date.now() & 0xffff));
      const baseId = task.baseBodyId(); const ids = task.jointIds();
      let obs = task.observe(); let step = 0;
      const tick = () => {
        const out = task.act(policy.forward(obs));
        obs = task.observe();
        const base = task.basePose(); const tv = task.jointTargets();
        const vals: Record<string, number> = {}; ids.forEach((id, i) => { vals[id] = tv[i]; });
        useModelStore.getState().applyTransient((d) => {
          let nd = withJointValues(d, vals);
          const b = nd.bodies[baseId];
          if (b) nd = { ...nd, bodies: { ...nd.bodies, [baseId]: { ...b, transform: { ...b.transform, position: base.position, quaternion: base.quaternion } } } };
          return nd;
        });
        step++;
        if (out.done || step > 300) { setLog(`Walked to x=${out.info?.x?.toFixed(2)} m in ${step} steps.`); task.dispose(); return; }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  }

  function saveSkill() {
    const trainer = trainerRef.current;
    if (!trainer || !tipId) { setLog('Train a brain first.'); return; }
    const policy = trainer.trained();
    const name = SKILL_NAME[taskType];
    const skill = {
      name, robotId: tipId ?? undefined, policy: policy.spec(), task: taskType === 'reach' ? 'model-reach' : 'model-locomotion',
      rewardWeights: weights, meta: { generations: trainer.gen, bestReturn: trainer.best, trainedAt: Date.now() },
    };
    useModelStore.getState().applyTransient((d) => putSkill(d as any, skill) as any);
    setHasSkill(true);
    setLog(`Saved skill "${name}" (${trainer.gen} gens) into the model.`);
  }

  function runSaved() {
    const s = getSkill(doc as any, SKILL_NAME[taskType]);
    if (!s) { setLog('No saved skill yet.'); return; }
    setLog(`Running saved skill "${s.name}"…`);
    watch(policyFromSpec(s.policy), s.robotId);
  }

  /** Continuously drive the arm to the placed target with the trained/saved brain.
   *  This is the "give it a point → it goes there (and keeps following)" mode. */
  function runToTarget() {
    const tgt = useTrainingStore.getState().target;
    if (!tgt) { setLog('Place a target first — "Pick in 3D" then click the scene, or type X/Y/Z.'); return; }
    const saved = getSkill(doc as any, 'reach');
    const policy = trainerRef.current ? trainerRef.current.trained() : (saved ? policyFromSpec(saved.policy) : null);
    if (!policy) { setLog('Train a reach brain (or have a saved one) first.'); return; }
    const useTip = tipId && chainJoints(doc, tipId).length ? tipId : saved?.robotId;
    if (!useTip || !chainJoints(doc, useTip).length) { setLog('Select the arm tip this brain controls.'); return; }
    const task = new ModelReachTask(doc, useTip, { weights });
    if (policy.actionDim !== task.actionDim) { setLog(`Brain controls ${policy.actionDim} joints; "${doc.bodies[useTip]?.name}" has ${task.actionDim}.`); return; }
    stopAll();
    task.reset(makeRng(1), { randomizeStart: false, target: tgt });
    const ids = task.jointIds();
    useTrainingStore.getState().setRunning(true);
    let frame = 0;
    const tick = () => {
      const st = useTrainingStore.getState();
      if (!st.running || !st.target) { useTrainingStore.getState().setRunning(false); return; }
      task.setTarget(st.target);                  // re-aim live if the target moved
      task.act(policy.forward(task.observe()));   // collision-rigid step toward it
      const vals: Record<string, number> = {}; ids.forEach((id, i) => { vals[id] = task.currentValues()[i]; });
      useModelStore.getState().applyTransient((d) => withJointValues(d, vals));
      if (++frame % 12 === 0) setLog(`Tracking target · tip ${task.tipDistance().toFixed(3)} m away`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }
  function stopRun() { useTrainingStore.getState().setRunning(false); stopAll(); }

  const setAxis = (i: number, v: number) => {
    const t: [number, number, number] = [...(target ?? [0, 0, 0])] as [number, number, number];
    t[i] = v;
    useTrainingStore.getState().setTarget(t);
  };

  return (
    <div className="tr-panel">
      <div className="tr-sec">TASK</div>
      <div className="tr-row">
        <span>Skill to learn</span>
        <select value={taskType} disabled={training} onChange={(e) => chooseTask(e.target.value as TaskType)}>
          <option value="reach">Reach (arm, kinematic)</option>
          <option value="locomote">Locomote (modular, physics)</option>
        </select>
      </div>
      {taskType === 'reach' ? (
        <>
          <div className="tr-row"><span>Tip body</span><strong>{tipName ?? '— select a chain tip —'}</strong></div>
          {!tipId && <div className="tr-hint">Click a body on a movable joint chain (e.g. a hand or finger), then come back.</div>}
        </>
      ) : (
        <div className="tr-hint">Trains the WHOLE assembly to walk forward (+X) over physics — works for any modular / shape-changing robot. No tip needed.</div>
      )}

      <div className="tr-sec">REWARD SHAPING</div>
      {WEIGHT_FIELDS[taskType].map((f) => (
        <label key={f.key} className="tr-weight">
          <span>{f.label}</span>
          <input type="range" min={f.min} max={f.max} step={(f.max - f.min) / 100}
            value={weights[f.key]} disabled={training}
            onChange={(e) => setWeights((w) => ({ ...w, [f.key]: +e.target.value }))} />
          <em>{weights[f.key].toFixed(3)}</em>
        </label>
      ))}

      <div className="tr-sec">TRAINER</div>
      <div className="tr-row">
        <span>Policy</span>
        <select value={kind} disabled={training} onChange={(e) => setKind(e.target.value as any)}>
          <option value="mlp">Neural net (MLP)</option>
          <option value="linear">Linear</option>
        </select>
      </div>
      <label className="tr-weight"><span>Population (parallel robots)</span>
        <input type="range" min={8} max={256} step={8} value={pop} disabled={training} onChange={(e) => setPop(+e.target.value)} />
        <em>{pop}</em>
      </label>
      {kind === 'mlp' && (
        <label className="tr-weight"><span>Hidden units</span>
          <input type="range" min={8} max={64} step={8} value={hidden} disabled={training} onChange={(e) => setHidden(+e.target.value)} />
          <em>{hidden}</em>
        </label>
      )}

      <div className="tr-btns">
        {!training
          ? <button className="tr-primary" onClick={startTraining} disabled={!ready}>▶ Train</button>
          : <button className="tr-stop" onClick={stopTraining}>■ Stop</button>}
        <button onClick={() => trainerRef.current && watch(trainerRef.current.trained())} disabled={!trainerRef.current || training}>Watch</button>
        <button onClick={saveSkill} disabled={!trainerRef.current || training}>Save skill</button>
      </div>

      {stat && <div className="tr-row"><span>Gen {stat.gen}</span><strong>return {stat.ret.toFixed(2)} · best {stat.best.toFixed(2)}</strong></div>}
      <div className="tr-plot" ref={hostRef} />

      {taskType === 'reach' && (
        <>
          <div className="tr-sec">REACH TO A POINT</div>
          <div className="tr-hint">Place a target, then run — the trained brain drives the tip to it (and keeps following if you move it).</div>
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
              ? <button className="tr-primary" onClick={runToTarget} disabled={!target}>▶ Run to target</button>
              : <button className="tr-stop" onClick={stopRun}>■ Stop</button>}
          </div>
        </>
      )}

      <div className="tr-sec">SAVED SKILL</div>
      <div className="tr-btns">
        <button onClick={runSaved} disabled={!hasSkill}>{hasSkill ? `▶ Run saved "${SKILL_NAME[taskType]}"` : 'No saved skill'}</button>
      </div>

      {log && <div className="tr-log">{log}</div>}
    </div>
  );
}
