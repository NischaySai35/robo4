/**
 * HumanoidActionBar — top-bar action buttons shown ONLY while a humanoid project
 * is open (doc.meta.robot === 'humanoid').
 *
 * Each action is a kinematic driver: time → { pose: {role: rad}, root?: {dx,dy,dz} }.
 * `pose` sets joint angles by role (tagged in the humanoid factory); `root` glides
 * the pelvis (the FK root) so Walk actually travels and Jump leaves the ground. The
 * runner pushes everything through the store's TRANSIENT path each frame, so live
 * playback never floods undo history. (Kinematic preview — not physics-balanced.)
 */
import './HumanoidActionBar.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useAutonomyStore } from '@/state/autonomyStore';
import { follow } from '@/robotics/nav/pathFollower';
import type { Document } from '@/core/model/index';

const PI = Math.PI;
const smooth = (x: number) => x * x * (3 - 2 * x);

type Frame = { pose: Record<string, number>; root?: { dx?: number; dy?: number; dz?: number } };

// role keys: `${role}` or `${role}.${side}`  (side = 'L' | 'R')
const ACTIONS: Record<string, (t: number) => Frame> = {
  // ── Natural bipedal gait ───────────────────────────────────────────────────
  // One full cycle = two steps. Each leg: stance (planted, body rolls over foot)
  // then swing (knee bends to lift, leg swings forward). Hips counter-swing the
  // arms; the pelvis bobs/sways and travels forward so feet don't skate.
  walk: (t) => {
    const cycle = 1.1;
    const ph = (t / cycle) % 1;
    const A_hip = 0.42, A_knee = 1.0, A_ank = 0.16, A_arm = 0.5;
    const leg = (p: number) => {
      const hip = -A_hip * Math.cos(2 * PI * p);                 // forward(−) at p=0
      const swing = Math.max(0, Math.sin(PI * ((p - 0.5) / 0.5))); // bump over p∈[0.5,1)
      const knee = A_knee * swing + 0.1;                          // bend(+), slight stance flex
      const ankle = -A_ank * Math.sin(2 * PI * p);
      return { hip, knee, ankle };
    };
    const Lg = leg(ph), Rg = leg((ph + 0.5) % 1);
    return {
      pose: {
        'hip_pitch.L': Lg.hip, 'knee.L': Lg.knee, 'ankle.L': Lg.ankle,
        'hip_pitch.R': Rg.hip, 'knee.R': Rg.knee, 'ankle.R': Rg.ankle,
        'shoulder_pitch.L':  A_arm * Math.cos(2 * PI * ph),
        'shoulder_pitch.R': -A_arm * Math.cos(2 * PI * ph),
        'elbow.L': 0.35, 'elbow.R': 0.35,
        'waist_pitch': 0.10,
        'chest_yaw': 0.07 * Math.sin(2 * PI * ph),
      },
      root: {
        dx: 0.02 * Math.sin(2 * PI * ph),               // lateral sway (1/cycle)
        dy: 0.012 * Math.cos(4 * PI * ph) - 0.006,      // vertical bob (2/cycle)
        dz: 0.45 * t,                                   // travel forward
      },
    };
  },

  // ── Crouch → launch → airborne → land ──────────────────────────────────────
  jump: (t) => {
    const ph = (t / 1.4) % 1;
    let crouch = 0;
    if (ph < 0.4) crouch = smooth(ph / 0.4);                 // sink
    else if (ph < 0.5) crouch = 1 - smooth((ph - 0.4) / 0.1); // explosive extend
    const air = ph >= 0.45 && ph < 0.9 ? Math.sin(PI * ((ph - 0.45) / 0.45)) : 0;
    return {
      pose: {
        'hip_pitch.L': -1.1 * crouch - 0.5 * air, 'hip_pitch.R': -1.1 * crouch - 0.5 * air,
        'knee.L': 1.7 * crouch + 0.8 * air, 'knee.R': 1.7 * crouch + 0.8 * air,
        'ankle.L': -0.4 * crouch, 'ankle.R': -0.4 * crouch,
        'shoulder_pitch.L': -1.7 * crouch, 'shoulder_pitch.R': -1.7 * crouch,
        'waist_pitch': 0.25 * crouch,
      },
      root: { dy: 0.32 * air - 0.10 * crouch },
    };
  },

  wave: (t) => ({
    pose: {
      'shoulder_pitch.R': -2.4,
      'shoulder_roll.R': -0.5,
      'elbow.R': 1.0 + 0.45 * Math.sin(t * 7),
      'wrist.R': 0.4 * Math.sin(t * 7),
      'shoulder_pitch.L': -0.1,
      'head_pitch': -0.08,
    },
  }),
};

const BUTTONS = [
  { key: 'walk', label: 'Walk' },
  { key: 'jump', label: 'Jump' },
  { key: 'wave', label: 'Wave' },
];

function applyPose(doc: Document, idVals: Record<string, number>, rootId: string | null, rootPos: number[] | null, rootQuat?: number[] | null): Document {
  const joints: any = { ...doc.joints };
  for (const [id, v] of Object.entries(idVals)) {
    const j = joints[id];
    if (j) joints[id] = { ...j, state: { ...j.state, value: v } };
  }
  let bodies = doc.bodies;
  if (rootId && (rootPos || rootQuat) && doc.bodies[rootId]) {
    const b = doc.bodies[rootId];
    bodies = { ...doc.bodies, [rootId]: { ...b, transform: { ...b.transform, position: (rootPos ?? b.transform.position) as any, quaternion: (rootQuat ?? b.transform.quaternion) as any } } };
  }
  return { ...doc, joints, bodies };
}

