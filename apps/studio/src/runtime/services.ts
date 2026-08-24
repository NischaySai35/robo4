/**
 * services.ts — request/response services (ROS 2 services, native).
 *
 * A service is a named async function: one provider, many callers. Used for
 * one-shot queries/commands that want a reply ("compute IK", "save map", "home all").
 * Distinct from topics (streaming, fire-and-forget) and actions (long-running with
 * feedback/cancel). No React/Three.
 */

export type ServiceHandler<Req = unknown, Res = unknown> = (req: Req) => Promise<Res> | Res;

interface ServiceEntry {
  name: string;
  handler: ServiceHandler;
}

export class ServiceRegistry {
  private _services = new Map<string, ServiceEntry>();
  private _metaListeners = new Set<() => void>();

  advertise<Req, Res>(name: string, handler: ServiceHandler<Req, Res>): () => void {
    this._services.set(name, { name, handler: handler as ServiceHandler });
    this._emitMeta();
    return () => { this._services.delete(name); this._emitMeta(); };
  }

  has(name: string): boolean { return this._services.has(name); }

  async call<Req, Res>(name: string, req: Req, opts: { timeoutMs?: number } = {}): Promise<Res> {
    const entry = this._services.get(name);
    if (!entry) throw new Error(`service not available: ${name}`);
    const run = Promise.resolve(entry.handler(req));
    if (!opts.timeoutMs) return run as Promise<Res>;
    return Promise.race([
      run as Promise<Res>,
      new Promise<Res>((_, rej) =>
        setTimeout(() => rej(new Error(`service ${name} timed out after ${opts.timeoutMs}ms`)), opts.timeoutMs)),
    ]);
  }

  list(): string[] { return [...this._services.keys()].sort(); }

  onMeta(fn: () => void): () => void {
    this._metaListeners.add(fn);
    return () => this._metaListeners.delete(fn);
  }

  clear(): void { this._services.clear(); this._emitMeta(); }

  private _emitMeta(): void { for (const fn of this._metaListeners) fn(); }
}

export const services = new ServiceRegistry();
