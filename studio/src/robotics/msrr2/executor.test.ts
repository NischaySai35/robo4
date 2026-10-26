import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileStep, executeDryRun } from './executor';
import { type Config, STRAIGHT, cloneConfig } from './model';
import type { Plan, PlanStep } from './planner';

const lying: Config = { modules: ['M1'], unused: [], edges: [], pose: { M1: { ...STRAIGHT } } };
const bent = cloneConfig(lying); bent.pose.M1.B2 = 150;
const docked = cloneConfig(bent); docked.edges = [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }];
const m = { maxTorquePct: 0, cogMarginMm: 999, minJointMarginDeg: 90 };
const step = (verb: PlanStep['verb'], expected: Config, successP = 0.9): PlanStep => ({ verb, label: verb, expected, successP, durationS: 1, margins: m, risky: false });
const plan = (steps: PlanStep[]): Plan => ({ ok: true, steps, totalP: 0.9, totalS: 2, cost: 0, target: {} as never, why: [], expansions: 0 });

test('a pose move compiles to one /api/batch per module with NOMINAL angles of the joints that change', () => {
  const calls = compileStep(lying, step('pose_move', bent), { M1: 'http://m1' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://m1/api/batch?4=150.0&speed=5&acc=20');
});

test('a dock compiles to closing the lock rotor of the END that docks', () => {
  const calls = compileStep(bent, step('walk_step', docked), { M1: 'http://m1' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^http:\/\/m1\/api\/batch\?1=/);
  assert.match(calls[0].why, /close lock M1\.A/);
});

test('a dock that did not latch is retried first (the robot is where the plan expected)', async () => {
  let replans = 0;
  const r = await executeDryRun(lying, plan([step('pose_move', bent), step('walk_step', docked)]), {
    induce: [1], replan: async () => { replans++; return plan([]); },
  });
  assert.equal(r.ok, true);
  assert.equal(replans, 0);
  assert.deepEqual(r.events.map((e) => e.outcome), ['ok', 'failed', 'ok']);
  assert.match(r.events[1].note, /retries/);
});

test('when the retry fails too, it replans from the TRUE state', async () => {
  const seen: Config[] = [];
  const r = await executeDryRun(lying, plan([step('pose_move', bent), step('walk_step', docked)]), {
    induce: [1, 2],
    replan: async (from) => { seen.push(from); return plan([step('walk_step', docked)]); },
  });
  assert.equal(r.ok, true);
  assert.equal(r.replans, 1);
  assert.equal(seen[0].edges.length, 0, 'true state after the failed dock has no new lock');
  assert.equal(seen[0].pose.M1.B2, 150, 'and keeps the pose reached before the dock');
  assert.deepEqual(r.events.map((e) => e.outcome), ['ok', 'failed', 'failed', 'ok']);
  assert.equal(r.final.edges.length, 1);
});

test('the executor gives up after maxReplans', async () => {
  const r = await executeDryRun(bent, plan([step('walk_step', docked)]), {
    induce: [0, 1, 2, 3, 4, 5], maxReplans: 2, replan: async () => plan([step('walk_step', docked)]),
  });
  assert.equal(r.ok, false);
  assert.match(r.why!, /gave up after 2/);
});
