/**
 * versioning — old .nischay files keep loading (P11). Each upgrade is one small step guarded by a
 * subversion number, like Blender's do_versions. Add a step for a format change, never edit an old one.
 */
export const PROJECT_SUBVERSION = 1;

const COLLECTIONS = ['bodies', 'joints', 'jointProfiles', 'materials', 'assets', 'frames', 'constraints', 'components'];
const IDENTITY = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };

const STEPS: ((p: any) => void)[] = [
  // 0 to 1: files from before Components and joint profiles lack these collections and joint fields.
  (p) => {
    const m = p.model;
    if (!m || m.kind !== 'document') return;
    for (const c of COLLECTIONS) m[c] = m[c] ?? {};
    for (const [id, j] of Object.entries<any>(m.joints)) {
      m.joints[id] = {
        ...j,
        childRest: j.childRest ?? IDENTITY,
        origin: j.origin ?? IDENTITY,
        state: j.state ?? { value: 0 },
        componentId: j.componentId ?? null,
        profileId: j.profileId ?? null,
      };
    }
    for (const [id, b] of Object.entries<any>(m.bodies)) m.bodies[id] = { ...b, componentId: b.componentId ?? null };
  },
];

/** Bring a parsed project up to date. Returns a new object, so the input is left alone. */
export function upgradeProject(project: any) {
  const from = typeof project.subversion === 'number' ? project.subversion : 0;
  const out = { ...project, model: project.model ? { ...project.model, joints: { ...project.model.joints }, bodies: { ...project.model.bodies } } : project.model };
  for (let v = from; v < STEPS.length; v++) STEPS[v](out);
  out.subversion = Math.max(from, PROJECT_SUBVERSION);
  return out;
}
