/**
 * runtimeBridge.ts — wires the live app into the native runtime (Track 1).
 *
 * This is the one adapter allowed to import both the runtime (pure) and the app's
 * stores. It turns existing state changes into real published topics + TF + params,
 * so the Topics inspector, plots, recorder and diagnostics observe everything
 * uniformly. Idempotent: `initRuntimeBridge()` is safe to call once at app start.
 *
 * Publishers wired here:
 *   /clock                 — heartbeat (also lets playback show a moving clock)
 *   /joint_states          — movable joint names + positions (rad), from the model
 *   /tf                    — every body frame in its kinematic parent's frame (FK)
 *   /hardware/telemetry    — last parsed telemetry from the hardware bridge
 *   /analysis/joint_loads  — per-joint static torque + current
 *   /diagnostics           — subsystem health (hardware, overcurrent, runtime)
 */
import * as THREE from 'three';
import { bus, Topics } from '@/runtime/messageBus';
import { tf as tfTree, type Transform } from '@/runtime/tf';
import { params } from '@/runtime/params';
import { clock } from '@/runtime/clock';
import { player } from '@/runtime/recorder';
import { useModelStore } from '@/state/modelStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { useIntegrationStore } from '@/state/integrationStore';
import { computeFK, buildChildJointMap } from '@/kinematics/modelFK';
import { jointLoads } from '@/kinematics/analysis';
import type { Document } from '@/core/model/index';

let _inited = false;

export interface JointStateMsg { name: string[]; position: number[]; t: number }
export interface DiagnosticsMsg {
  status: { name: string; level: 'OK' | 'WARN' | 'ERROR'; message: string }[];
}

const _invM = new THREE.Matrix4();
const _tfP  = new THREE.Vector3();
const _tfQ  = new THREE.Quaternion();
const _tfS  = new THREE.Vector3();

function publishModel(doc: Document): void {
  // Skip while playback owns the clock — the bag is the source of truth then.
  if (clock.source === 'sim' && player.bag) return;

  const joints = Object.values(doc.joints).filter((j: any) => j.type !== 'fixed');
  const js: JointStateMsg = {
    name: joints.map((j: any) => j.name ?? j.id),
    position: joints.map((j: any) => j.state?.value ?? 0),
    t: clock.now(),
  };
  bus.publish<JointStateMsg>(Topics.jointStates, js);

  // TF: each body expressed in its kinematic parent's frame (world for roots).
  const fk = computeFK(doc);
  const childJoint = buildChildJointMap(doc);
  const tfs: Transform[] = [];
  const inv = _invM;
  for (const [id, w] of fk.entries() as Iterable<[string, any]>) {
    const body = doc.bodies[id];
    if (!body) continue;
    const name = body.name ?? id;
    const j = childJoint.get(id);
    if (j && doc.bodies[j.parentBodyId]) {
      const parent = doc.bodies[j.parentBodyId];
      const pw = fk.get(j.parentBodyId);
      const rel = inv.copy(pw.matrix).invert().multiply(w.matrix);
      rel.decompose(_tfP, _tfQ, _tfS);
      tfs.push({ parent: parent.name ?? j.parentBodyId, child: name, t: js.t,
        position: [_tfP.x, _tfP.y, _tfP.z], quaternion: [_tfQ.x, _tfQ.y, _tfQ.z, _tfQ.w] });
    } else {
      tfs.push({ parent: 'world', child: name, t: js.t, position: w.position, quaternion: w.quaternion });
    }
  }
  tfTree.setMany(tfs);
  bus.publish(Topics.tf, tfs);

  // Analysis loads (best-effort; static gravity model).
  try {
    const loads = jointLoads(doc, fk);
    const out: Record<string, { torque: number; current: number; overload: boolean }> = {};
    for (const [jid, v] of loads.entries() as Iterable<[string, any]>) out[jid] = v;
    bus.publish(Topics.jointLoads, out);
  } catch { /* analysis is non-critical */ }
}

function publishDiagnostics(): void {
  const hw = useHardwareStore.getState();
  const integ = useIntegrationStore.getState();
  const status: DiagnosticsMsg['status'] = [];

  status.push({
    name: 'hardware_link',
    level: hw.status === 'connected' ? 'OK' : hw.status === 'error' ? 'ERROR' : 'WARN',
    message: `${hw.type} · ${hw.status}`,
  });

  const oc = integ.overcurrentServos;
  status.push({
    name: 'servo_current',
    level: oc && oc.length ? 'ERROR' : 'OK',
    message: oc && oc.length ? `${oc.length} servo(s) overcurrent` : 'nominal',
  });

  status.push({
    name: 'runtime_clock',
    level: 'OK',
    message: `${clock.source}${clock.paused ? ' (paused)' : ''} ×${clock.rate}`,
  });

  bus.publish<DiagnosticsMsg>(Topics.diagnostics, { status });
}

export function initRuntimeBridge(): void {
  if (_inited || typeof window === 'undefined') return;
  _inited = true;

  // Advertise core topics (latched so late-mounting panels get last state).
  bus.advertise(Topics.clock, { type: 'clock', latched: true, node: '/runtime' });
  bus.advertise(Topics.jointStates, { type: 'JointState', latched: true, node: '/model' });
  bus.advertise(Topics.tf, { type: 'TFMessage', latched: true, node: '/model' });
  bus.advertise(Topics.hardwareTelemetry, { type: 'Telemetry', latched: true, node: '/hardware' });
  bus.advertise(Topics.jointLoads, { type: 'JointLoads', latched: true, node: '/analysis' });
  bus.advertise(Topics.diagnostics, { type: 'Diagnostics', latched: true, node: '/diagnostics' });

  // A few global runtime parameters (a generic param editor can drive these).
  params.declare({ name: '/runtime/clock_hz', type: 'number', value: 10, min: 1, max: 60, step: 1,
    description: 'Clock + diagnostics heartbeat rate' });

  // Model → joint_states + tf + loads. Throttled to 20 Hz so that during
  // animation playback (which calls applyTransient at 60fps) we don't create
  // new Three.js objects + Maps on every render frame.
  let _lastPublishT = 0;
  const PUBLISH_MIN_MS = 50; // 20 Hz
  useModelStore.getState().bus.subscribe(() => {
    const now = Date.now();
    if (now - _lastPublishT < PUBLISH_MIN_MS) return;
    _lastPublishT = now;
    publishModel(useModelStore.getState().doc);
  });
  publishModel(useModelStore.getState().doc);

  // Hardware telemetry → topic.
  useHardwareStore.subscribe((s, prev) => {
    if (s.telemetry && s.telemetry !== prev.telemetry) {
      bus.publish(Topics.hardwareTelemetry, s.telemetry);
    }
  });

  // Heartbeat: clock + diagnostics. Driven by wall time even during playback so the
  // diagnostics panel keeps refreshing; /clock reflects whichever source is active.
  const beat = () => {
    bus.publish(Topics.clock, { t: clock.now(), source: clock.source, paused: clock.paused, rate: clock.rate });
    publishDiagnostics();
  };
  const hz = (params.get<number>('/runtime/clock_hz') ?? 10);
  window.setInterval(beat, Math.max(16, 1000 / hz));
  beat();
}
