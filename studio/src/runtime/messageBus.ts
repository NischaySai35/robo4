/**
 * messageBus.ts — the native pub/sub core (our ROS 2 "DDS", in-process).
 *
 * Topics are named channels carrying typed messages. Publishers `advertise` and
 * `publish`; subscribers `subscribe`. Features that used to wire to each other
 * directly (telemetry → chart, FK → renderer) become publishers/subscribers, so
 * tooling (the Topics inspector, the recorder, plots) can observe EVERYTHING
 * uniformly without bespoke taps.
 *
 * Capabilities that make it industrial, not a toy event-emitter:
 *  - latching: a topic can replay its last message to new subscribers (like ROS
 *    transient-local / "latched" topics) so a panel mounting late still gets state.
 *  - stats: per-topic message count, rate (EMA Hz) and rough bandwidth, for the
 *    inspector and diagnostics.
 *  - timestamps from the runtime clock, so the recorder lays messages on one timeline.
 *  - a wildcard tap (`subscribeAll`) used by the recorder and node-graph view.
 *
 * No React/Three. Pure and node-testable.
 */
import { clock } from './clock';

export interface Envelope<T = unknown> {
  topic: string;
  /** runtime-clock timestamp (ms) at publish time */
  t: number;
  /** publisher node id, if known */
  node?: string;
  msg: T;
}

export type Handler<T = unknown> = (msg: T, env: Envelope<T>) => void;
export type TapHandler = (env: Envelope) => void;

export interface TopicStats {
  name: string;
  type: string;
  count: number;
  /** messages per second over the last 2 s of real time */
  hz: number;
  /** bytes per second over the same window (JSON size) */
  bps: number;
  lastT: number;
  latched: boolean;
  publishers: number;
  subscribers: number;
}

interface Topic {
  name: string;
  type: string;
  latched: boolean;
  last?: Envelope;
  handlers: Set<Handler>;
  publishers: Set<string>;
  count: number;
  hz: number;
  bps: number;
  lastT: number;
  /** recent messages as [performance.now, bytes], for the rate */
  window?: [number, number][];
}

const WINDOW_MS = 2000; // rate and bandwidth are measured over this much recent real time

export class MessageBus {
  private _topics = new Map<string, Topic>();
  private _taps = new Set<TapHandler>();
  private _metaListeners = new Set<() => void>();

  /** Declare a topic (idempotent). `latched` replays the last msg to new subs. */
  advertise(name: string, opts: { type?: string; latched?: boolean; node?: string } = {}): string {
    const t = this._ensure(name, opts.type);
    if (opts.latched) t.latched = true;
    if (opts.node) t.publishers.add(opts.node);
    this._emitMeta();
    return name;
  }

  publish<T>(name: string, msg: T, node?: string): void {
    const t = this._ensure(name);
    const now = clock.now();
    const env: Envelope<T> = { topic: name, t: now, node, msg };

    // rate and bandwidth over the last WINDOW_MS of real time, like `ros2 topic hz`: the runtime clock may follow a
    // paused or scrubbed simulation, and a short average swings wildly after a stall or a burst
    const wall = performance.now();
    let bytes = 0;
    try { bytes = JSON.stringify(msg).length; } catch { bytes = 0; }
    const w = (t.window ??= []);
    w.push([wall, bytes]);
    while (w.length > 1 && wall - w[0][0] > WINDOW_MS) w.shift();
    const span = (wall - w[0][0]) / 1000;
    t.hz = span > 0 ? (w.length - 1) / span : 0;
    t.bps = span > 0 ? w.slice(1).reduce((a, x) => a + x[1], 0) / span : 0;
    t.lastT = now;
    t.count++;
    if (node) t.publishers.add(node);
    if (t.latched) t.last = env as Envelope;

    for (const h of t.handlers) h(msg, env as Envelope);
    for (const tap of this._taps) tap(env as Envelope);
  }

  /** Subscribe to a topic. Latched topics immediately replay their last message. */
  subscribe<T>(name: string, handler: Handler<T>, opts: { replayLatched?: boolean } = {}): () => void {
    const t = this._ensure(name);
    t.handlers.add(handler as Handler);
    this._emitMeta();
    if ((opts.replayLatched ?? true) && t.latched && t.last) {
      handler(t.last.msg as T, t.last as Envelope<T>);
    }
    return () => { t.handlers.delete(handler as Handler); this._emitMeta(); };
  }

  /** Tap every message on every topic (recorder, node-graph). */
  subscribeAll(tap: TapHandler): () => void {
    this._taps.add(tap);
    return () => { this._taps.delete(tap); };
  }

  /** Latest latched value of a topic, if any. */
  latest<T>(name: string): T | undefined {
    return this._topics.get(name)?.last?.msg as T | undefined;
  }

  topics(): TopicStats[] {
    const wall = performance.now();
    // a topic that has gone quiet reads 0, not the last rate it had
    const live = (t: Topic) => !!t.window?.length && wall - t.window[t.window.length - 1][0] <= WINDOW_MS;
    return [...this._topics.values()].map((t) => ({
      name: t.name,
      type: t.type,
      count: t.count,
      hz: live(t) ? t.hz : 0,
      bps: live(t) ? t.bps : 0,
      lastT: t.lastT,
      latched: t.latched,
      publishers: t.publishers.size,
      subscribers: t.handlers.size,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  hasTopic(name: string): boolean { return this._topics.has(name); }

  /** Publisher-node → topic topology (for an rqt_graph-style view). */
  nodeGraph(): { node: string; publishes: string[] }[] {
    const byNode = new Map<string, Set<string>>();
    for (const t of this._topics.values()) {
      for (const pub of t.publishers) {
        if (!byNode.has(pub)) byNode.set(pub, new Set());
        byNode.get(pub)!.add(t.name);
      }
    }
    return [...byNode.entries()]
      .map(([node, topics]) => ({ node, publishes: [...topics].sort() }))
      .sort((a, b) => a.node.localeCompare(b.node));
  }

  /** Listen for topic-set / subscriber-count changes (for the inspector UI). */
  onMeta(fn: () => void): () => void {
    this._metaListeners.add(fn);
    return () => this._metaListeners.delete(fn);
  }

  /** Forget everything (new project / test reset). */
  clear(): void {
    this._topics.clear();
    this._emitMeta();
  }

  private _ensure(name: string, type?: string): Topic {
    let t = this._topics.get(name);
    if (!t) {
      t = {
        name, type: type ?? 'json', latched: false,
        handlers: new Set(), publishers: new Set(),
        count: 0, hz: 0, bps: 0, lastT: 0,
      };
      this._topics.set(name, t);
    } else if (type && t.type === 'json') {
      t.type = type;
    }
    return t;
  }

  private _emitMeta(): void { for (const fn of this._metaListeners) fn(); }
}

/** The process-wide message bus. */
export const bus = new MessageBus();

/** Well-known topic names so producers/consumers agree without magic strings. */
export const Topics = {
  clock: '/clock',
  jointStates: '/joint_states',
  tf: '/tf',
  diagnostics: '/diagnostics',
  hardwareTelemetry: '/hardware/telemetry',
  jointLoads: '/analysis/joint_loads',
} as const;
