/**
 * tf.ts — the transform tree (ROS 2 tf2, native).
 *
 * A live tree of named coordinate frames connected by time-stamped transforms.
 * Producers (FK, odometry, mapping) push frame→parent transforms; consumers ask
 * `lookup(target, source)` for the relative pose, composing along the tree. A short
 * per-frame history lets lookups interpolate to a requested time (so playback and
 * sensor fusion line up). No React; uses Three only for quaternion/vector math, kept
 * importable in node.
 */
import * as THREE from 'three';

export interface Transform {
  /** parent frame this transform is expressed in */
  parent: string;
  /** child frame */
  child: string;
  t: number;                 // runtime-clock timestamp (ms)
  position: [number, number, number];
  quaternion: [number, number, number, number];
}

interface FrameHist {
  parent: string;
  samples: Transform[];      // ascending by t, capped
}

const HIST_CAP = 120;

export class TransformTree {
  private _frames = new Map<string, FrameHist>();
  private _listeners = new Set<() => void>();

  /** Publish a transform (child expressed in parent). */
  set(tf: Transform): void {
    let h = this._frames.get(tf.child);
    if (!h || h.parent !== tf.parent) {
      h = { parent: tf.parent, samples: [] };
      this._frames.set(tf.child, h);
    }
    h.samples.push(tf);
    if (h.samples.length > HIST_CAP) h.samples.shift();
    this._emit();
  }

  /** Bulk set (one FK tick), emitting once. */
  setMany(tfs: Transform[]): void {
    for (const tf of tfs) {
      let h = this._frames.get(tf.child);
      if (!h || h.parent !== tf.parent) { h = { parent: tf.parent, samples: [] }; this._frames.set(tf.child, h); }
      h.samples.push(tf);
      if (h.samples.length > HIST_CAP) h.samples.shift();
    }
    this._emit();
  }

  /** The transform of `child` in its parent at time `t` (interpolated). */
  private _sampleAt(child: string, t?: number): { parent: string; m: THREE.Matrix4 } | null {
    const h = this._frames.get(child);
    if (!h || h.samples.length === 0) return null;
    const s = this._interp(h.samples, t);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...s.position),
      new THREE.Quaternion(...s.quaternion),
      new THREE.Vector3(1, 1, 1),
    );
    return { parent: h.parent, m };
  }

  private _interp(samples: Transform[], t?: number): Transform {
    if (t == null || samples.length === 1) return samples[samples.length - 1];
    if (t <= samples[0].t) return samples[0];
    if (t >= samples[samples.length - 1].t) return samples[samples.length - 1];
    let i = 1;
    while (i < samples.length && samples[i].t < t) i++;
    const a = samples[i - 1], b = samples[i];
    const f = (t - a.t) / (b.t - a.t || 1);
    const pa = new THREE.Vector3(...a.position), pb = new THREE.Vector3(...b.position);
    const qa = new THREE.Quaternion(...a.quaternion), qb = new THREE.Quaternion(...b.quaternion);
    const p = pa.lerp(pb, f);
    const q = qa.slerp(qb, f);
    return { parent: a.parent, child: a.child, t, position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
  }

  /** World (root) transform of a frame by walking to the root. */
  private _worldOf(frame: string, t?: number): THREE.Matrix4 | null {
    let m = new THREE.Matrix4();
    let cur = frame;
    const seen = new Set<string>();
    while (true) {
      if (seen.has(cur)) return null; // cycle guard
      seen.add(cur);
      const s = this._sampleAt(cur, t);
      if (!s) break;                  // cur is a root (no transform => identity to world)
      m = new THREE.Matrix4().multiplyMatrices(s.m, m);
      cur = s.parent;
    }
    return m;
  }

  /** Pose of `source` frame expressed in `target` frame at time t. */
  lookup(target: string, source: string, t?: number): Transform | null {
    const wTarget = this._worldOf(target, t);
    const wSource = this._worldOf(source, t);
    if (!wTarget || !wSource) return null;
    const rel = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(wTarget).invert(), wSource);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    rel.decompose(p, q, s);
    return { parent: target, child: source, t: t ?? 0, position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
  }

  /** Frame names + their parents (for the tree viewer). */
  frames(): { frame: string; parent: string }[] {
    return [...this._frames.entries()].map(([frame, h]) => ({ frame, parent: h.parent }));
  }

  roots(): string[] {
    const parents = new Set<string>();
    for (const h of this._frames.values()) parents.add(h.parent);
    const children = new Set(this._frames.keys());
    return [...parents].filter((p) => !children.has(p));
  }

  subscribe(fn: () => void): () => void { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  clear(): void { this._frames.clear(); this._emit(); }
  private _emit(): void { for (const fn of this._listeners) fn(); }
}

export const tf = new TransformTree();
