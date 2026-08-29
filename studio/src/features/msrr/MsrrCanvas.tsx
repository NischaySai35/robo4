/**
 * MsrrCanvas — the lattice sandbox viewport.
 *
 * Its own Three.js scene, deliberately not the shared SceneManager/ModelEditor.
 * Two reasons: the lattice draws simple proxies (one box per module, not eight
 * bodies and seven joints), so it stays interactive while a plan of hundreds of
 * moves plays; and ModelEditor is mount-once, so building experiment tooling into
 * it would fight the editor rather than sit beside it. The real modules still get
 * shown — through the mirror, in the shared scene, driven by this same plan.
 *
 * What it draws:
 *   solid cubes      — the current configuration, one per module
 *   amber cubes      — modules that cannot move this step without splitting the
 *                      robot (graph articulation points). Not decoration: it is
 *                      the planner's own constraint, made visible.
 *   wireframe ghosts — the target shape
 *   moving cube      — during playback, the module in flight, on its real arc
 *
 * Interaction is face-based: clicking a cube's face adds a module on that face,
 * clicking the ground adds one at y = 0. That is how you actually assemble a
 * lattice robot, and it makes an illegal (floating, unattached) placement
 * impossible to author by hand.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useThemeStore } from '@/state/themeStore';
import { useMsrrStore, configAtStep } from '@/state/msrrStore';
import { type Cell, key, cellsOf, add } from '@/robotics/msrr/lattice';
import { poseAt, cellPose, orientationAfter, IDENTITY_QUAT } from '@/robotics/msrr/executor';
import { structureAfter } from '@/robotics/msrr/transform';
import { buildGeometry, moduleGeometry, tweenGeometry } from './moduleGeometry';

const CELL = 1; // the sandbox draws in unit lattice space; metres are the mirror's job

export default function MsrrCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<any>(null);
  const theme = useThemeStore((s) => s.theme);

  // ── scene setup: once ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(9, 8, 12);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.target.set(0, 1.5, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key1 = new THREE.DirectionalLight(0xffffff, 1.1);
    key1.position.set(6, 10, 8);
    scene.add(key1);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-7, 4, -6);
    scene.add(fill);

    const grid = new THREE.GridHelper(40, 40);
    // Lattice cell centres are integers, so the grid LINES must fall on half
    // integers for a cube to sit inside a square rather than straddling four.
    grid.position.set(0.5, -0.5, 0.5);
    scene.add(grid);

    const groups = {
      modules: new THREE.Group(),
      ghosts: new THREE.Group(),
      overlay: new THREE.Group(),
    };
    scene.add(groups.modules, groups.ghosts, groups.overlay);

    // Shared geometry/materials — one allocation, reused by every cube.
    const boxGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const nubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12);

    const mats = {
      module: new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.55, metalness: 0.1 }),
      // Shape cubes fade back once real modules are built on top of them — the
      // diagram is scaffolding at that point, not the thing itself.
      shapeFaded: new THREE.MeshStandardMaterial({
        color: 0x4a90d9, roughness: 0.7, transparent: true, opacity: 0.14,
      }),
      locked: new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.55, metalness: 0.1 }),
      moving: new THREE.MeshStandardMaterial({ color: 0x59c86b, roughness: 0.4, metalness: 0.15, emissive: 0x1c4d24 }),
      onTarget: new THREE.MeshStandardMaterial({ color: 0x6fbf73, roughness: 0.6, metalness: 0.05 }),
      nub: new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.4 }),
      edge: new THREE.LineBasicMaterial({ color: 0x14161a, transparent: true, opacity: 0.35 }),
      ghost: new THREE.LineBasicMaterial({ color: 0x9a7cff, transparent: true, opacity: 0.75 }),
      preview: new THREE.MeshStandardMaterial({ color: 0x9a7cff, transparent: true, opacity: 0.3 }),
    };

    /**
     * One SHAPE cube: a plain body and its outline, nothing else.
     *
     * Deliberately featureless. These cubes are a shape diagram, not modules —
     * they carry no connectors and no kinematics. An earlier version stuck six
     * connector nubs on each one, which made a diagram look like a robot made of
     * dice and implied a per-cube module the whole design says does not exist.
     */
    const makeCube = (mat: THREE.Material) => {
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.userData.pickable = true;
      g.add(mesh);
      g.add(new THREE.LineSegments(edgeGeo, mats.edge));
      return g;
    };

    const ghostBox = () => new THREE.LineSegments(edgeGeo, mats.ghost);

    // A distinct colour per module so a chain reads as separate parts rather
    // than one undifferentiated blob.
    const builtMats = [
      0xe8743b, 0x59c86b, 0x9a7cff, 0x3bb0e8, 0xe8c53b, 0xe85b8a,
      0x46c9b0, 0xb0c93f, 0xc96f9e, 0x6f8fc9,
    ].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.15 }));

    // Real module parts. Unit primitives, scaled per instance — a rod is a unit
    // cylinder stretched between two points, a joint or dome a unit sphere.
    const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
    const ballGeo = new THREE.SphereGeometry(1, 14, 10);
    const partMats = {
      rod: new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.5, metalness: 0.35 }),
      bigRod: new THREE.MeshStandardMaterial({ color: 0x7f8899, roughness: 0.45, metalness: 0.4 }),
      twist: new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4, metalness: 0.3 }),
      bend: new THREE.MeshStandardMaterial({ color: 0x22c39a, roughness: 0.4, metalness: 0.3 }),
      dome: new THREE.MeshStandardMaterial({ color: 0xd4d8e0, roughness: 0.35, metalness: 0.2 }),
      sideDome: new THREE.MeshStandardMaterial({ color: 0xaab0bd, roughness: 0.4, metalness: 0.2 }),
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const st = {
      renderer, scene, camera, controls, groups, mats, makeCube, ghostBox, grid,
      raycaster, pointer, builtMats,
      rodGeo, ballGeo, partMats,
      /** pooled meshes for real module geometry */
      partPool: [] as THREE.Mesh[],
      /** signature of what partPool currently shows, so FK is not re-run per frame */
      partSig: '',
      cubePool: [] as THREE.Group[],
      ghostPool: [] as THREE.LineSegments[],
      /** translucent cubes showing where a click/drag would place */
      previewPool: [] as THREE.Mesh[],
      previewGeo: boxGeo,
      /** cells the current hover or drag would add */
      hoverCells: [] as Cell[],
      /** in-progress face extrude */
      drag: null as null | { from: Cell; normal: Cell; count: number },
      /** where a right-press started, to tell a click from an orbit-pan */
      rightDown: null as null | { x: number; y: number },
      pickTargets: [] as THREE.Object3D[],
      /** cell each pickable mesh represents, by mesh uuid */
      cellOfMesh: new Map<string, Cell>(),
      dispose: () => {
        boxGeo.dispose(); edgeGeo.dispose(); nubGeo.dispose();
        rodGeo.dispose(); ballGeo.dispose();
        for (const m of builtMats) m.dispose();
        for (const m of Object.values(partMats)) m.dispose();
        for (const m of Object.values(mats)) (m as any).dispose?.();
        controls.dispose();
        renderer.dispose();
      },
    };
    stateRef.current = st;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth || 1;
      const h = parent.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();

    // ── render loop ──────────────────────────────────────────────────────────
    let raf = 0;
    let last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      useMsrrStore.getState().tick(dt);
      syncScene(st);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      st.dispose();
      stateRef.current = null;
    };
  }, []);

  // ── theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const dark = theme === 'dark';
    st.scene.background = new THREE.Color(dark ? 0x14161a : 0xeef0f4);
    st.mats.edge.color.set(dark ? 0xffffff : 0x14161a);
    st.mats.edge.opacity = dark ? 0.22 : 0.35;
  }, [theme]);

  // ── pointer interaction ────────────────────────────────────────────────────
  //
  // Cubes are only ever born from a FACE of an existing cube. There is no
  // ground-plane placement and no click-in-empty-space path, so a cube can never
  // appear floating in mid-air disconnected from the structure — which the
  // planner would refuse to work with anyway.
  //
  //   click a face        → one cube on that face
  //   drag off a face     → a run of cubes in that direction, one undo entry
  //   right-click a cube  → delete it, but only if the rest stays in one piece
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const MAX_EXTRUDE = 32;

    const aimRay = (ev: PointerEvent | MouseEvent) => {
      const st = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      st.pointer.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      st.raycaster.setFromCamera(st.pointer, st.camera);
      return st.raycaster.ray;
    };

    /** Which cube face is under the pointer, and which cell sits on it. */
    const pickFace = (ev: PointerEvent | MouseEvent):
      { cube: Cell; normal: Cell; newCell: Cell } | null => {
      const st = stateRef.current;
      if (!st) return null;
      aimRay(ev);
      const hits = st.raycaster.intersectObjects(st.pickTargets, false);
      if (!hits.length) return null;
      const h = hits[0];
      const cube = st.cellOfMesh.get(h.object.uuid) as Cell | undefined;
      if (!cube || !h.face) return null;
      const n = h.face.normal.clone().applyMatrix4(
        new THREE.Matrix4().extractRotation(h.object.matrixWorld),
      );
      const normal: Cell = [Math.round(n.x), Math.round(n.y), Math.round(n.z)];
      return { cube, normal, newCell: add(cube, normal) };
    };

    /** The run of free cells starting at `from`, stopping at the first occupied one. */
    const runCells = (from: Cell, normal: Cell, count: number): Cell[] => {
      const occ = useMsrrStore.getState().config.occ;
      const out: Cell[] = [];
      for (let i = 0; i < count; i++) {
        const c: Cell = [from[0] + normal[0] * i, from[1] + normal[1] * i, from[2] + normal[2] * i];
        if (occ.has(key(c))) break;
        out.push(c);
      }
      return out;
    };

    /**
     * How many cubes the drag is asking for: the closest point between the
     * pointer ray and the extrusion axis, in whole cells. Standard
     * closest-approach-of-two-lines, which is what makes the drag track the
     * pointer at any camera angle rather than only when facing the axis.
     */
    const dragCount = (ev: PointerEvent, from: Cell, normal: Cell): number => {
      const ray = aimRay(ev);
      const P = ray.origin, d = ray.direction;
      const Q = new THREE.Vector3(from[0], from[1], from[2]);
      const e = new THREE.Vector3(normal[0], normal[1], normal[2]);
      const w0 = P.clone().sub(Q);
      const a = d.dot(d), b = d.dot(e), c = e.dot(e);
      const dd = d.dot(w0), ee = e.dot(w0);
      const denom = a * c - b * b;
      if (Math.abs(denom) < 1e-6) return 1; // sighting straight down the axis
      const t = (a * ee - b * dd) / denom;
      return Math.max(1, Math.min(MAX_EXTRUDE, Math.round(t) + 1));
    };

    const editable = () => {
      const tab = useMsrrStore.getState().tab;
      return tab === 'build' || tab === 'draw';
    };

    const onDown = (ev: PointerEvent) => {
      const st = stateRef.current;
      if (!st) return;
      if (ev.button === 2) { st.rightDown = { x: ev.clientX, y: ev.clientY }; return; }
      if (ev.button !== 0 || !editable()) return;
      const f = pickFace(ev);
      if (!f) return; // no face under the pointer: nothing to build from
      st.drag = { from: f.newCell, normal: f.normal, count: 1 };
      st.hoverCells = runCells(f.newCell, f.normal, 1);
      st.controls.enableRotate = false; // don't orbit the camera mid-extrude
      canvas.setPointerCapture?.(ev.pointerId);
    };

    const onMove = (ev: PointerEvent) => {
      const st = stateRef.current;
      if (!st) return;
      if (!editable()) { st.hoverCells = []; return; }
      if (st.drag) {
        st.drag.count = dragCount(ev, st.drag.from, st.drag.normal);
        st.hoverCells = runCells(st.drag.from, st.drag.normal, st.drag.count);
        return;
      }
      const f = pickFace(ev);
      st.hoverCells = f ? runCells(f.newCell, f.normal, 1) : [];
    };

    const onUp = (ev: PointerEvent) => {
      const st = stateRef.current;
      if (!st?.drag) return;
      const cells = runCells(st.drag.from, st.drag.normal, st.drag.count);
      if (cells.length) useMsrrStore.getState().addCells(cells);
      st.drag = null;
      st.hoverCells = [];
      st.controls.enableRotate = true;
      canvas.releasePointerCapture?.(ev.pointerId);
    };

    /** Right-click deletes — but never a cube the structure depends on. */
    const onContextMenu = (ev: MouseEvent) => {
      const st = stateRef.current;
      if (!st) return;
      ev.preventDefault();
      if (!editable()) return;
      // A right-DRAG is an orbit pan, not a delete. Only a click deletes.
      const moved = st.rightDown
        ? Math.hypot(ev.clientX - st.rightDown.x, ev.clientY - st.rightDown.y)
        : 0;
      st.rightDown = null;
      if (moved > 4) return;
      const f = pickFace(ev);
      if (!f) return;
      const store = useMsrrStore.getState();
      const res = store.removeCellSafe(f.cube);
      if (!res.ok) store.pushLog(res.reason);
    };

    const onLeave = () => {
      const st = stateRef.current;
      if (st && !st.drag) st.hoverCells = [];
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="msrr-canvas-wrap">
      <canvas ref={canvasRef} className="msrr-canvas" />
      <div className="msrr-canvas-hint">
        click a cube face to add one · drag off a face to extrude a run · right-click a cube to delete
      </div>
    </div>
  );
}

