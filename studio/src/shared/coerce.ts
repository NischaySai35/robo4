/**
 * Coercion of loosely-typed input (AI plans, user scripts, saved JSON) into safe values.
 */
import type { RGBA } from '@/core/model/index';

/** `v` as a finite number, else `fallback`. */
export const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** A 3-number array from `v` (each entry coerced), else `fallback`. */
export const vec3 = (v: any, fallback: any) => (Array.isArray(v) && v.length >= 3
  ? [num(v[0], fallback[0]), num(v[1], fallback[1]), num(v[2], fallback[2])]
  : fallback);

/** '#rrggbb' → opaque RGBA in 0..1, or null if not a valid hex colour. */
export function colorFromHex(hex: unknown): RGBA | null {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}
