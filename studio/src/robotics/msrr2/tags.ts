/**
 * tags.ts — measure a shape's capability tags (brief §3, §5 L2.4).
 *
 * Every value here is MEASURED by the static checker on the actual pose, never
 * claimed. Dynamic tags (moves_on_floor, max_speed_mm_s) need the shape's behaviour
 * run in the Python sim; until that has happened they are simply absent.
 */
import { type Config, type CapabilityTag, type TagValue, type PortId, CONFIG, isFloorRef, PORTS, isEndPort } from './model';
import { checkStatic, type StaticReport } from './statics';
import { PORT_SEG } from './kin';
import { type V3 } from './vec';

export type Tags = Partial<Record<CapabilityTag, TagValue>>;
const S = (value: number | boolean): TagValue => ({ value, measuredBy: 'static' });

/** Contact patches farther apart than this are separate feet (m). */
const FOOT = 0.06;

export function feet(r: StaticReport): V3[] {
  const out: V3[] = [];
  for (const c of r.contacts) if (!out.some((f) => Math.hypot(f[0] - c.p[0], f[2] - c.p[2]) < FOOT)) out.push(c.p);
  for (const f of r.assembly.floorLocks) {
    const p: V3 = [f.anchor.x, 0, f.anchor.z];
    if (!out.some((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < FOOT)) out.push(p);
  }
  return out;
}

function hullArea(pts: [number, number][]): { area: number; perim: number } {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) {
    const perim = p.length === 2 ? 2 * Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) : 0;
    return { area: 0, perim };
  }
  const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [], up: [number, number][] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  const h = [...lo.slice(0, -1), ...up.slice(0, -1)];
  let area = 0, perim = 0;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    area += a[0] * b[1] - b[0] * a[1];
    perim += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { area: Math.abs(area) / 2, perim };
}

/** The most extra kg the highest point of the shape can carry before a check fails. */
export function holdsLoad(cfg: Config, r: StaticReport): number {
  if (!r.ok) return 0;
  let top = { y: -Infinity, p: [0, 0, 0] as V3, module: '', seg: 0 };
  for (const m of r.assembly.placed.values()) for (const s of m.geo.spheres) {
    if (s.c[1] + s.r > top.y) top = { y: s.c[1] + s.r, p: [s.c[0], s.c[1] + s.r, s.c[2]], module: m.id, seg: s.seg };
  }
  const ok = (kg: number) => checkStatic(cfg, undefined, { extraLoads: [{ p: top.p, kg, module: top.module, seg: top.seg }] }).ok;
  let lo = 0, hi = 5;
  if (ok(hi)) return hi;
  for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
  return Math.round(lo * 100) / 100;
}

export function measureStaticTags(cfg: Config, report?: StaticReport, withLoad = true): Tags {
  const r = report ?? checkStatic(cfg);
  const placed = [...r.assembly.placed.values()];
  const spheres = placed.flatMap((m) => m.geo.spheres.map((s) => ({ ...s, m: m.id })));
  const height = spheres.reduce((h, s) => Math.max(h, s.c[1] + s.r), 0);
  const f = feet(r);

  // free ends: an END port with no lock, not resting on the floor
  const locked = new Set<string>();
  for (const e of cfg.edges) if (e.locked) {
    if (!isFloorRef(e.a)) locked.add(`${e.a.module}.${e.a.port}`);
    locked.add(`${e.b.module}.${e.b.port}`);
  }
  const freeEnds: V3[] = [];
  for (const m of placed) for (const p of PORTS as readonly PortId[]) {
    if (!isEndPort(p) || locked.has(`${m.id}.${p}`)) continue;
    const pos = m.geo.ports[p].pos;
    const onFloor = r.contacts.some((c) => c.module === m.id && c.seg === PORT_SEG[p]);
    if (!onFloor && pos[1] > 0.05) freeEnds.push(pos);
  }
  const base: V3 = f.length ? [f.reduce((s, p) => s + p[0], 0) / f.length, 0, f.reduce((s, p) => s + p[2], 0) / f.length] : [r.com[0], 0, r.com[2]];
  const reach = freeEnds.reduce((m, p) => Math.max(m, Math.hypot(p[0] - base[0], p[2] - base[2])), 0);

  // flat top: everything within 15 mm of the highest point
  const topSph = spheres.filter((s) => s.c[1] + s.r > height - 0.015);
  const { area, perim } = hullArea(topSph.map((s) => [s.c[0], s.c[2]] as [number, number]));
  const rr = topSph.length ? topSph.reduce((a, s) => a + s.r, 0) / topSph.length : 0;
  const flatTop = (area + perim * rr + Math.PI * rr * rr) * 1e4;

  // spans a gap: the widest pair of feet with nothing touching the floor between them
  // and real clearance underneath (a module lying flat touches only at its ends, but
  // nothing fits under it)
  const GAP_CLEARANCE = 0.04;
  let span = 0;
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
    const a = f[i], b = f[j];
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const between = r.contacts.some((c) => {
      const t = ((c.p[0] - a[0]) * (b[0] - a[0]) + (c.p[2] - a[2]) * (b[2] - a[2])) / (d * d || 1);
      return t > 0.15 && t < 0.85;
    });
    const under = spheres.filter((sp) => {
      const t = ((sp.c[0] - a[0]) * (b[0] - a[0]) + (sp.c[2] - a[2]) * (b[2] - a[2])) / (d * d || 1);
      return t > 0.25 && t < 0.75;
    });
    const clearance = under.length ? Math.min(...under.map((sp) => sp.c[1] - sp.r)) : 0;
    if (!between && clearance >= GAP_CLEARANCE) span = Math.max(span, d - 0.08);
  }

  const modEdges = cfg.edges.filter((e) => e.locked && !isFloorRef(e.a)).length;
  const active = cfg.modules.filter((m) => !cfg.unused.includes(m)).length;
  const cogH = r.com[1];
  const tilt = r.supportedBy === 'floor-contact' && r.margins.cogMarginMm > 0 && cogH > 0
    ? (Math.atan2(r.margins.cogMarginMm / 1000, cogH) * 180) / Math.PI
    : r.supportedBy === 'floor-anchor' ? 45 : 0;

  const tags: Tags = {
    ground_contacts: S(f.length),
    cog_height_mm: S(Math.round(cogH * 1000)),
    height_mm: S(Math.round(height * 1000)),
    stands_upright: S(r.ok && height > 0.2 && (r.supportedBy === 'floor-anchor' || r.margins.cogMarginMm >= CONFIG.limits.cogMarginMm)),
    has_free_end: S(freeEnds.length > 0),
    reach_mm: S(Math.round(reach * 1000)),
    flat_top_area_cm2: S(Math.round(flatTop)),
    stable_on_tilt_deg: S(Math.round(tilt * 10) / 10),
    encloses: S(modEdges >= active && active > 1),
    spans_gap_mm: S(Math.round(Math.max(0, span) * 1000)),
  };
  if (withLoad) tags.holds_load_kg = S(holdsLoad(cfg, r));
  return tags;
}
