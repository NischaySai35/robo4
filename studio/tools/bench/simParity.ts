/**
 * Ask two physics services the same questions and compare the answers, to prove a moved or changed sim behaves the same.
 * Run from studio/: npx tsx tools/bench/simParity.ts http://127.0.0.1:8771 http://127.0.0.1:18771
 */
import { toSimScene } from '@/robotics/msrr2/simScene';
import { LIBRARY } from '@/robotics/msrr2/library';

// Same conversion as the Shapes tab's Use as robot.
const toConfig = (e: any) => ({ modules: Array.from({ length: e.nModules }, (_, i) => 'M' + (i + 1)), edges: e.topology, pose: e.pose, baseFrame: e.baseFrame, unused: [] as string[] }) as any;
const [a, b] = process.argv.slice(2);
const ask = async (base: string, path: string, body?: unknown) => {
  const t = performance.now();
  const r = await fetch(base + path, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
  return { status: r.status, json: await r.json().catch(() => null), s: (performance.now() - t) / 1000 };
};
// Same physics gives numbers equal to about 1e-6; a timing field is the only thing allowed to differ.
const diff = (x: any, y: any, at = ''): string[] => {
  if (/time|elapsed|took|seconds|_s$|version|pid/i.test(at)) return [];
  if (typeof x === 'number' && typeof y === 'number') return Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(x)) ? [] : [`${at}: ${x} vs ${y}`];
  if (x && y && typeof x === 'object' && typeof y === 'object') {
    return [...new Set([...Object.keys(x), ...Object.keys(y)])].flatMap((k) => diff(x[k], y[k], `${at}/${k}`));
  }
  return x === y ? [] : [`${at}: ${JSON.stringify(x)?.slice(0, 60)} vs ${JSON.stringify(y)?.slice(0, 60)}`];
};

let bad = 0;
const compare = async (label: string, path: string, body?: unknown) => {
  const [x, y] = await Promise.all([ask(a, path, body), ask(b, path, body)]);
  const d = diff(x.json, y.json);
  bad += d.length + (x.status !== y.status ? 1 : 0);
  console.log(`${d.length || x.status !== y.status ? 'DIFF' : 'same'}  ${label.padEnd(30)} ${x.status}/${y.status}  ${x.s.toFixed(1)}s/${y.s.toFixed(1)}s  ${d.slice(0, 3).join(' | ')}`);
};

await compare('health', '/health');
for (const s of LIBRARY.slice(0, 4)) {
  await compare(`check_static ${s.name}`, '/check_static', { scene: toSimScene(toConfig(s as any)) });
  await compare(`measure_tags ${s.name}`, '/measure_tags', { scene: toSimScene(toConfig(s as any)) });
}
console.log(bad ? `FAILED: ${bad} differences` : 'all answers identical');
process.exit(bad ? 1 : 0);
