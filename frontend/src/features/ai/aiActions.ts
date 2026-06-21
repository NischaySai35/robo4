import { commands } from '@/core/commands/index';
import type { Document, RGBA } from '@/core/model/index';
import {
  GeometryType,
  JointType,
  identityOrigin,
  makeBody,
  makeGeometry,
  makeJoint,
  makeMaterial,
} from '@/core/model/index';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const vec3 = (v, fallback) => Array.isArray(v) && v.length >= 3
  ? [num(v[0], fallback[0]), num(v[1], fallback[1]), num(v[2], fallback[2])]
  : fallback;
const colorFromHex = (hex: string): RGBA | null => {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};
const rad = (value, unit) => unit === 'deg' ? num(value) * Math.PI / 180 : num(value);

export function summarizeDocument(doc: Document) {
  return {
    name: doc.name,
    bodies: Object.values(doc.bodies).map((b) => ({
      id: b.id,
      name: b.name,
      geometry: b.visual?.geometry?.type,
    })),
    joints: Object.values(doc.joints).map((j) => ({
      id: j.id,
      name: j.name,
      type: j.type,
      parentBodyId: j.parentBodyId,
      childBodyId: j.childBodyId,
      value: j.state?.value ?? 0,
    })),
  };
}

export function makeSystemPrompt(doc: Document) {
  return [
    'You are the TETROBOT copilot. Return only JSON, no markdown.',
    'Schema: {"reply":"short user-facing summary","actions":[...]}',
    'Supported actions:',
    '{"type":"build_serial_arm","name":"Robot arm","joints":3,"linkLength":1,"linkSize":0.22}',
    '{"type":"add_primitive","shape":"box|cylinder|sphere","name":"Body","position":[0,0,0]}',
    '{"type":"set_joint","jointId":"id","jointName":"Joint 1","value":45,"unit":"deg"}',
    '{"type":"set_all_joints","values":[0,30,-20],"unit":"deg"}',
    '{"type":"update_body","bodyId":"id","bodyName":"link 1","position":[0,0,1],"scale":[1,1,1],"color":"#2277cc","name":"new name"}',
    '{"type":"select_entity","kind":"body|joint","id":"id","name":"entity name"}',
    '{"type":"delete_entity","kind":"body|joint","id":"id","name":"entity name"}',
    '{"type":"home_all"}',
    '{"type":"fit_view"}',
    'Use conservative dimensions in meters. Do not invent unsupported actions.',
    `Current model: ${JSON.stringify(summarizeDocument(doc))}`,
  ].join('\n');
}

function findBody(doc: Document, action: any) {
  if (action.bodyId && doc.bodies[action.bodyId]) return doc.bodies[action.bodyId];
  const name = String(action.bodyName || action.name || '').toLowerCase();
  if (!name) return null;
  return Object.values(doc.bodies).find((b) => b.name.toLowerCase() === name || b.name.toLowerCase().includes(name)) ?? null;
}

function findJoint(doc: Document, action: any) {
  if (action.jointId && doc.joints[action.jointId]) return doc.joints[action.jointId];
  const name = String(action.jointName || action.name || '').toLowerCase();
  if (!name) return null;
  return Object.values(doc.joints).find((j) => j.name.toLowerCase() === name || j.name.toLowerCase().includes(name)) ?? null;
}

function entityByName(doc: Document, kind: any, name: any) {
  const collection = kind === 'joint' ? doc.joints : doc.bodies;
  const needle = String(name || '').toLowerCase();
  if (!needle) return null;
  return Object.values(collection).find((e) => e.name.toLowerCase() === needle || e.name.toLowerCase().includes(needle)) ?? null;
}

