/**
 * AutonomyPanel — the native robotics autonomy stack (no ROS, all in-app):
 *   • Navigation   — occupancy/costmap → A* global plan → steer-walk follower.
 *   • Perception   — LiDAR scan + build an occupancy MAP from scans; plan on it.
 *   • Motion plan  — RRT in joint space with real self/world collision checking.
 *   • Learning     — Evolution-Strategies trainer on a reach task (watch it learn).
 *   • Behaviour    — a Behaviour-Tree mission (patrol: pick → plan → go → scan).
 */
import './AutonomyPanel.css';
import { useEffect, useRef, useState } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useAutonomyStore } from '@/state/autonomyStore';
import { commands } from '@/core/commands/index';
import { makeBody, makeGeometry, identityOrigin, GeometryType } from '@/core/model/index';
import { computeFK } from '@/kinematics/modelFK';
import { chainJoints } from '@/kinematics/modelIK';
import { buildGrid, emptyGrid, integrateScan, integrateScanTraced } from '@/robotics/nav/occupancyGrid';
import { planPath } from '@/robotics/nav/astar';
import { nextExplorationGoal, frontierGoals } from '@/robotics/nav/frontier';
import { serializeMapJSON, deserializeMap } from '@/robotics/nav/mapIO';
import { obstacleFootprints, robotBaseXZ, worldBounds } from '@/robotics/nav/worldModel';
import { downloadBlob } from '@/core/serialization/fileIO';
import { planRRT } from '@/robotics/planning/rrt';
import { CollisionModel } from '@/robotics/collision';
import { ReachEnv } from '@/robotics/rl/gymEnv';
import { ESTrainer } from '@/robotics/rl/es';
import { Sequence, Repeat, Action, runTree, type Blackboard } from '@/robotics/behavior/behaviorTree';
import { bridge } from '@/viewport/cameraBridge';
import { actions } from '@/runtime/actions';
import type { Planner } from '@/control/motionRuntime';

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—');
const MAX_RANGE = 8;

function withJoints(doc: any, vals: Record<string, number>, rootId?: string, rootPos?: number[]) {
  const joints: any = { ...doc.joints };
  for (const [id, v] of Object.entries(vals)) { const j = joints[id]; if (j) joints[id] = { ...j, state: { ...j.state, value: v } }; }
  let bodies = doc.bodies;
  if (rootId && rootPos && doc.bodies[rootId]) {
    const b = doc.bodies[rootId];
    bodies = { ...doc.bodies, [rootId]: { ...b, transform: { ...b.transform, position: rootPos } } };
  }
  return { ...doc, joints, bodies };
}

/** Plan a path to a goal using the LiDAR map if we have one, else ground-truth obstacles. */
function planTo(goal: [number, number]): number[][] | null {
  const doc = useModelStore.getState().doc;
  const fk = computeFK(doc);
  const base = robotBaseXZ(doc, fk);
  const map = useAutonomyStore.getState().map;
  if (map && map.data.some((v) => v === 1)) {
    return planPath(map, base[0], base[1], goal[0], goal[1]);
  }
  const fps = obstacleFootprints(doc, fk);
  const grid = buildGrid(fps, worldBounds(fps, [base, goal]), 0.12, 0.3);
  return planPath(grid, base[0], base[1], goal[0], goal[1]);
}