// ── per-frame scene sync ──────────────────────────────────────────────────────

/**
 * Redraw from store state. Pooled: cubes are reused frame to frame and only their
 * transform and material change, so playback does not churn the GPU.
 */
function syncScene(st: any) {
  const s = useMsrrStore.getState();
  const { plan, playback, config, target, locked, built, buildReveal } = s;
  const { transform, transformStep, transformT } = s;

  // Which modules to draw: mid-transformation the structure is replayed to the
  // scrubbed step; once every walked move has played, the module SET itself
  // may still differ from `built` — the plan can have added or removed whole
  // modules to close a count mismatch the walk alone could not (see
  // transform.ts's reconcileModuleCount) — so the fully-played state comes
  // from `transform.finalModules`, not another structureAfter call, which
  // only knows about the walk and would miss that step entirely. This also
  // covers a transform with zero walked moves (e.g. the gap was closed
  // entirely by adding modules): transformStep (0) >= moves.length (0) is
  // true, so finalModules is shown immediately rather than falling through to
  // the pre-transform build.
  const shownModules = built
    ? (transform
        ? (transformStep >= transform.moves.length
            ? transform.finalModules
            : structureAfter(built, transform.moves, transformStep))
        : built.modules.slice(0, buildReveal))
    : [];
  const builtCubes = new Set<string>();
  for (const m of shownModules) for (const c of m.cells) builtCubes.add(key(c));

  // Which config are we showing? During playback it is the state part-way through
  // the plan, not the stored one — the stored config only advances on commit.
  const playing = !!plan && plan.moves.length > 0;
  const baseConfig = playing ? configAtStep(config, plan.moves, playback.index) : config;
  const activeMove = playing ? plan.moves[playback.index] : null;

  // Orientation carried by each module up to this point in the plan.
  const quats = new Map<string, [number, number, number, number]>();
  if (playing) {
    for (let i = 0; i < playback.index; i++) {
      const m = plan.moves[i];
      quats.set(m.moduleId, orientationAfter(m, quats.get(m.moduleId) ?? IDENTITY_QUAT));
    }
  }

  const targetSet = new Set(target.map(key));
  const cells = cellsOf(baseConfig);

  // Grow the pool as needed; extras are hidden rather than destroyed.
  while (st.cubePool.length < cells.length) {
    const g = st.makeCube(st.mats.module);
    st.groups.modules.add(g);
    st.cubePool.push(g);
  }
  for (let i = cells.length; i < st.cubePool.length; i++) st.cubePool[i].visible = false;

  st.pickTargets.length = 0;
  st.cellOfMesh.clear();

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const g: THREE.Group = st.cubePool[i];
    g.visible = true;
    const moduleId = baseConfig.occ.get(key(cell)) as string;
    const isMoving = !!activeMove && activeMove.moduleId === moduleId;

    const pose = isMoving && activeMove
      ? poseAt(activeMove, playback.t, CELL, quats.get(moduleId) ?? IDENTITY_QUAT)
      : cellPose(cell, CELL, quats.get(moduleId) ?? IDENTITY_QUAT);
    g.position.set(pose.position[0], pose.position[1], pose.position[2]);
    g.quaternion.set(pose.quaternion[0], pose.quaternion[1], pose.quaternion[2], pose.quaternion[3]);

    const mesh = g.children[0] as THREE.Mesh;
    // Once modules are built, the cubes underneath them are just the diagram
    // that produced them — faded so the real parts read clearly.
    mesh.material = isMoving ? st.mats.moving
      : builtCubes.has(key(cell)) ? st.mats.shapeFaded
      : locked.has(key(cell)) ? st.mats.locked
      : targetSet.size && targetSet.has(key(cell)) ? st.mats.onTarget
      : st.mats.module;

    // Only resting cubes are click targets — picking a module mid-flight would
    // add a cell at a position that does not exist in any lattice state.
    if (!isMoving) {
      st.pickTargets.push(mesh);
      st.cellOfMesh.set(mesh.uuid, cell);
    }
  }

  // Built modules: the REAL thing — rods, joints and connector domes, placed by
  // running the module's own forward kinematics from the joint angles Build
  // solved for. Not a coloured cube per body cell, which is what this drew
  // before and which made a correct build look like a pile of dice.
  const justMoved = transform && transformStep > 0
    ? transform.moves[transformStep - 1].moduleId
    : null;

  // FK for every module every frame would be wasted work — the geometry only
  // changes when the build, the reveal slider or the transform step changes.
  // The step in flight, if playback is mid-move. Its module is drawn tweened
  // between the configuration it is leaving and the one it is arriving at, so a
  // move reads as the chain bending across to its new grip rather than jumping.
  const inFlightMoves = transform && transformStep < transform.moves.length && transformT > 0
    ? transform.moves
    : null;
  const inFlight = inFlightMoves ? inFlightMoves[transformStep] : null;

  // Rebuilding is keyed on everything that can change the drawing. transformT is
  // quantised so a smooth playback still redraws every frame it needs to without
  // rebuilding on float noise when nothing is actually moving.
  const sig = shownModules.map((m) => `${m.id}@${key(m.anchorCell)}|${key(m.anchorDir)}|${m.pose.id}`).join(';')
    + `|${justMoved ?? ''}`
    + `|${inFlight ? `${inFlight.moduleId}@${transformStep}:${Math.round(transformT * 60)}` : ''}`;
  if (sig !== st.partSig) {
    st.partSig = sig;

    let parts = buildGeometry(shownModules);
    if (inFlight) {
      // Same module, one step later — the pose it is moving into.
      const arriving = structureAfter(
        built as NonNullable<typeof built>,
        inFlightMoves as NonNullable<typeof inFlightMoves>,
        transformStep + 1,
      ).find((m) => m.id === inFlight.moduleId);
      if (arriving) {
        const to = moduleGeometry(arriving);
        // Whether this is the module's first move in the whole plan, or a
        // later one. From its second move on, the module it is leaving FROM
        // is anchored at the connector it grabbed in the PREVIOUS move — the
        // shared point with `g` is g's far end, not g's anchor. Passing the
        // wrong one here is exactly the "reversing in thin air" bug: the
        // anchor itself would lerp between two unrelated points in space.
        const sharedIsFarEndOfA = (inFlightMoves as NonNullable<typeof inFlightMoves>)
          .slice(0, transformStep)
          .some((mv) => mv.moduleId === inFlight.moduleId);
        parts = parts.map((g) => (
          g.moduleId === inFlight.moduleId
            ? tweenGeometry(g, to, transformT, { sharedIsFarEndOfA })
            : g
        ));
      }
    }

    let n = 0;
    const nextMesh = (geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh => {
      if (n >= st.partPool.length) {
        const created = new THREE.Mesh(geo, mat);
        st.groups.overlay.add(created);
        st.partPool.push(created);
      }
      const mesh: THREE.Mesh = st.partPool[n++];
      mesh.geometry = geo;
      mesh.material = mat;
      mesh.visible = true;
      return mesh;
    };

    parts.forEach((g, i) => {
      const highlight = g.moduleId === justMoved || g.moduleId === inFlight?.moduleId;
      const tint = st.builtMats[i % st.builtMats.length];

      for (const rod of g.rods) {
        const mesh = nextMesh(st.rodGeo, highlight ? st.mats.moving : (rod.isBigRod ? st.partMats.bigRod : st.partMats.rod));
        setSegment(mesh, rod.from, rod.to, rod.radius);
      }
      for (const j of g.joints) {
        // Joints carry the module's own colour, so a chain still reads as
        // separate parts the way the assembly list numbers them.
        const mesh = nextMesh(st.ballGeo, highlight ? st.mats.moving : tint);
        mesh.position.set(j.at[0], j.at[1], j.at[2]);
        mesh.scale.setScalar(j.radius);
        mesh.quaternion.identity();
      }
      for (const c of g.connectors) {
        const mesh = nextMesh(st.ballGeo, c.isEnd ? st.partMats.dome : st.partMats.sideDome);
        mesh.position.set(c.at[0], c.at[1], c.at[2]);
        mesh.scale.setScalar(c.radius);
        mesh.quaternion.identity();
      }
    });

    for (let i = n; i < st.partPool.length; i++) st.partPool[i].visible = false;
  }

  // Placement preview: where a click would put a cube, or the whole run an
  // in-progress drag would create.
  setPreviewCells(st, st.hoverCells as Cell[]);

  // Target ghosts: only the cells that are not already filled, so the ghost shows
  // what is left to do rather than outlining the whole answer.
  const ghostCells: Cell[] = target.filter((c) => !baseConfig.occ.has(key(c)));
  while (st.ghostPool.length < ghostCells.length) {
    const gh = st.ghostBox();
    st.groups.ghosts.add(gh);
    st.ghostPool.push(gh);
  }
  for (let i = ghostCells.length; i < st.ghostPool.length; i++) st.ghostPool[i].visible = false;
  for (let i = 0; i < ghostCells.length; i++) {
    const gh: THREE.LineSegments = st.ghostPool[i];
    gh.visible = true;
    gh.position.set(ghostCells[i][0], ghostCells[i][1], ghostCells[i][2]);
  }
}

