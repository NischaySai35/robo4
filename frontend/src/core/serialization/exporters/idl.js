/**
 * idl.js — minimal interface-definition export (Phase 10 groundwork).
 *
 * Describes the robot's movable joints as command/state messages — the contract
 * the app, hardware bridge, ROS, and AI will share in Phase 11. Intentionally
 * simple/readable now; expands into proper ROS .msg / DDS IDL later.
 */
const san = (s) => String(s ?? 'x').replace(/[^A-Za-z0-9_]/g, '_');

export function exportIDL(doc, name = 'tetrobot') {
  const joints = Object.values(doc.joints).filter((j) => j.type !== 'fixed');
  const L = [];
  L.push(`// TETROBOT IDL — command/state interface for "${name}"`);
  L.push('// Groundwork for hardware / ROS comms (Phase 11).');
  L.push('');
  L.push(`message ${san(name)}_JointCommand {`);
  for (const j of joints) {
    const lim = j.limit ?? {};
    L.push(`  float64 ${san(j.name)};  // ${j.type}, limits [${lim.lower ?? '-inf'}, ${lim.upper ?? 'inf'}]`);
  }
  L.push('}');
  L.push('');
  L.push(`message ${san(name)}_JointState {`);
  for (const j of joints) {
    L.push(`  float64 ${san(j.name)}_position;`);
    L.push(`  float64 ${san(j.name)}_current;`);
  }
  L.push('}');
  L.push('');
  return L.join('\n');
}