// Yaw (about +Y) ↔ quaternion helpers for steering the walk.
const yawQuat = (y: number) => [0, Math.sin(y / 2), 0, Math.cos(y / 2)];
const quatYaw = (q: number[]) => Math.atan2(2 * (q[3] * q[1] + q[0] * q[2]), 1 - 2 * (q[1] * q[1] + q[0] * q[0]));

export default function HumanoidActionBar() {
  const isHumanoid = useModelStore((s) => (s.doc.meta as any)?.robot === 'humanoid');
  const joints = useModelStore((s) => s.doc.joints);
  const rootId = useModelStore((s) => (s.doc.meta as any)?.rootBodyId ?? null);
  const [active, setActive] = useState<string | null>(null);
  // Original pelvis rest (captured once per robot) so Home resets height/pose.
  const restRef = useRef<number[] | null>(null);
  useEffect(() => {
    const b = rootId ? useModelStore.getState().doc.bodies[rootId] : null;
    restRef.current = b ? [...b.transform.position] : null;
  }, [rootId]);

  const { roleIndex, allMovable } = useMemo(() => {
    const roleIndex: Record<string, string> = {};
    const allMovable: string[] = [];
    for (const j of Object.values(joints)) {
      if (j.type !== 'fixed') allMovable.push(j.id);
      const role = (j.meta as any)?.role;
      if (!role) continue;
      const side = (j.meta as any)?.side;
      roleIndex[side ? `${role}.${side}` : role] = j.id;
      if (!(role in roleIndex)) roleIndex[role] = j.id;
    }
    return { roleIndex, allMovable };
  }, [joints]);

  useEffect(() => {
    if (!active || !ACTIONS[active]) return undefined;
    const fn = ACTIONS[active];
    const t0 = performance.now();
    const rest = (rootId ? useModelStore.getState().doc.bodies[rootId]?.transform.position : null) ?? [0, 0, 0];
    let raf = 0;
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      const { pose, root } = fn(t);
      const idVals: Record<string, number> = {};
      for (const id of allMovable) idVals[id] = 0;
      for (const [k, v] of Object.entries(pose)) { const id = roleIndex[k]; if (id) idVals[id] = v; }
      const rootPos = root
        ? [rest[0] + (root.dx ?? 0), rest[1] + (root.dy ?? 0), rest[2] + (root.dz ?? 0)]
        : null;
      useModelStore.getState().applyTransient((d) => applyPose(d, idVals, rootId, rootPos));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, roleIndex, allMovable, rootId]);

  // ── Autonomous navigation: steer the gait along the planned A* path ──────────
  const navigating = useAutonomyStore((s) => s.navigating);
  useEffect(() => {
    if (!navigating || !isHumanoid || !rootId) return undefined;
    const b0 = useModelStore.getState().doc.bodies[rootId];
    if (!b0) return undefined;
    let rx = b0.transform.position[0], rz = b0.transform.position[2];
    const restY = b0.transform.position[1];
    let ryaw = quatYaw(b0.transform.quaternion);
    const SPEED = 0.5, TURN = 1.8;
    const t0 = performance.now();
    let last = t0, raf = 0;
    const stopNav = (st: any) => {
      useAutonomyStore.getState().setNavigating(false);
      useAutonomyStore.getState().setStatus(st);
    };
    const loop = () => {
      const now = performance.now();
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const path = useAutonomyStore.getState().path;
      if (!path) { stopNav('idle'); return; }
      const cmd = follow(path, { x: rx, z: rz, yaw: ryaw });
      if (cmd.done) {
        // settle to a clean stance at the goal
        const idVals: Record<string, number> = {}; for (const id of allMovable) idVals[id] = 0;
        useModelStore.getState().applyTransient((d) => applyPose(d, idVals, rootId, [rx, restY, rz], yawQuat(ryaw)));
        stopNav('arrived');
        return;
      }
      ryaw += Math.max(-TURN * dt, Math.min(TURN * dt, cmd.headingErr));
      const v = SPEED * cmd.forward;
      rx += Math.sin(ryaw) * v * dt;
      rz += Math.cos(ryaw) * v * dt;
      const pose = ACTIONS.walk(t).pose;
      const idVals: Record<string, number> = {};
      for (const id of allMovable) idVals[id] = 0;
      for (const [k, val] of Object.entries(pose)) { const id = roleIndex[k]; if (id) idVals[id] = val; }
      const bob = 0.012 * Math.cos(4 * PI * ((t / 1.1) % 1)) - 0.006;
      useModelStore.getState().applyTransient((d) => applyPose(d, idVals, rootId, [rx, restY + bob, rz], yawQuat(ryaw)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [navigating, isHumanoid, rootId, roleIndex, allMovable]);

  if (!isHumanoid) return null;

  const home = () => {
    setActive(null);
    const d = useModelStore.getState().doc;
    const cur = (rootId ? d.bodies[rootId]?.transform.position : null) ?? [0, 0.95, 0];
    const restY = restRef.current?.[1] ?? cur[1];
    const rootPos = [cur[0], restY, cur[2]]; // keep ground spot, reset height & pose
    const idVals: Record<string, number> = {};
    for (const id of allMovable) idVals[id] = 0;
    useModelStore.getState().applyTransient((doc) => applyPose(doc, idVals, rootId, rootPos));
  };

  return (
    <div className="haction-bar" title="Humanoid actions (kinematic preview)">
      {BUTTONS.map((b) => (
        <button
          key={b.key}
          className={`haction-btn${active === b.key ? ' on' : ''}`}
          onClick={() => setActive((cur) => (cur === b.key ? null : b.key))}
        >
          {b.label}
        </button>
      ))}
      <button className="haction-btn haction-home" onClick={home} title="Reset to neutral stance">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M2 6.5L7 2l5 4.5M3.5 5.5V12h7V5.5" />
        </svg>
        Home
      </button>
    </div>
  );
}
