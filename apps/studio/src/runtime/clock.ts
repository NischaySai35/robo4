/**
 * clock.ts — the runtime clock. Everything time-stamped in the runtime reads `now()`
 * from here so that record/playback can drive the WHOLE app off a virtual timeline.
 *
 * Two sources:
 *  - 'wall'  : real wall-clock (live operation).
 *  - 'sim'   : a virtual time we advance manually (playback, stepped physics) — lets
 *              the player scrub/loop/speed a recorded session and have every panel
 *              react exactly as if it were live.
 *
 * No React/Three. Pure and node-testable.
 */

export type ClockSource = 'wall' | 'sim';

export class Clock {
  private _source: ClockSource = 'wall';
  private _simNow = 0;          // ms, virtual time when source==='sim'
  private _paused = false;
  private _rate = 1;            // playback speed multiplier (sim source)
  private _listeners = new Set<(t: number) => void>();

  /** Current runtime time in milliseconds. */
  now(): number {
    return this._source === 'sim' ? this._simNow : Date.now();
  }

  get source(): ClockSource { return this._source; }
  get paused(): boolean { return this._paused; }
  get rate(): number { return this._rate; }

  /** Switch time source. Switching to 'sim' seeds sim time from the given value. */
  useSource(source: ClockSource, seedMs?: number): void {
    this._source = source;
    if (source === 'sim' && seedMs != null) this._simNow = seedMs;
    this._emit();
  }

  setRate(rate: number): void { this._rate = Math.max(0, rate); }
  setPaused(p: boolean): void { this._paused = p; }

  /** Set virtual time absolutely (player scrub). Only meaningful for 'sim'. */
  setSimTime(ms: number): void {
    this._simNow = ms;
    this._emit();
  }

  /**
   * Advance virtual time by `dtRealMs` of real elapsed time, scaled by rate. Returns
   * the new sim time. No-op while paused. The player calls this each animation frame.
   */
  advance(dtRealMs: number): number {
    if (this._source !== 'sim' || this._paused) return this._simNow;
    this._simNow += dtRealMs * this._rate;
    this._emit();
    return this._simNow;
  }

  subscribe(fn: (t: number) => void): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private _emit(): void {
    for (const fn of this._listeners) fn(this.now());
  }
}

/** The process-wide runtime clock. */
export const clock = new Clock();
