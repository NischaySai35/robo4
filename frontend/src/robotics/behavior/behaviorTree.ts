/**
 * behaviorTree — a native Behaviour Tree engine for task orchestration (no ROS).
 *
 * Nodes return 'success' | 'failure' | 'running' each tick and share a blackboard.
 * Composites: Sequence (AND, memory), Fallback (OR), Parallel. Decorators: Inverter,
 * Repeat, Succeeder. Leaves: Condition, Action. Tick the root on a timer to run a
 * mission (e.g. patrol: pick a goal → plan → navigate → scan → repeat).
 */
export type Status = 'success' | 'failure' | 'running';
export type Blackboard = Record<string, any>;
export interface BTNode { name: string; tick: (bb: Blackboard) => Status; reset?: () => void; }

export function Action(name: string, fn: (bb: Blackboard) => Status): BTNode {
  return { name, tick: fn };
}
export function Condition(name: string, fn: (bb: Blackboard) => boolean): BTNode {
  return { name, tick: (bb) => (fn(bb) ? 'success' : 'failure') };
}

export function Sequence(name: string, children: BTNode[]): BTNode {
  let i = 0;
  return {
    name,
    reset: () => { i = 0; children.forEach((c) => c.reset?.()); },
    tick: (bb) => {
      while (i < children.length) {
        const s = children[i].tick(bb);
        if (s === 'running') return 'running';
        if (s === 'failure') { i = 0; return 'failure'; }
        i++;
      }
      i = 0;
      return 'success';
    },
  };
}

export function Fallback(name: string, children: BTNode[]): BTNode {
  let i = 0;
  return {
    name,
    reset: () => { i = 0; children.forEach((c) => c.reset?.()); },
    tick: (bb) => {
      while (i < children.length) {
        const s = children[i].tick(bb);
        if (s === 'running') return 'running';
        if (s === 'success') { i = 0; return 'success'; }
        i++;
      }
      i = 0;
      return 'failure';
    },
  };
}

export function Parallel(name: string, children: BTNode[], succeedOn = children.length): BTNode {
  return {
    name,
    reset: () => children.forEach((c) => c.reset?.()),
    tick: (bb) => {
      let ok = 0, fail = 0;
      for (const c of children) { const s = c.tick(bb); if (s === 'success') ok++; else if (s === 'failure') fail++; }
      if (ok >= succeedOn) return 'success';
      if (fail > children.length - succeedOn) return 'failure';
      return 'running';
    },
  };
}

export function Inverter(child: BTNode): BTNode {
  return { name: `!${child.name}`, reset: child.reset, tick: (bb) => { const s = child.tick(bb); return s === 'success' ? 'failure' : s === 'failure' ? 'success' : 'running'; } };
}
export function Succeeder(child: BTNode): BTNode {
  return { name: `?${child.name}`, reset: child.reset, tick: (bb) => { const s = child.tick(bb); return s === 'running' ? 'running' : 'success'; } };
}
export function Repeat(child: BTNode): BTNode {
  return { name: `loop(${child.name})`, reset: child.reset, tick: (bb) => { const s = child.tick(bb); return s === 'running' ? 'running' : (child.reset?.(), 'running'); } };
}

/** Drives a tree on a fixed interval; returns a stop() fn. */
export function runTree(root: BTNode, bb: Blackboard, hz = 4, onTick?: (s: Status, active: string) => void) {
  const id = setInterval(() => {
    bb._active = root.name;
    const s = root.tick(bb);
    onTick?.(s, bb._active);
    if (s !== 'running') { /* root finished; Repeat keeps it running */ }
  }, 1000 / hz);
  return () => clearInterval(id);
}