/**
 * Stretch a unit cylinder between two points. The primitive runs along Y, so it
 * is scaled to the segment's length on that axis and then rotated to line Y up
 * with the segment — which is what lets one shared geometry draw every rod.
 */
function setSegment(
  mesh: THREE.Mesh,
  from: [number, number, number],
  to: [number, number, number],
  radius: number,
) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz) || 1e-6;
  mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
  mesh.scale.set(radius, len, radius);
  mesh.quaternion.setFromUnitVectors(
    UP_Y,
    SEG_DIR.set(dx / len, dy / len, dz / len),
  );
}
const UP_Y = new THREE.Vector3(0, 1, 0);
const SEG_DIR = new THREE.Vector3();

/** Show `cells` as translucent placement previews, pooling the meshes. */
function setPreviewCells(st: any, cells: Cell[]) {
  while (st.previewPool.length < cells.length) {
    const m = new THREE.Mesh(st.previewGeo, st.mats.preview);
    st.groups.overlay.add(m);
    st.previewPool.push(m);
  }
  for (let i = cells.length; i < st.previewPool.length; i++) st.previewPool[i].visible = false;
  for (let i = 0; i < cells.length; i++) {
    const m: THREE.Mesh = st.previewPool[i];
    m.visible = true;
    m.position.set(cells[i][0], cells[i][1], cells[i][2]);
  }
}