export function sanitizePlan(plan: any, doc: Document) {
  const safe = [];
  for (const action of plan?.actions ?? []) {
    if (!action || typeof action !== 'object') continue;

    if (action.type === 'build_serial_arm') {
      safe.push({
        type: 'build_serial_arm',
        name: String(action.name || 'Robot arm').slice(0, 60),
        joints: clamp(Math.round(num(action.joints, 3)), 1, 12),
        linkLength: clamp(num(action.linkLength, 0.8), 0.25, 3),
        linkSize: clamp(num(action.linkSize, 0.22), 0.08, 0.8),
      });
    } else if (action.type === 'add_primitive') {
      const shape = ['box', 'cylinder', 'sphere'].includes(action.shape) ? action.shape : 'box';
      safe.push({
        type: 'add_primitive',
        shape,
        name: String(action.name || `${shape} body`).slice(0, 60),
        position: vec3(action.position, [Object.keys(doc.bodies).length * 1.1, 0.6, 3.5]),
        scale: vec3(action.scale, [1, 1, 1]),
        color: colorFromHex(action.color) ? action.color : null,
      });
    } else if (action.type === 'set_joint') {
      const joint = findJoint(doc, action);
      if (joint) safe.push({ type: 'set_joint', jointId: joint.id, value: rad(action.value, action.unit), unit: 'rad' });
    } else if (action.type === 'set_all_joints') {
      const joints = Object.values(doc.joints);
      const values = Array.isArray(action.values) ? action.values : [];
      if (joints.length && values.length) {
        safe.push({
          type: 'set_all_joints',
          values: joints.slice(0, values.length).map((j, i) => [j.id, rad(values[i], action.unit)]),
        });
      }
    } else if (action.type === 'update_body') {
      const body = findBody(doc, action);
      if (body) {
        safe.push({
          type: 'update_body',
          bodyId: body.id,
          name: typeof action.name === 'string' ? action.name.slice(0, 60) : null,
          position: Array.isArray(action.position) ? vec3(action.position, body.transform.position) : null,
          scale: Array.isArray(action.scale) ? vec3(action.scale, body.transform.scale) : null,
          color: colorFromHex(action.color) ? action.color : null,
        });
      }
    } else if (action.type === 'select_entity' || action.type === 'delete_entity') {
      const kind = action.kind === 'joint' ? 'joint' : 'body';
      const entity = action.id
        ? (kind === 'joint' ? doc.joints[action.id] : doc.bodies[action.id])
        : entityByName(doc, kind, action.name);
      if (entity) safe.push({ type: action.type, kind, id: entity.id });
    } else if (action.type === 'home_all' || action.type === 'fit_view') {
      safe.push({ type: action.type });
    }
  }
  return {
    reply: plan?.reply || (safe.length ? 'I prepared an executable plan.' : 'I could not map that to a supported action yet.'),
    actions: safe,
    source: plan?.source || 'local',
    note: plan?.note,
  };
}

