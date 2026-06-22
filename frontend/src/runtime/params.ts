/**
 * params.ts — hierarchical parameter server (ROS 2 parameters, native).
 *
 * Parameters are typed, namespaced (`/nav/inflation_radius`), optionally constrained
 * (min/max/enum). Declaring a param with constraints lets a GENERIC parameter editor
 * build the right control automatically — no bespoke UI per setting. Subsystems read
 * params instead of hard-coding constants, and changes emit events so they re-tune
 * live. No React/Three.
 */

export type ParamValue = number | boolean | string | number[];
export type ParamType = 'number' | 'boolean' | 'string' | 'number[]';

export interface ParamSpec {
  name: string;
  type: ParamType;
  value: ParamValue;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  enum?: string[];
}

type ParamListener = (name: string, value: ParamValue) => void;

export class ParameterServer {
  private _params = new Map<string, ParamSpec>();
  private _listeners = new Set<ParamListener>();

  declare(spec: ParamSpec): ParamSpec {
    const existing = this._params.get(spec.name);
    // Re-declaring keeps any already-set value (e.g. loaded from a project).
    const merged: ParamSpec = existing ? { ...spec, value: existing.value } : { ...spec };
    this._params.set(spec.name, merged);
    return merged;
  }

  has(name: string): boolean { return this._params.has(name); }

  get<T extends ParamValue = ParamValue>(name: string): T | undefined {
    return this._params.get(name)?.value as T | undefined;
  }

  /** Get with a fallback default (declares nothing). */
  getOr<T extends ParamValue>(name: string, fallback: T): T {
    const v = this._params.get(name)?.value;
    return (v === undefined ? fallback : v) as T;
  }

  set(name: string, value: ParamValue): void {
    const spec = this._params.get(name);
    if (!spec) {
      // allow setting undeclared params (inferred type)
      const type: ParamType = Array.isArray(value) ? 'number[]'
        : typeof value === 'number' ? 'number'
        : typeof value === 'boolean' ? 'boolean' : 'string';
      this._params.set(name, { name, type, value });
    } else {
      spec.value = this._coerce(spec, value);
    }
    this._emit(name, this.get(name)!);
  }

  list(): ParamSpec[] {
    return [...this._params.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Export/import for project persistence (name→value only). */
  dump(): Record<string, ParamValue> {
    const out: Record<string, ParamValue> = {};
    for (const [k, v] of this._params) out[k] = v.value;
    return out;
  }

  load(values: Record<string, ParamValue>): void {
    for (const [k, v] of Object.entries(values)) this.set(k, v);
  }

  subscribe(fn: ParamListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  clear(): void { this._params.clear(); }

  private _coerce(spec: ParamSpec, value: ParamValue): ParamValue {
    if (spec.type === 'number' && typeof value === 'number') {
      let v = value;
      if (spec.min != null) v = Math.max(spec.min, v);
      if (spec.max != null) v = Math.min(spec.max, v);
      return v;
    }
    return value;
  }

  private _emit(name: string, value: ParamValue): void {
    for (const fn of this._listeners) fn(name, value);
  }
}

export const params = new ParameterServer();