export default function AutonomyPanel() {
  const goal = useAutonomyStore((s) => s.goal);
  const path = useAutonomyStore((s) => s.path);
  const status = useAutonomyStore((s) => s.status);
  const navigating = useAutonomyStore((s) => s.navigating);
  const settingGoal = useAutonomyStore((s) => s.settingGoal);
  const lidar = useAutonomyStore((s) => s.lidar);
  const showLidar = useAutonomyStore((s) => s.showLidar);
  const map = useAutonomyStore((s) => s.map);
  const avoidance = useAutonomyStore((s) => s.avoidance);
  const poseEstimate = useAutonomyStore((s) => s.poseEstimate);

  const [log, setLog] = useState('');
  const [planner, setPlanner] = useState<Planner>('rrtstar');
  const [motion, setMotion] = useState<{ phase: string; progress: number } | null>(null);
  const motionGoal = useRef<any>(null);
  const [train, setTrain] = useState<{ gen: number; ret: number; best: number } | null>(null);
  const [btRunning, setBtRunning] = useState(false);
  const [exploring, setExploring] = useState(false);
  const timer = useRef<any>(null);
  const btStop = useRef<any>(null);
  const exploreTimer = useRef<any>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); if (btStop.current) btStop.current(); if (exploreTimer.current) clearInterval(exploreTimer.current); }, []);

  const doc = useModelStore((s) => s.doc);
  const movable = Object.values(doc.joints).filter((j) => j.type !== 'fixed').length;
  const rootId = (doc.meta as any)?.rootBodyId;
  const rootQ = rootId ? doc.bodies[rootId]?.transform.quaternion : null;
  const mapCells = map ? map.data.reduce((a, v) => a + v, 0) : 0;

  // ── Navigation ─────────────────────────────────────────────────────────────
  const addObstacles = () => {
    const dispatch = useModelStore.getState().dispatch;
    const specs = [[1.3, 0.9], [-1.1, 1.6], [0.2, 2.4], [1.9, -0.5], [-1.6, -0.4]];
    for (const [x, z] of specs) {
      dispatch(commands.addBody(makeBody({
        name: 'Obstacle',
        transform: { position: [x, 0.45, z], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
        visual: { geometry: makeGeometry(GeometryType.BOX, { size: [0.5, 0.9, 0.5] }), materialId: null, origin: identityOrigin() },
        meta: { obstacle: true },
      })));
    }
    setLog(`Added ${specs.length} obstacles.`);
  };
  const clearObstacles = () => {
    const { doc: d, dispatch } = useModelStore.getState();
    const ids = Object.values(d.bodies).filter((b) => (b.meta as any)?.obstacle).map((b) => b.id);
    ids.forEach((id) => dispatch(commands.removeBody(id)));
    useAutonomyStore.getState().setPath(null);
    useAutonomyStore.getState().setMap(null);
    setLog(`Removed ${ids.length} obstacles, cleared map.`);
  };
  const plan = () => {
    const g = useAutonomyStore.getState().goal;
    if (!g) { setLog('Set a goal first (Pick goal → click the ground).'); return; }
    useAutonomyStore.getState().setStatus('planning');
    const p = planTo(g);
    useAutonomyStore.getState().setPath(p);
    useAutonomyStore.getState().setStatus(p ? 'idle' : 'failed');
    setLog(p ? `A* path: ${p.length} waypoints (${map && mapCells ? 'on LiDAR map' : 'on obstacle world'}).` : 'A*: no path found.');
  };
  const go = () => {
    if (!useAutonomyStore.getState().path) plan();
    if (useAutonomyStore.getState().path) { useAutonomyStore.getState().setNavigating(true); useAutonomyStore.getState().setStatus('navigating'); }
  };
  const stop = () => { useAutonomyStore.getState().setNavigating(false); useAutonomyStore.getState().setStatus('idle'); };

  // ── Perception / mapping ─────────────────────────────────────────────────────
  const scan = () => {
    const s = bridge.scanLidar?.();
    if (!s) { setLog('LiDAR unavailable (open the Simulator view).'); return; }
    const min = Math.min(...s.ranges);
    setLog(`LiDAR: ${s.ranges.length} beams · min ${fmt(min)} m`);
  };
  const buildMap = () => {
    const s = bridge.scanLidar?.();
    if (!s) { setLog('LiDAR unavailable.'); return; }
    let grid = useAutonomyStore.getState().map;
    if (!grid) {
      const d = useModelStore.getState().doc;
      const base = robotBaseXZ(d, computeFK(d));
      grid = emptyGrid(worldBounds([], [base, [base[0] + 6, base[1] + 6], [base[0] - 6, base[1] - 6]]), 0.15);
    }
    integrateScan(grid, s.points, s.ranges, MAX_RANGE, 0.25);
    useAutonomyStore.getState().setMap({ ...grid, data: grid.data.slice() }); // new ref → re-render
    setLog(`Map updated from LiDAR · ${grid.data.reduce((a, v) => a + v, 0)} occupied cells.`);
  };

  // ── Autonomous exploration (frontier-based: explore → map → repeat) ───────────
  const reachable = (x: number, z: number) => !!planTo([x, z]);

  const exploreTick = () => {
    const store = useAutonomyStore.getState();
    const d = useModelStore.getState().doc;
    const base = robotBaseXZ(d, computeFK(d));

    // Ensure an exploration map exists (with the known/observed layer).
    let grid = store.map;
    if (!grid) {
      grid = emptyGrid(worldBounds([], [base, [base[0] + 10, base[1] + 10], [base[0] - 10, base[1] - 10]]), 0.15);
    }
    // Fuse the latest LiDAR scan with ray tracing (free + occupied + known).
    const s = bridge.scanLidar?.();
    if (s) integrateScanTraced(grid, base[0], base[1], s.points, s.ranges, MAX_RANGE, 0.25);
    store.setMap({ ...grid, data: grid.data.slice(), known: grid.known ? grid.known.slice() : undefined });

    // Keep driving until we reach the current frontier.
    if (store.navigating && store.status !== 'arrived' && store.status !== 'failed') return;

    // Choose the next frontier to reveal more of the map.
    const goal = nextExplorationGoal(grid, base[0], base[1], reachable, 3);
    if (!goal) {
      stopExplore();
      setLog(`Exploration complete · ${grid.data.reduce((a, v) => a + v, 0)} occupied cells mapped. Save the map to keep it.`);
      return;
    }
    store.setGoal(goal);
    const p = planTo(goal);
    store.setPath(p);
    store.setNavigating(!!p);
    store.setStatus(p ? 'navigating' : 'failed');
    setLog(`Exploring → frontier ${fmt(goal[0])}, ${fmt(goal[1])} (${frontierGoals(grid, 3).length} frontiers left)`);
  };

  const startExplore = () => {
    setExploring(true);
    setLog('Autonomous exploration started — driving to frontiers and mapping…');
    exploreTick();
    exploreTimer.current = setInterval(exploreTick, 700);
  };
  const stopExplore = () => {
    if (exploreTimer.current) { clearInterval(exploreTimer.current); exploreTimer.current = null; }
    setExploring(false);
    useAutonomyStore.getState().setNavigating(false);
    useAutonomyStore.getState().setStatus('idle');
  };
  const toggleExplore = () => (exploring ? stopExplore() : startExplore());

  // ── Map persistence (the robot's memory of the space) ─────────────────────────
  const saveMap = () => {
    const m = useAutonomyStore.getState().map;
    if (!m) { setLog('No map yet — explore or build a map first.'); return; }
    downloadBlob(new Blob([serializeMapJSON(m)], { type: 'application/json' }),
      `map-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.ntmap`);
    setLog('Map saved (.ntmap). The robot can reload this space next time.');
  };
  const loadMap = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.ntmap,.json';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      try {
        const g = deserializeMap(await f.text());
        useAutonomyStore.getState().setMap(g);
        setLog(`Map loaded · ${g.data.reduce((a, v) => a + v, 0)} occupied cells. Plan/navigate uses it now.`);
      } catch { setLog('Not a valid .ntmap file.'); }
    };
    inp.click();
  };

  // ── Motion planning (RRT + real collision) ──────────────────────────────────
  const planArm = () => {
    const sel = useSelectionStore.getState();
    const d = useModelStore.getState().doc;
    const tipId = sel.kind === 'body' ? sel.selectedId : null;
    if (!tipId) { setLog('Select the body to plan (e.g. a hand), then retry.'); return; }
    const chain = chainJoints(d, tipId);
    if (!chain.length) { setLog('Selected body is not on a movable chain.'); return; }
    const start = chain.map((j: any) => j.state?.value ?? 0);
    const bounds = chain.map((j: any) => [j.limit?.lower ?? -Math.PI, j.limit?.upper ?? Math.PI] as [number, number]);
    const cm = new CollisionModel(d, 0);
    const collisionFree = (q: number[]) => {
      const vals: Record<string, number> = {};
      chain.forEach((j: any, i: number) => { vals[j.id] = q[i]; });
      return cm.collisionFree(vals);
    };
    // sample a collision-free goal config
    let target: number[] | null = null;
    for (let i = 0; i < 200 && !target; i++) {
      const q = bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo));
      if (collisionFree(q)) target = q;
    }
    if (!target) { setLog('Could not sample a collision-free goal.'); return; }
    const t0 = performance.now();
    const traj = planRRT(start, target, { bounds, collisionFree, step: 0.18, maxIter: 1500, goalBias: 0.15 });
    if (!traj) { setLog('RRT: no collision-free plan (retry / clear clutter).'); return; }
    setLog(`RRT: ${traj.length} states · ${Math.round(performance.now() - t0)} ms · collision-checked — executing…`);
    const ids = chain.map((j: any) => j.id);
    if (timer.current) clearInterval(timer.current);
    let seg = 0, u = 0;
    timer.current = setInterval(() => {
      if (seg >= traj.length - 1) { clearInterval(timer.current); timer.current = null; setLog('Trajectory executed.'); return; }
      u += 0.06; if (u >= 1) { u = 0; seg++; if (seg >= traj.length - 1) return; }
      const a = traj[seg], b = traj[seg + 1];
      const vals: Record<string, number> = {};
      ids.forEach((id: string, i: number) => { vals[id] = a[i] + (b[i] - a[i]) * u; });
      useModelStore.getState().applyTransient((dd) => withJoints(dd, vals));
    }, 16);
  };

  // ── Motion planning via the runtime /move_group action (RRT*/PRM + timed traj) ─
  const planExecute = () => {
    const sel = useSelectionStore.getState();
    const tipId = sel.kind === 'body' ? sel.selectedId : null;
    if (!tipId) { setLog('Select the tip body (e.g. a hand), then retry.'); return; }
    if (motionGoal.current) { motionGoal.current.cancel(); motionGoal.current = null; setMotion(null); return; }
    setMotion({ phase: 'planning', progress: 0 });
    const h = actions.send<{ tipId: string; planner: Planner }, { phase: string; progress: number }, { ok: boolean; states: number; cost: number }>(
      '/move_group', { tipId, planner },
    );
    motionGoal.current = h;
    h.onFeedback((fb) => setMotion(fb));
    h.result
      .then((r) => setLog(`${planner.toUpperCase()}: ${r.states} states · cost ${fmt(r.cost)} rad · executed.`))
      .catch((e) => setLog(`Motion: ${e.message}`))
      .finally(() => { motionGoal.current = null; setMotion(null); });
  };

  // ── Reinforcement learning (Evolution Strategies) ────────────────────────────
  const trainES = () => {
    const sel = useSelectionStore.getState();
    const d = useModelStore.getState().doc;
    const tipId = sel.kind === 'body' ? sel.selectedId : null;
    if (!tipId || !chainJoints(d, tipId).length) { setLog('Select a manipulator body (e.g. a hand) to train.'); return; }
    const fk = computeFK(d);
    const tip = fk.get(tipId)?.position ?? [0, 0, 0];
    const target: [number, number, number] = [tip[0] + (Math.random() - 0.5) * 0.6, tip[1] + (Math.random() - 0.1) * 0.4, tip[2] + (Math.random() - 0.5) * 0.6];
    const makeEnv = () => new ReachEnv(d, tipId, target, { maxSteps: 120 });
    const trainer = new ESTrainer(makeEnv, { pop: 14, sigma: 0.25, alpha: 0.06 });
    const GENS = 18;
    setTrain({ gen: 0, ret: 0, best: -Infinity });
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      const ret = trainer.generation();
      setTrain({ gen: trainer.gen, ret, best: trainer.best });
      if (trainer.gen >= GENS) {
        clearInterval(timer.current); timer.current = null;
        setLog(`Trained ${GENS} generations · best return ${fmt(trainer.best)} — running learned policy…`);
        playPolicy(makeEnv(), trainer.policy());
      }
    }, 120);
  };
  const playPolicy = (env: ReachEnv, policy: (o: number[]) => number[]) => {
    let obs = env.reset();
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      const r = env.step(policy(obs)); obs = r.obs;
      const vals: Record<string, number> = {};
      env.jointIds().forEach((id, i) => { vals[id] = env.values[i]; });
      useModelStore.getState().applyTransient((dd) => withJoints(dd, vals));
      if (r.done) { clearInterval(timer.current); timer.current = null; setLog(`Policy reached ${fmt(r.info.dist)} m in ${r.info.step} steps.`); }
    }, 16);
  };

  // ── Behaviour Tree (patrol mission) ──────────────────────────────────────────
  const runBehaviour = () => {
    if (btStop.current) { btStop.current(); btStop.current = null; setBtRunning(false); useAutonomyStore.getState().setNavigating(false); setLog('Behaviour stopped.'); return; }
    const bb: Blackboard = {};
    const tree = Repeat(Sequence('patrol', [
      Action('pick-goal', () => {
        const d = useModelStore.getState().doc; const base = robotBaseXZ(d, computeFK(d));
        // random reachable spot a few metres out
        const g: [number, number] = [base[0] + (Math.random() - 0.5) * 5, base[1] + (Math.random() - 0.5) * 5];
        useAutonomyStore.getState().setGoal(g); return 'success';
      }),
      Action('plan', () => { const g = useAutonomyStore.getState().goal!; const p = planTo(g); useAutonomyStore.getState().setPath(p); return p ? 'success' : 'failure'; }),
      Action('navigate', () => {
        const st = useAutonomyStore.getState();
        if (st.status === 'arrived') return 'success';
        if (!st.navigating) { st.setNavigating(true); st.setStatus('navigating'); }
        return 'running';
      }),
      Action('scan', () => { bridge.scanLidar?.(); return 'success'; }),
    ]));
    btStop.current = runTree(tree, bb, 3, (_s, active) => setLog(`BT ▸ ${active}`));
    setBtRunning(true);
    setLog('Behaviour tree running (patrol)…');
  };

  return (
    <div className="auto-panel">
      <div className="auto-sec">NAVIGATION</div>
      <div className="auto-row"><span>Status</span><strong className={status === 'failed' ? 'bad' : ''}>{status}{navigating ? ' ▶' : ''}</strong></div>
      <div className="auto-row"><span>Goal</span><strong>{goal ? `${fmt(goal[0])}, ${fmt(goal[1])}` : '—'}</strong></div>
      <div className="auto-row"><span>Path</span><strong>{path ? `${path.length} pts` : '—'}</strong></div>
      <div className="auto-btns"><button onClick={addObstacles}>Add obstacles</button><button onClick={clearObstacles}>Clear</button></div>
      <div className="auto-btns">
        <button className={settingGoal ? 'on' : ''} onClick={() => useAutonomyStore.getState().setSettingGoal(!settingGoal)}>{settingGoal ? 'Click ground…' : 'Pick goal'}</button>
        <button onClick={plan}>Plan A*</button>
      </div>
      <div className="auto-btns">
        <button className={avoidance ? 'on' : ''} onClick={() => useAutonomyStore.getState().toggleAvoidance()}
          title="Obstacle-aware local planning (DWB on an inflated costmap) vs plain pure-pursuit">
          {avoidance ? 'DWB avoidance ✓' : 'DWB avoidance'}
        </button>
        {!navigating ? <button className="primary" onClick={go}>Navigate ▶</button> : <button onClick={stop}>Stop ■</button>}
      </div>
      {navigating && poseEstimate && (
        <div className="auto-row"><span>AMCL est</span><strong>{fmt(poseEstimate[0])}, {fmt(poseEstimate[1])}</strong></div>
      )}

      <div className="auto-sec">PERCEPTION &amp; MAPPING</div>
      <div className="auto-btns"><button onClick={scan}>LiDAR scan</button><button onClick={buildMap}>Build map</button><button className={showLidar ? 'on' : ''} onClick={() => useAutonomyStore.getState().toggleLidar()}>Rays</button></div>
      <div className="auto-row"><span>LiDAR min</span><strong>{lidar ? `${fmt(Math.min(...lidar.ranges))} m` : '—'}</strong></div>
      <div className="auto-row"><span>Map cells</span><strong>{mapCells || '—'}</strong></div>

      <div className="auto-sec">AUTONOMOUS EXPLORATION</div>
      <div className="auto-hint">Robot drives itself to map boundaries (frontiers), building the map until the space is fully explored. Then save it — that's the robot's memory of the place.</div>
      <div className="auto-btns">
        <button className={exploring ? 'on' : 'primary'} onClick={toggleExplore}>{exploring ? 'Stop explore ■' : 'Explore ▶'}</button>
      </div>
      <div className="auto-btns">
        <button onClick={saveMap}>Save map</button>
        <button onClick={loadMap}>Load map</button>
      </div>

      <div className="auto-sec">MOTION PLANNING</div>
      <div className="auto-hint">Select a tip body (e.g. a hand) → plan a collision-checked, time-parameterized trajectory (runs through the runtime /move_group action).</div>
      <div className="auto-btns">
        <select value={planner} onChange={(e) => setPlanner(e.target.value as Planner)} title="Planner algorithm">
          <option value="rrtstar">RRT* (optimal)</option>
          <option value="rrt">RRT</option>
          <option value="prm">PRM</option>
          <option value="cartesian">Cartesian (line +X)</option>
        </select>
        <button className={motion ? 'on' : 'primary'} onClick={planExecute}>
          {motion ? `${motion.phase} ${Math.round(motion.progress * 100)}% ■` : 'Plan + Execute ▶'}
        </button>
      </div>
      {motion && <div className="auto-bar"><div className="auto-bar-fill" style={{ width: `${motion.progress * 100}%` }} /></div>}
      <div className="auto-btns"><button onClick={planArm}>Legacy RRT (untimed)</button></div>

      <div className="auto-sec">REINFORCEMENT LEARNING</div>
      <div className="auto-hint">Evolution-Strategies trainer on a reach task (select a manipulator body).</div>
      <div className="auto-btns"><button onClick={trainES}>Train policy</button></div>
      {train && <div className="auto-row"><span>Gen {train.gen}</span><strong>R {fmt(train.ret)} · best {fmt(train.best)}</strong></div>}

      <div className="auto-sec">BEHAVIOUR TREE</div>
      <div className="auto-hint">Patrol mission: pick → plan → navigate → scan, looping.</div>
      <div className="auto-btns"><button className={btRunning ? 'on' : ''} onClick={runBehaviour}>{btRunning ? 'Stop mission ■' : 'Run mission ▶'}</button></div>

      <div className="auto-sec">SENSORS</div>
      <div className="auto-row"><span>Encoders</span><strong>{movable} joints</strong></div>
      <div className="auto-row"><span>IMU (quat)</span><strong>{rootQ ? rootQ.map((v: number) => fmt(v, 2)).join(', ') : '—'}</strong></div>

      {log && <div className="auto-log">{log}</div>}
    </div>
  );
}
