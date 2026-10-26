/**
 * simScene.ts — what the Python VERIFY service (C:\TETROBOT\sim\verify_service.py) needs
 * to build a MuJoCo scene: every module's world base frame + joint angles, and the locks.
 */
import { assemble } from './assemble';
import { type Config, isFloorRef, CONFIG } from './model';
import type { Plan } from './planner';

export interface SimScene {
  modules: { id: string; base: { p: number[]; q: number[] }; rad: number[] }[];
  locks: { a: { module: string; port: string } | { floor: string }; b: { module: string; port: string } }[];
  /** floor receivers (yawDeg = the direction of one of its GAPS; its pads sit 45° from it) */
  anchors: { id: string; x: number; z: number; yawDeg: number }[];
}

export function toSimScene(cfg: Config): SimScene {
  const asm = assemble(cfg);
  return {
    modules: cfg.modules.filter((m) => asm.placed.has(m)).map((m) => {
      const pl = asm.placed.get(m)!;
      return { id: m, base: { p: [...pl.base.p], q: [...pl.base.q] }, rad: [...pl.rad] };
    }),
    locks: cfg.edges.filter((e) => e.locked).map((e) => ({
      a: isFloorRef(e.a) ? { floor: e.a.floor } : { module: e.a.module, port: e.a.port },
      b: { module: e.b.module, port: e.b.port },
    })),
    anchors: CONFIG.floorAnchors.map((a) => ({ id: a.id, x: a.x, z: a.z, yawDeg: a.yawDeg })),
  };
}

export function toSimPlan(start: Config, plan: Plan) {
  return {
    scene: toSimScene(start),
    plan: {
      steps: plan.steps.map((s) => ({
        verb: s.verb, label: s.label, durationS: s.durationS, successP: s.successP,
        scene: toSimScene(s.expected), via: (s.via ?? []).map(toSimScene),
      })),
    },
  };
}

export const VERIFY_URL = 'http://127.0.0.1:8771';