export function localPlan(input: any, doc: Document) {
  const text = input.trim();
  const lower = text.toLowerCase();
  const actions = [];

  if (/\b(fit|frame|zoom)\b.*\b(view|camera|scene)\b/.test(lower)) {
    return { reply: 'I can fit the camera to the model.', actions: [{ type: 'fit_view' }], source: 'local' };
  }

  const jointMatch = lower.match(/(\d+)\s*(?:joint|joints|dof|axis|axes)/);
  const wantsArm = /\b(arm|robot|manipulator|serial chain)\b/.test(lower);
  if ((wantsArm || jointMatch) && /\b(build|create|make|add|generate)\b/.test(lower)) {
    const joints = clamp(parseInt(jointMatch?.[1] ?? '3', 10), 1, 12);
    actions.push({
      type: 'build_serial_arm',
      name: text.match(/named\s+([a-z0-9 _-]+)/i)?.[1]?.trim() || `${joints} joint arm`,
      joints,
      linkLength: lower.includes('small') || lower.includes('simple') ? 0.8 : 1,
      linkSize: 0.22,
    });
    return {
      reply: `I can build a ${joints}-joint serial arm in the model graph.`,
      actions,
      source: 'local',
    };
  }

  const setJointMatch = lower.match(/(?:set|move)\s+(?:joint\s*)?(\d+|[a-z0-9 _-]+?)\s+(?:to|=)\s*(-?\d+(?:\.\d+)?)\s*(deg|degree|degrees|rad|radian|radians)?/);
  if (setJointMatch) {
    const key = setJointMatch[1].trim();
    const value = parseFloat(setJointMatch[2]);
    const unit = (setJointMatch[3] || 'deg').startsWith('rad') ? 'rad' : 'deg';
    const joints = Object.values(doc.joints);
    const joint = /^\d+$/.test(key)
      ? joints[parseInt(key, 10) - 1]
      : entityByName(doc, 'joint', key);
    if (joint) {
      return {
        reply: `I can set ${joint.name} to ${value} ${unit}.`,
        actions: [{ type: 'set_joint', jointId: joint.id, value, unit }],
        source: 'local',
      };
    }
  }

  if (/\b(delete|remove)\b/.test(lower)) {
    const kind = lower.includes('joint') ? 'joint' : 'body';
    const name = text.replace(/delete|remove|body|joint/gi, '').trim();
    const entity = entityByName(doc, kind, name);
    if (entity) {
      return {
        reply: `I can delete ${entity.name}.`,
        actions: [{ type: 'delete_entity', kind, id: entity.id }],
        source: 'local',
      };
    }
  }

  if (/\b(select|focus)\b/.test(lower)) {
    const kind = lower.includes('joint') ? 'joint' : 'body';
    const name = text.replace(/select|focus|body|joint/gi, '').trim();
    const entity = entityByName(doc, kind, name);
    if (entity) {
      return {
        reply: `I can select ${entity.name}.`,
        actions: [{ type: 'select_entity', kind, id: entity.id }],
        source: 'local',
      };
    }
  }

  const colorMatch = lower.match(/(?:color|paint)\s+(.+?)\s+(#[0-9a-f]{6}|red|green|blue|yellow|white|black|gray)/i);
  if (colorMatch) {
    const colors = { red: '#cc3322', green: '#22aa66', blue: '#2277cc', yellow: '#e0a200', white: '#eeeeee', black: '#111111', gray: '#777777' };
    const body = entityByName(doc, 'body', colorMatch[1]);
    const color = colors[colorMatch[2]] || colorMatch[2];
    if (body) {
      return {
        reply: `I can recolor ${body.name}.`,
        actions: [{ type: 'update_body', bodyId: body.id, color }],
        source: 'local',
      };
    }
  }

  const shape = ['box', 'cylinder', 'sphere'].find((s) => lower.includes(s));
  if (shape) {
    actions.push({
      type: 'add_primitive',
      shape,
      name: `${shape[0].toUpperCase()}${shape.slice(1)} ${Object.keys(doc.bodies).length + 1}`,
      position: [Object.keys(doc.bodies).length * 1.1, 0.6, 3.5],
    });
    return sanitizePlan({
      reply: `I can add a ${shape} body to the model.`,
      actions,
      source: 'local',
    }, doc);
  }

  if (/\b(home|reset)\b/.test(lower)) {
    return sanitizePlan({
      reply: 'I can home the current simulator module.',
      actions: [{ type: 'home_all' }],
      source: 'local',
    }, doc);
  }

  return {
    reply: 'I can create primitives and serial arms, set joints, select/delete entities, recolor bodies, fit view, and home the simulator.',
    actions: [],
    source: 'local',
  };
}

function primitiveGeometry(shape) {
  if (shape === 'cylinder') return makeGeometry(GeometryType.CYLINDER, { radius: 0.22, length: 0.8 });
  if (shape === 'sphere') return makeGeometry(GeometryType.SPHERE, { radius: 0.35 });
  return makeGeometry(GeometryType.BOX, { size: [0.7, 0.7, 0.7] });
}

export function buildSerialArmEntities(action) {
  const jointCount = clamp(Number(action.joints) || 3, 1, 12);
  const linkLength = clamp(Number(action.linkLength) || 0.8, 0.25, 3);
  const linkSize = clamp(Number(action.linkSize) || 0.22, 0.08, 0.8);
  const prefix = action.name || `${jointCount} joint arm`;
  const material = makeMaterial({
    name: `${prefix} material`,
    color: [0.1, 0.42, 0.78, 1],
    metalness: 0.35,
    roughness: 0.38,
    density: 1200,
  });

  const bodies = [];
  const joints = [];
  const base = makeBody({
    name: `${prefix} base`,
    visual: { geometry: makeGeometry(GeometryType.CYLINDER, { radius: 0.32, length: 0.22 }), materialId: material.id, origin: identityOrigin() },
    transform: { position: [0, 0, 0.11], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
  });
  bodies.push(base);

  for (let i = 0; i < jointCount; i += 1) {
    bodies.push(makeBody({
      name: `${prefix} link ${i + 1}`,
      visual: {
        geometry: makeGeometry(GeometryType.BOX, { size: [linkSize, linkSize, linkLength] }),
        materialId: material.id,
        origin: identityOrigin(),
      },
      transform: { position: [0, 0, 0.22 + linkLength * (i + 0.5)], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
      inertial: { mass: 0.45, com: [0, 0, 0], inertia: { ixx: 0, ixy: 0, ixz: 0, iyy: 0, iyz: 0, izz: 0 }, auto: true },
    }));
  }

  for (let i = 0; i < jointCount; i += 1) {
    joints.push(makeJoint({
      name: `${prefix} joint ${i + 1}`,
      type: JointType.REVOLUTE,
      parentBodyId: bodies[i].id,
      childBodyId: bodies[i + 1].id,
      axis: i % 2 === 0 ? [0, 0, 1] : [0, 1, 0],
      origin: { position: [0, 0, i === 0 ? 0.22 : linkLength], quaternion: [0, 0, 0, 1] },
      limit: { lower: -Math.PI * 0.75, upper: Math.PI * 0.75, effort: 8, velocity: 2 },
      dynamics: { damping: 0.08, friction: 0.02 },
    }));
  }

  return [material, ...bodies, ...joints];
}

export function executeAiPlan(plan: any, { doc, dispatch, select, bridge }: { doc: Document; dispatch: any; select: any; bridge: any }) {
  const results = [];
  const executable = sanitizePlan(plan, doc);
  for (const action of executable.actions ?? []) {
    if (action.type === 'build_serial_arm') {
      const entities = buildSerialArmEntities(action);
      dispatch(commands.addEntities(entities, `AI build ${action.name || 'serial arm'}`));
      const lastBody = [...entities].reverse().find((e) => e.kind === 'body');
      if (lastBody) select(lastBody.id, 'body');
      results.push(`built ${action.joints || 3}-joint arm`);
    } else if (action.type === 'add_primitive') {
      const material = action.color ? makeMaterial({
        name: `${action.name || action.shape} material`,
        color: colorFromHex(action.color),
      }) : null;
      const body = makeBody({
        name: action.name || `${action.shape || 'Box'} body`,
        visual: { geometry: primitiveGeometry(action.shape), materialId: material?.id ?? null, origin: identityOrigin() },
        transform: { position: action.position ?? [Object.keys(doc.bodies).length * 1.1, 0.6, 3.5], quaternion: [0, 0, 0, 1], scale: action.scale ?? [1, 1, 1] },
      });
      dispatch(material ? commands.addEntities([material, body], `AI add ${body.name}`) : commands.addBody(body));
      select(body.id, 'body');
      results.push(`added ${action.shape || 'body'}`);
    } else if (action.type === 'set_joint') {
      dispatch(commands.setJointValue(action.jointId, Number(action.value) || 0));
      select(action.jointId, 'joint');
      results.push('moved joint');
    } else if (action.type === 'set_all_joints') {
      dispatch(commands.setJointValues(Object.fromEntries(action.values)));
      results.push(`moved ${action.values.length} joints`);
    } else if (action.type === 'update_body') {
      const body = doc.bodies[action.bodyId];
      if (!body) continue;
      const patch: any = {};
      if (action.name) patch.name = action.name;
      if (action.position || action.scale) {
        patch.transform = {
          ...body.transform,
          ...(action.position ? { position: action.position } : {}),
          ...(action.scale ? { scale: action.scale } : {}),
        };
      }
      if (Object.keys(patch).length) dispatch(commands.updateBody(body.id, patch));
      if (action.color) {
        dispatch(commands.setBodyMaterial(body.id, makeMaterial({
          name: `${body.name} material`,
          color: colorFromHex(action.color),
        })));
      }
      select(body.id, 'body');
      results.push(`updated ${body.name}`);
    } else if (action.type === 'select_entity') {
      select(action.id, action.kind);
      results.push('selected entity');
    } else if (action.type === 'delete_entity') {
      if (action.kind === 'joint') dispatch(commands.removeJoint(action.id));
      else dispatch(commands.removeBody(action.id));
      results.push('deleted entity');
    } else if (action.type === 'home_all') {
      bridge.homeAll?.();
      results.push('homed simulator');
    } else if (action.type === 'fit_view') {
      bridge.fitCamera?.();
      results.push('fit view');
    }
  }
  return results;
}

export function normalizePlan(value: any, fallbackInput: any, doc: Document) {
  if (!value) return localPlan(fallbackInput, doc);
  if (typeof value === 'string') {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return sanitizePlan({ ...JSON.parse(value.slice(start, end + 1)), source: 'anthropic' }, doc);
      } catch {
        return localPlan(fallbackInput, doc);
      }
    }
  }
  return sanitizePlan({
    reply: value.reply || 'I prepared an action plan.',
    actions: Array.isArray(value.actions) ? value.actions : [],
    source: value.source || 'anthropic',
  }, doc);
}