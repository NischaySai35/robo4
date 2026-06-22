/**
 * recorder.ts — session record & playback (rosbag, native: ".nischaybag").
 *
 * The Recorder taps the bus (subscribeAll) and stores every message with its
 * runtime-clock timestamp, optionally filtered to a topic allow-list. A bag is a
 * compact, time-ordered list of envelopes + metadata.
 *
 * The Player streams a bag back THROUGH the bus on a virtual timeline: it switches
 * the runtime clock to 'sim', advances sim-time each frame (respecting rate/pause),
 * and republishes messages whose timestamp has elapsed — so every panel, plot and
 * the 3D scene react exactly as they did live. Scrub jumps sim-time and re-emits the
 * latest message per topic up to that instant. No React/Three.
 */
import { bus, type Envelope } from './messageBus';
import { clock } from './clock';

export interface Bag {
  version: 1;
  createdAt: number;          // wall-clock ms
  /** recording start in runtime-clock ms (envelopes are relative-comparable) */
  t0: number;
  t1: number;
  topics: string[];
  messages: Envelope[];       // ascending by t
}

export class Recorder {
  private _recording = false;
  private _unsub: (() => void) | null = null;
  private _buf: Envelope[] = [];
  private _allow: Set<string> | null = null;
  private _t0 = 0;
  private _listeners = new Set<() => void>();

  get recording(): boolean { return this._recording; }
  get count(): number { return this._buf.length; }
  get since(): number { return this._t0; }

  /** Start recording. `topics` empty/undefined records all. */
  start(topics?: string[]): void {
    if (this._recording) return;
    this._buf = [];
    this._allow = topics && topics.length ? new Set(topics) : null;
    this._t0 = clock.now();
    this._recording = true;
    this._unsub = bus.subscribeAll((env) => {
      if (this._allow && !this._allow.has(env.topic)) return;
      // shallow-clone the message so later mutations don't corrupt the bag
      this._buf.push({ ...env, msg: structuredClone(env.msg) });
    });
    this._emit();
  }

  stop(): Bag {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    this._recording = false;
    const bag = this.toBag();
    this._emit();
    return bag;
  }

  toBag(): Bag {
    const msgs = this._buf;
    const topics = [...new Set(msgs.map((m) => m.topic))].sort();
    return {
      version: 1,
      createdAt: Date.now(),
      t0: this._t0,
      t1: msgs.length ? msgs[msgs.length - 1].t : this._t0,
      topics,
      messages: msgs,
    };
  }

  subscribe(fn: () => void): () => void { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  private _emit(): void { for (const fn of this._listeners) fn(); }
}

export class Player {
  private _bag: Bag | null = null;
  private _idx = 0;            // next message to emit
  private _playing = false;
  private _raf: number | null = null;
  private _lastWall = 0;
  private _listeners = new Set<() => void>();

  get bag(): Bag | null { return this._bag; }
  get playing(): boolean { return this._playing; }
  /** Current playback position in [0,1] over the bag duration. */
  get progress(): number {
    if (!this._bag) return 0;
    const span = this._bag.t1 - this._bag.t0 || 1;
    return Math.min(1, Math.max(0, (clock.now() - this._bag.t0) / span));
  }
  get duration(): number { return this._bag ? this._bag.t1 - this._bag.t0 : 0; }

  load(bag: Bag): void {
    this._bag = bag;
    clock.useSource('sim', bag.t0);
    clock.setPaused(true);
    this._idx = 0;
    this._emit();
  }

  /** Detach: hand the clock back to wall time. */
  unload(): void {
    this.pause();
    this._bag = null;
    clock.useSource('wall');
    clock.setPaused(false);
    this._emit();
  }

  setRate(r: number): void { clock.setRate(r); this._emit(); }

  play(): void {
    if (!this._bag || this._playing) return;
    if (this.progress >= 1) this.seek(0);
    this._playing = true;
    clock.setPaused(false);
    this._lastWall = Date.now();
    const tick = () => {
      if (!this._playing) return;
      const now = Date.now();
      const dt = now - this._lastWall;
      this._lastWall = now;
      clock.advance(dt);
      this._emitUntil(clock.now());
      if (this.progress >= 1) { this.pause(); }
      else this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
    this._emit();
  }

  pause(): void {
    this._playing = false;
    clock.setPaused(true);
    if (this._raf != null) { cancelAnimationFrame(this._raf); this._raf = null; }
    this._emit();
  }

  /** Jump to a fraction [0,1]; re-emits the latest msg per topic up to that time. */
  seek(frac: number): void {
    if (!this._bag) return;
    const target = this._bag.t0 + (this._bag.t1 - this._bag.t0) * Math.min(1, Math.max(0, frac));
    clock.setSimTime(target);
    // republish the most-recent message per topic at or before target (state snapshot)
    const latestPerTopic = new Map<string, Envelope>();
    let i = 0;
    for (; i < this._bag.messages.length; i++) {
      const m = this._bag.messages[i];
      if (m.t > target) break;
      latestPerTopic.set(m.topic, m);
    }
    this._idx = i;
    for (const env of latestPerTopic.values()) bus.publish(env.topic, env.msg, env.node);
    this._emit();
  }

  /** Emit all messages with t <= upTo that we haven't emitted yet. */
  private _emitUntil(upTo: number): void {
    if (!this._bag) return;
    while (this._idx < this._bag.messages.length && this._bag.messages[this._idx].t <= upTo) {
      const env = this._bag.messages[this._idx++];
      bus.publish(env.topic, env.msg, env.node);
    }
  }

  subscribe(fn: () => void): () => void { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  private _emit(): void { for (const fn of this._listeners) fn(); }
}

export const recorder = new Recorder();
export const player = new Player();
