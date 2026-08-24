/**
 * actions.ts — long-running goals with feedback + cancel (ROS 2 actions, native).
 *
 * Planning, navigation, trajectory execution, RL training — anything that takes time
 * and wants live progress — is an action. A server registers a goal executor that
 * receives a `report(feedback)` callback and a `signal` (AbortSignal) for cancellation,
 * and returns a result. Callers get a GoalHandle to watch feedback/status and cancel.
 * No React/Three.
 */

export type GoalStatus = 'pending' | 'active' | 'succeeded' | 'aborted' | 'canceled';

export interface GoalContext<Fb> {
  report: (feedback: Fb) => void;
  signal: AbortSignal;
}

export type GoalExecutor<Goal, Fb, Res> = (goal: Goal, ctx: GoalContext<Fb>) => Promise<Res>;

export interface GoalHandle<Fb, Res> {
  id: string;
  status: GoalStatus;
  onFeedback: (fn: (fb: Fb) => void) => () => void;
  result: Promise<Res>;
  cancel: () => void;
}

let _goalSeq = 0;

interface ActionEntry { name: string; executor: GoalExecutor<unknown, unknown, unknown>; }

export class ActionRegistry {
  private _actions = new Map<string, ActionEntry>();
  private _active = new Map<string, { name: string; status: GoalStatus }>();
  private _metaListeners = new Set<() => void>();

  advertise<Goal, Fb, Res>(name: string, executor: GoalExecutor<Goal, Fb, Res>): () => void {
    this._actions.set(name, { name, executor: executor as GoalExecutor<unknown, unknown, unknown> });
    this._emitMeta();
    return () => { this._actions.delete(name); this._emitMeta(); };
  }

  has(name: string): boolean { return this._actions.has(name); }

  /** Send a goal. Returns a handle immediately; execution runs async. */
  send<Goal, Fb, Res>(name: string, goal: Goal): GoalHandle<Fb, Res> {
    const entry = this._actions.get(name);
    if (!entry) throw new Error(`action not available: ${name}`);

    const id = `goal_${++_goalSeq}`;
    const fbListeners = new Set<(fb: Fb) => void>();
    const abort = new AbortController();
    const state = { name, status: 'pending' as GoalStatus };
    this._active.set(id, state);
    this._emitMeta();

    const ctx: GoalContext<Fb> = {
      report: (fb) => { for (const fn of fbListeners) fn(fb); },
      signal: abort.signal,
    };

    const handle: GoalHandle<Fb, Res> = {
      id,
      status: 'active',
      onFeedback: (fn) => { fbListeners.add(fn); return () => fbListeners.delete(fn); },
      result: undefined as unknown as Promise<Res>, // assigned below
      cancel: () => { abort.abort(); },
    };

    const setStatus = (s: GoalStatus) => { state.status = s; handle.status = s; this._emitMeta(); };
    setStatus('active');

    handle.result = Promise.resolve()
      .then(() => (entry.executor as GoalExecutor<Goal, Fb, Res>)(goal, ctx))
      .then((res) => { setStatus(abort.signal.aborted ? 'canceled' : 'succeeded'); return res; })
      .catch((err) => {
        setStatus(abort.signal.aborted ? 'canceled' : 'aborted');
        throw err;
      })
      .finally(() => { this._active.delete(id); this._emitMeta(); });

    return handle;
  }

  list(): string[] { return [...this._actions.keys()].sort(); }
  active(): { id: string; name: string; status: GoalStatus }[] {
    return [...this._active.entries()].map(([id, s]) => ({ id, name: s.name, status: s.status }));
  }

  onMeta(fn: () => void): () => void {
    this._metaListeners.add(fn);
    return () => this._metaListeners.delete(fn);
  }

  clear(): void { this._actions.clear(); this._active.clear(); this._emitMeta(); }

  private _emitMeta(): void { for (const fn of this._metaListeners) fn(); }
}

export const actions = new ActionRegistry();
