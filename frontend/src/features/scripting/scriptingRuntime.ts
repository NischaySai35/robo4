import { commands } from '@/core/commands/index';
import {
  GeometryType,
  identityOrigin,
  makeBody,
  makeGeometry,
  makeMaterial,
} from '@/core/model/index';
import { buildSerialArmEntities } from '@/features/ai/aiActions';
import type { Document, RGBA } from '@/core/model/index';

const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const vec3 = (v, fallback) => Array.isArray(v) && v.length >= 3
  ? [num(v[0], fallback[0]), num(v[1], fallback[1]), num(v[2], fallback[2])]
  : fallback;
const hexToColor = (hex: string): RGBA => {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return [0.1, 0.42, 0.78, 1];
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};

function findEntity(doc: Document, kind: any, key: any) {
  const collection = kind === 'joint' ? doc.joints : doc.bodies;
  if (collection[key]) return collection[key];
  const needle = String(key || '').toLowerCase();
  return Object.values(collection).find((e) => e.name.toLowerCase() === needle || e.name.toLowerCase().includes(needle)) ?? null;
}

function primitive(type: any, opts: any = {}, doc: Document) {
  const shape = type === GeometryType.CYLINDER || type === GeometryType.SPHERE ? type : GeometryType.BOX;
  const geometry = shape === GeometryType.BOX
    ? makeGeometry(shape, { size: vec3(opts.size, [0.7, 0.7, 0.7]) })
    : shape === GeometryType.CYLINDER
      ? makeGeometry(shape, { radius: num(opts.radius, 0.22), length: num(opts.length, 0.8) })
      : makeGeometry(shape, { radius: num(opts.radius, 0.35) });
  const material = opts.color ? makeMaterial({ name: `${opts.name || shape} material`, color: hexToColor(opts.color) }) : null;
  const body = makeBody({
    name: opts.name || `${shape} ${Object.keys(doc.bodies).length + 1}`,
    visual: { geometry, materialId: material?.id ?? null, origin: identityOrigin() },
    transform: {
      position: vec3(opts.position, [Object.keys(doc.bodies).length * 1.1, 0.6, 3.5]),
      quaternion: [0, 0, 0, 1],
      scale: vec3(opts.scale, [1, 1, 1]),
    },
  });
  return material ? [material, body] : [body];
}

export const defaultScript = `api.buildArm(3, { name: 'script arm' });
api.addBox({ name: 'payload', position: [1.2, 0.6, 3.5], size: [0.4, 0.4, 0.4], color: '#2277cc' });
api.fitView();`;

export async function runScript(code: string, context: { doc: Document; dispatch: any; select: any; bridge: any }) {
  const { doc, dispatch, select, bridge } = context;
  let liveDoc: Document = doc;
  const output: any[] = [];
  const remember = (entities) => {
    for (const entity of entities) {
      const collection = {
        body: 'bodies',
        joint: 'joints',
        material: 'materials',
        asset: 'assets',
        frame: 'frames',
        constraint: 'constraints',
      }[entity.kind];
      if (collection) liveDoc = { ...liveDoc, [collection]: { ...liveDoc[collection], [entity.id]: entity } };
    }
  };
  const api = Object.freeze({
    log: (...args) => output.push(args.map(String).join(' ')),
    deg: (degrees) => num(degrees) * Math.PI / 180,
    doc: () => structuredClone(liveDoc),
    bodies: () => Object.values(liveDoc.bodies).map((b) => ({ id: b.id, name: b.name })),
    joints: () => Object.values(liveDoc.joints).map((j) => ({ id: j.id, name: j.name, value: j.state?.value ?? 0 })),
    addBox: (opts: any = {}) => {
      const entities = primitive(GeometryType.BOX, opts, liveDoc);
      dispatch(commands.addEntities(entities, `Script add ${opts.name || 'box'}`));
      remember(entities);
      const body = entities.find((e) => e.kind === 'body');
      if (body) select(body.id, 'body');
      return body?.id;
    },
    addCylinder: (opts: any = {}) => {
      const entities = primitive(GeometryType.CYLINDER, opts, liveDoc);
      dispatch(commands.addEntities(entities, `Script add ${opts.name || 'cylinder'}`));
      remember(entities);
      const body = entities.find((e) => e.kind === 'body');
      if (body) select(body.id, 'body');
      return body?.id;
    },
    addSphere: (opts: any = {}) => {
      const entities = primitive(GeometryType.SPHERE, opts, liveDoc);
      dispatch(commands.addEntities(entities, `Script add ${opts.name || 'sphere'}`));
      remember(entities);
      const body = entities.find((e) => e.kind === 'body');
      if (body) select(body.id, 'body');
      return body?.id;
    },
    buildArm: (joints = 3, opts: any = {}) => {
      const entities = buildSerialArmEntities({ joints, name: opts.name, linkLength: opts.linkLength, linkSize: opts.linkSize });
      dispatch(commands.addEntities(entities, `Script build ${opts.name || 'serial arm'}`));
      remember(entities);
      const lastBody = [...entities].reverse().find((e) => e.kind === 'body');
      if (lastBody) select(lastBody.id, 'body');
      return entities.filter((e) => e.kind === 'joint').map((j) => j.id);
    },
    setJoint: (key, valueRad) => {
      const joint = typeof key === 'number'
        ? Object.values(liveDoc.joints)[key - 1]
        : findEntity(liveDoc, 'joint', key);
      if (!joint) throw new Error(`Joint not found: ${key}`);
      const next = { ...joint, state: { ...joint.state, value: num(valueRad) } };
      dispatch(commands.setJointValue(joint.id, next.state.value));
      remember([next]);
      select(joint.id, 'joint');
      return joint.id;
    },
    moveBody: (key, position) => {
      const body = findEntity(liveDoc, 'body', key);
      if (!body) throw new Error(`Body not found: ${key}`);
      const next = { ...body, transform: { ...body.transform, position: vec3(position, body.transform.position) } };
      dispatch(commands.updateBody(body.id, { transform: next.transform }));
      remember([next]);
      select(body.id, 'body');
      return body.id;
    },
    colorBody: (key, color) => {
      const body = findEntity(liveDoc, 'body', key);
      if (!body) throw new Error(`Body not found: ${key}`);
      const material = makeMaterial({ name: `${body.name} material`, color: hexToColor(color) });
      const next = { ...body, visual: { ...body.visual, materialId: material.id } };
      dispatch(commands.setBodyMaterial(body.id, material));
      remember([material, next]);
      select(body.id, 'body');
      return body.id;
    },
    select: (kind, key) => {
      const entity = findEntity(liveDoc, kind, key);
      if (!entity) throw new Error(`${kind} not found: ${key}`);
      select(entity.id, kind === 'joint' ? 'joint' : 'body');
      return entity.id;
    },
    remove: (kind, key) => {
      const entity = findEntity(liveDoc, kind, key);
      if (!entity) throw new Error(`${kind} not found: ${key}`);
      dispatch(kind === 'joint' ? commands.removeJoint(entity.id) : commands.removeBody(entity.id));
      const collection = kind === 'joint' ? 'joints' : 'bodies';
      const nextCollection = { ...liveDoc[collection] };
      delete nextCollection[entity.id];
      liveDoc = { ...liveDoc, [collection]: nextCollection };
      return entity.id;
    },
    home: () => bridge.homeAll?.(),
    fitView: () => bridge.fitCamera?.(),
  });

  const runner = new Function(
    'api',
    'window',
    'document',
    'globalThis',
    'localStorage',
    'sessionStorage',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'eval',
    'Function',
    `"use strict";\n${code}`,
  );
  await runner(api, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
  return output;
}