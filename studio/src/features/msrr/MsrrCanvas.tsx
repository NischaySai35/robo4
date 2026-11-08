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
import { buildConnectorMarker, orientConnectorMarker, connectorMarkerLength, CONNECTOR_COLOR, CONNECTOR_SEL_COLOR } from '@/viewport/renderers/ConnectorRenderer';
import { connectorWorldFrom } from '@/assembly/connectorSnap';
import { restConnectors, STUDIO_TO_MODEL_QUAT } from '@/robotics/msrr/restLayout';
import type { FittedModule } from '@/robotics/msrr/fitModules';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import floorReceiverUrl from '@/assets/msrr/floor_receiver.stl?url';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useThemeStore } from '@/state/themeStore';
import { useMsrrStore, configAtStep } from '@/state/msrrStore';
import { type Cell, key, cellsOf, add } from '@/robotics/msrr/lattice';
import { poseAt, cellPose, orientationAfter, IDENTITY_QUAT } from '@/robotics/msrr/executor';
import { structureAfter } from '@/robotics/msrr/transform';
import { buildGeometry, moduleGeometry, moduleBodies, tweenGeometry } from './moduleGeometry';
import { moduleMeshGeometries, disposeModuleMeshes } from './moduleMeshes';
import { manualToFitted } from '@/robotics/msrr/manualBuild';
import { useV2Store, type ManualState } from '@/state/msrrV2Store';
import { bridge } from '@/bridge/cameraBridge';
import { SceneManager } from '@/viewport/SceneManager';
import SpreadHud from '@/features/canvas/SpreadHud';
import ViewportStats from '@/features/canvas/ViewportStats';
import NavigationGizmo from '@/features/viewport-ui/NavigationGizmo';
import ViewControls from '@/features/viewport-ui/ViewControls';
import HomeButton from '@/features/viewport-ui/HomeButton';
import IkIndicator from '@/features/viewport-ui/IkIndicator';
import { UNITS_PER_M } from '@/robotics/msrr/modulink';
import { MODULINK_CUBE_SIZE } from '@/robotics/msrr/occupancy';
import { toView } from '@/features/msrr2/v2View';
import { ManualPortMenu } from '@/features/msrr2/ManualTab';
import { CUBES_PER_METRE } from '@/features/msrr/moduleMeshes';
import { scheduleFrame, cancelFrame } from '@/runtime/frameScheduler';
import { useEditorStore } from '@/state/editorStore';

const CELL = 1; // the sandbox draws in unit lattice space; metres are the mirror's job

export default function MsrrCanvas() {
  const stateRef = useRef<any>(null);
  const theme = useThemeStore((s) => s.theme);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const v2Mode = useV2Store((s) => s.mode) === 'v2';

  // ── scene setup: once ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Its OWN viewport built from the SAME parts as the Editor's: the SceneManager engine (renderer, lights, shadows, theme,
    // render engines, grid, camera + orbit, resize) and, in the JSX, the same gizmo / view controls / Home / stats. Its scene
    // holds only MSRR robots, in `scene` = a root group in metres (MSRR draws in its own units: 5.5 per metre, floor y -0.5).
    // Gizmo, view controls, Home and stats reach it through its own viewport handle, so the Editor's stays untouched.
    const sm = new SceneManager(canvas, 'msrr');
    const vp = sm.viewport;
    sm.applyTheme(useThemeStore.getState().theme);
    sm.setRealFloor(true);                       // the robots stand on a real floor at height 0 (the physics floor)
    const unsubTheme = useThemeStore.subscribe((s) => { sm.applyTheme(s.theme); sm.requestRender(3); });
    const { renderer, camera, controls } = sm;
    const scene = new THREE.Group(); scene.name = 'msrr';
    scene.scale.setScalar(1 / UNITS_PER_M); scene.position.y = 0.5 / UNITS_PER_M;
    sm.scene.add(scene);
    camera.position.set(9 / UNITS_PER_M, 8 / UNITS_PER_M, 12 / UNITS_PER_M);
    controls.target.set(0, 1.5 / UNITS_PER_M, 0); controls.update();
    vp.getRendererStats = () => sm.getRendererStats();
    vp.getRenderEngine = () => sm._engineMode ?? 'eevee';
    vp.setRenderEngine = (e: string) => sm.setRenderEngine(e);
    vp.setWireframe = (on: boolean) => { scene.traverse((o: any) => { if (o.material && 'wireframe' in o.material) o.material.wireframe = on; }); sm.requestRender(2); };
    vp.setConnectorsVisible = (on: boolean) => { stateRef.current && (stateRef.current.portsHidden = !on); sm.requestRender(2); };
    vp.getConnectorsVisible = () => !stateRef.current?.portsHidden;
    vp.getFitBox = () => {
      scene.updateMatrixWorld(true); const b = new THREE.Box3();
      for (const c of scene.children) if (c !== grid && c !== ground && c.visible) b.expandByObject(c);   // the robots, not the lattice / pick floor
      return b.isEmpty() ? null : b;
    };

    vp.getBodyCentres = () => stateRef.current?.bodyCentres ?? [];
    // Smart orbit pivot: the whole MSRR root. SceneManager keeps only visible solids (it skips
    // the grid lines, the invisible pick floor, labels and the on-top port / CoM balls).
    vp.getModelGroup = () => scene;

    const grid = new THREE.GridHelper(40, 40);   // the cube lattice (Legacy tab only; v2 uses the Studio grid)
    // Lattice cell centres are integers, so the grid LINES must fall on half
    // integers for a cube to sit inside a square rather than straddling four.
    grid.position.set(0.5, -0.5, 0.5);
    scene.add(grid);

    // An invisible, raycastable floor — the actual click target behind "click
    // the ground to place a cube at y=0" (see the file header). Flat at the
    // same y as the grid, so a hit's (x,z) rounds straight to the cell it
    // visually sits above. Fully transparent: it exists to be picked, not
    // seen — the grid lines already show where it is.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.5, 0);
    scene.add(ground);

    const groups = {
      modules: new THREE.Group(),
      ghosts: new THREE.Group(),
      overlay: new THREE.Group(),
    };
    // the split view's right half: the REAL copy's parts (drawn only in that half, see sm.split below)
    const realGroup = new THREE.Group(); realGroup.name = 'msrr-real'; realGroup.visible = false;
    scene.add(groups.modules, groups.ghosts, groups.overlay, realGroup);

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
    // A lock connector is a DOME, not a floating ball: "same point in space,
    // outward normal pointing directly out" (the spec's own definition of a
    // lock). Sphere geometry's default pole sits on +Y, so a hemisphere cut
    // at the equator (thetaLength = PI/2) bulges toward +Y with its flat face
    // in the XZ plane — oriented per-instance by rotating +Y onto the
    // connector's own outward normal, and positioned flush against the rod
    // rather than centred on it, so it reads as a cap on the chain, not a
    // sphere hovering nearby.
    // Capped: a bare SphereGeometry hemisphere is an open shell, so the flat
    // side — which is the side that faces OUT at a lock, and therefore the
    // side most often pointed at the camera — would be a see-through hole
    // into a hollow interior. The disc closes it into a solid-looking dome.
    // Merged as one geometry so a dome stays a single pooled mesh.
    const domeShell = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeCap = new THREE.CircleGeometry(1, 14);
    // CircleGeometry lies in XY facing +Z; rotate it into the XZ plane facing
    // -Y so it seals the hemisphere's rim at the local origin.
    domeCap.rotateX(Math.PI / 2);
    const domeGeo = mergeGeometries([domeShell, domeCap], false) ?? domeShell;
    const DOME_UP = new THREE.Vector3(0, 1, 0);
    const partMats = {
      // the real try8 parts, coloured like the Editor shows them
      pla: new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.55, metalness: 0.05 }),
      spine: new THREE.MeshStandardMaterial({ color: 0x8a909c, roughness: 0.5, metalness: 0.25 }),
      endA: new THREE.MeshStandardMaterial({ color: 0x1f3fbf, roughness: 0.5, metalness: 0.1 }),   // End A = dark blue (same as the sim pictures)
      endB: new THREE.MeshStandardMaterial({ color: 0xff8c0d, roughness: 0.5, metalness: 0.1 }),   // End B = orange
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
      renderer, scene, camera, controls, groups, mats, makeCube, ghostBox, grid, ground,
      raycaster, pointer, builtMats,
      rodGeo, ballGeo, domeGeo, DOME_UP, partMats,
      sm, realGroup,
      /** pooled meshes for real module geometry */
      partPool: [] as THREE.Mesh[],
      /** the split view's right half: pooled meshes of the real copy, and what they show */
      realPool: [] as THREE.Mesh[],
      realSig: -1,
      /** signature of what partPool currently shows, so FK is not re-run per frame */
      partSig: '',
      /** what the VSEPR score measures: every body drawn, in metres */
      bodyCentres: [] as [number, number, number][],
      limitsFor: -1,
      /** the manual setup the camera was last framed for (a new one gets a clean 3/4 view) */
      framedScene: null as unknown,
      frameAt: 0,
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
        domeGeo.dispose(); domeShell.dispose(); domeCap.dispose();
        disposeModuleMeshes();
        ground.geometry.dispose(); (ground.material as THREE.Material).dispose();
        for (const m of builtMats) m.dispose();
        for (const m of Object.values(partMats)) m.dispose();
        for (const m of Object.values(mats)) (m as any).dispose?.();
        unsubTheme(); sm.dispose();
      },
    };
    stateRef.current = st;

    // Any change in the MSRR stores can change the drawing, and live physics changes them every frame, so
    // physics still draws every frame while idle draws nothing (31 Oct: this used to draw every frame always).
    const redraw = () => sm.requestRender(2);
    const unsubMsrr = useMsrrStore.subscribe(redraw), unsubV2 = useV2Store.subscribe(redraw);

    // ── render loop ───────────────────────────────────────────────────────────
    let raf = 0, last = performance.now();
    const loop = () => {
      raf = scheduleFrame(loop);
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      useMsrrStore.getState().tick(dt);
      useV2Store.getState().tick(dt);
      const before = st.partSig;
      syncScene(st);
      if (st.partSig !== before) sm.requestRender(2);
      if (syncSplit(st)) sm.requestRender(2);
      // a NEW manual setup (not Reset - same setup): frame it from a clean 3/4 angle once its parts are drawn (Nischay 7 Nov)
      const man = useV2Store.getState().manual;
      // (0.8 s after it first moves: the very first draw can still be the previous robot -> it framed empty floor)
      if (man && man.start.scene !== st.framedScene && st.partSig !== before) { st.framedScene = man.start.scene; st.frameAt = now + 800; }
      if (st.frameAt && now > st.frameAt) { st.frameAt = 0; sm.fitCamera({ fresh: true }); }
      // zoom limits follow the robot's size, like the Editor's (else min distance stays 10 cm = one module)
      if (st.bodyCentres.length !== st.limitsFor) { st.limitsFor = st.bodyCentres.length; sm.updateCameraLimits(); }
      grid.visible = useV2Store.getState().mode !== 'v2';
      if (sm.shouldRender()) sm.render();
    };
    loop();

    return () => {
      cancelFrame(raf);
      unsubMsrr(); unsubV2();
      st.dispose();
      stateRef.current = null;
    };
  }, []);

  // ── theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const dark = theme === 'dark';      // background: the shared SceneManager's theme
    st.mats.edge.color.set(dark ? 0xffffff : 0x14161a);
    st.mats.edge.opacity = dark ? 0.22 : 0.35;
  }, [theme]);

  // ── pointer interaction ────────────────────────────────────────────────────
  //
  // A cube is born from a FACE of an existing cube, or — the only other
  // legal start — from the ground, which places it at y=0. Both go through
  // the same `newCell`/`normal` shape below, so a floating, disconnected
  // placement stays impossible to author by hand either way: the ground is
  // just cube 0's face, standing in before cube 0 exists.
  //
  //   click a face        → one cube on that face
  //   click empty ground   → one cube at (x, 0, z), only when nothing is under it
  //   drag off a face      → a run of cubes in that direction, one undo entry
  //   right-click a cube   → delete it, but only if the rest stays in one piece
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const MAX_EXTRUDE = 32;

    const aimRay = (ev: PointerEvent | MouseEvent) => {
      const st = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      // split view: the left half is the ideal robot you click; the right half (the real copy) only shows
      const w = st.sm.split ? rect.width / 2 : rect.width;
      st.pointer.set(
        ev.clientX - rect.left > w ? 9 : ((ev.clientX - rect.left) / w) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      st.raycaster.setFromCamera(st.pointer, st.camera);
      return st.raycaster.ray;
    };

    /**
     * Which cube face is under the pointer, and which cell sits on it — or,
     * failing that, which ground cell is. `source` tells the two apart:
     * right-click delete only ever acts on a real cube (see onContextMenu),
     * since a ground hit's `cube` is really just the cell about to be born,
     * not anything that exists yet to remove.
     */
    const pickFace = (ev: PointerEvent | MouseEvent):
      { cube: Cell; normal: Cell; newCell: Cell; source: 'cube' | 'ground' } | null => {
      const st = stateRef.current;
      if (!st) return null;
      aimRay(ev);

      const hits = st.raycaster.intersectObjects(st.pickTargets, false);
      if (hits.length) {
        const h = hits[0];
        const cube = st.cellOfMesh.get(h.object.uuid) as Cell | undefined;
        if (!cube || !h.face) return null;
        const n = h.face.normal.clone().applyMatrix4(
          new THREE.Matrix4().extractRotation(h.object.matrixWorld),
        );
        const normal: Cell = [Math.round(n.x), Math.round(n.y), Math.round(n.z)];
        return { cube, normal, newCell: add(cube, normal), source: 'cube' };
      }

      // The ground is ONLY cube zero's face — it seeds the very first cube of
      // an empty sandbox, exactly like clicking a face seeds every cube after
      // it. The moment ANY cube exists, the ground stops being a valid start:
      // without this guard, clicking open ground anywhere else on the grid
      // would plant a second, disconnected island with no face to have grown
      // from — precisely the "floating in mid-air, unattached" placement the
      // face-only design existed to make impossible to author by hand, and
      // exactly what happened before this guard was added.
      if (useMsrrStore.getState().config.occ.size > 0) return null;

      const groundHit = st.raycaster.intersectObject(st.ground, false);
      if (!groundHit.length) return null;
      const p = st.scene.worldToLocal(groundHit[0].point.clone());   // into the MSRR root (its own units)
      const newCell: Cell = [Math.round(p.x), 0, Math.round(p.z)];
      return { cube: newCell, normal: [0, 1, 0], newCell, source: 'ground' };
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
      if (useV2Store.getState().mode === 'v2') return false; // v2 edits robots, not cubes
      const tab = useMsrrStore.getState().tab;
      return tab === 'build' || tab === 'draw';
    };

    /** MANUAL tab: the connector marker under the pointer (or null) */
    const pickPort = (ev: PointerEvent | MouseEvent): string | null => {
      const st = stateRef.current;
      if (!st?.portGroup || !useV2Store.getState().manual) return null;
      aimRay(ev);
      const hit = st.raycaster.intersectObjects(st.portGroup.children, true).map((h: any) => { let o = h.object; while (o && !o.userData.port) o = o.parent; return o; }).find(Boolean);
      return hit ? hit.userData.port : null;
    };

    /** the END plug nearest the pointer on screen (left half in split view), if within GRAB_PX */
    const GRAB_PX = 70;
    const nearestEnd = (ev: PointerEvent, man: ManualState): string | null => {
      const st = stateRef.current; const rect = canvas.getBoundingClientRect();
      const w = st.sm.split ? rect.width / 2 : rect.width; const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
      if (px > w) return null;
      let best: string | null = null, bd = GRAB_PX;
      for (const q of man.ports) {
        if (q.kind !== 'end') continue;
        const node = st.portNodes.get(q.id)?.node; if (!node) continue;
        const v = node.getWorldPosition(new THREE.Vector3()).project(st.camera);
        const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * rect.height, dd = Math.hypot(sx - px, sy - py);
        if (v.z < 1 && dd < bd) { bd = dd; best = q.id; }
      }
      return best;
    };

    const onDown = (ev: PointerEvent) => {
      const st = stateRef.current;
      if (!st) return;
      if (ev.button === 0 && useV2Store.getState().manual) {
        const id = pickPort(ev);
        const man = useV2Store.getState().manual!;
        // the shared Drag tip switch (IkIndicator, editorStore.ikDrag): grab an end connector, the sim's DIK + VSEPR move it.
        // 5 Nov: only a press exactly on the few-pixel plug grabbed it, anywhere else panned - now the END plug nearest the press
        // on screen, within ~70 px, is taken
        const endId = useEditorStore.getState().ikDrag && man.mode === 'move' ? nearestEnd(ev, man) : null;
        if (endId) {
          const node = st.portNodes.get(endId)?.node; if (!node) return; const id = endId;
          const at = node.getWorldPosition(new THREE.Vector3());
          st.tipDrag = { id, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(st.camera.getWorldDirection(new THREE.Vector3()), at), last: 0 };
          // the camera must not move while a tip is dragged (5 Nov: the orbit controls took the same press, the view turned with the
          // mouse and the drag plane with it - the end went the wrong way): this press is ours, the controls are off until let go
          ev.stopImmediatePropagation(); ev.preventDefault(); st.controls.enabled = false;
          useV2Store.getState().manualSet({ hover: null });      // no connector menu popping up over the drag
          canvas.setPointerCapture?.(ev.pointerId); return;
        }
        if (id) { useV2Store.getState().manualPick(id); return; }
      }
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
      const man = useV2Store.getState().manual;
      if (man && st.tipDrag) {                                   // dragging a tip: the mouse on a plane facing the camera -> the sim
        const now = performance.now(); if (now - st.tipDrag.last < 80) return; st.tipDrag.last = now;
        aimRay(ev); const hit = st.raycaster.ray.intersectPlane(st.tipDrag.plane, new THREE.Vector3()); if (!hit) return;
        const v = st.portGroup.worldToLocal(hit);              // view units -> Studio metres (inverse of v2View.toView)
        useV2Store.getState().manualCmd({ kind: 'drag', end: st.tipDrag.id, p: [v.x / CUBES_PER_METRE, (v.y + 0.5) / CUBES_PER_METRE, v.z / CUBES_PER_METRE] });
        return;
      }
      if (man) {
        const id = pickPort(ev);
        const rect = canvas.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top;
        if (id && id !== man.hover?.id) useV2Store.getState().manualSet({ hover: { id, x, y } });
        else if (!id && man.hover && Math.hypot(x - man.hover.x, y - man.hover.y) > 60) useV2Store.getState().manualSet({ hover: null });   // moved away: menu goes

      }
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
      if (st?.tipDrag) {                                         // let go: the sim stops steering the tip
        useV2Store.getState().manualCmd({ kind: 'drag', end: st.tipDrag.id, p: null });
        st.tipDrag = null; st.controls.enabled = true; canvas.releasePointerCapture?.(ev.pointerId); return;
      }
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
      if (!f || f.source !== 'cube') return; // nothing built there yet to delete
      const store = useMsrrStore.getState();
      const res = store.removeCellSafe(f.cube);
      if (!res.ok) store.pushLog(res.reason);
    };

    const onLeave = () => {
      const st = stateRef.current;
      if (st && !st.drag) st.hoverCells = [];
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown, true);   // capture: before the orbit controls see the press (tip drag)
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown, true);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="msrr-canvas-wrap">
      <canvas ref={canvasRef} className="msrr-canvas" />
      {/* the same viewport overlays as the Editor's (they talk to this viewport through the bridge while it is open) */}
      <div className="top-center-cluster"><HomeButton /><IkIndicator /></div>
      <div className="top-right-cluster"><NavigationGizmo /><ViewControls /></div>
      <div className="vp-hud-stack"><SpreadHud source="viewport" /><ViewportStats /></div>
      {v2Mode && <ManualPortMenu />}
      {v2Mode && <SplitLabels />}
      {!v2Mode && <div className="msrr-canvas-hint">
        click the ground or a cube face to add one · drag to extrude a run · right-click a cube to delete
      </div>}
    </div>
  );
}

// ── split view: left ideal, right the real copy ──────────────────────────────

/** which material a module part gets: the two OUTER end connectors in their own colours (the module is symmetric: which end is
 *  on the floor?), rotors in the module's colour. Shared by the ideal robot and the split view's real copy. */
function partMat(st: any, body: { kind: string; name: string }, tint: THREE.Material): THREE.Material {
  return body.kind === 'rotor' ? tint
    : body.name === 'EndA_LockModule' ? st.partMats.endA
      : body.name === 'EndB_LockModule' ? st.partMats.endB
        : body.kind === 'spine' ? st.partMats.spine : st.partMats.pla;
}

/** Split on/off (SceneManager draws the scene twice) and the real copy's parts. True = something changed. */
function syncSplit(st: any): boolean {
  const v2 = useV2Store.getState();
  const on = v2.mode === 'v2' && v2.split && !!v2.manual;
  let changed = false;
  if (on !== !!st.sm.split) {
    // left = the normal state (the SceneManager also restores it after each draw); right = only the real copy + the floor
    const hideOnRight = () => [st.groups.overlay, st.portGroup, st.v2Group].filter(Boolean);
    if (!on) { st.realGroup.visible = false; st.groups.overlay.visible = true; if (st.v2Group) st.v2Group.visible = true; }
    st.sm.setSplit(on ? {
      left: () => { st.realGroup.visible = false; for (const g of hideOnRight()) g.visible = !(g === st.portGroup && st.portsHidden); },
      right: () => { st.realGroup.visible = true; for (const g of hideOnRight()) g.visible = false; },
    } : null);
    changed = true;
  }
  if (!on || v2.view2.sig === st.realSig) return changed;
  st.realSig = v2.view2.sig;
  const meshGeos = moduleMeshGeometries(); let n = 0;
  v2.view2.modules.forEach((m, i) => {
    const tint = st.builtMats[i % st.builtMats.length];
    for (const body of moduleBodies(m)) {
      const geo = meshGeos.get(body.name); if (!geo) continue;
      if (n >= st.realPool.length) { const mm = new THREE.Mesh(geo); st.realGroup.add(mm); st.realPool.push(mm); }
      const mesh: THREE.Mesh = st.realPool[n++];
      mesh.geometry = geo; mesh.material = partMat(st, body, tint); mesh.visible = true;
      mesh.position.set(body.position[0], body.position[1], body.position[2]);
      mesh.quaternion.set(body.quaternion[0], body.quaternion[1], body.quaternion[2], body.quaternion[3]);
    }
  });
  for (let i = n; i < st.realPool.length; i++) st.realPool[i].visible = false;
  if (n && !st.realShown) st.sm.fitCamera();            // the real copy's first frame: frame both robots for their halves
  st.realShown = n > 0;
  return true;
}

/** the two halves' names, and how the real copy is doing (speed, its last lock result) */
function SplitLabels() {
  const on = useV2Store((s) => s.split && !!s.manual);
  const tw = useV2Store((s) => s.twin);
  const seed = useV2Store((s) => s.physSeed);
  const ideal = useV2Store((s) => !!s.manual?.start.opts.ideal);   // the label must not say IDEAL when it is not (7 Nov)
  if (!on) return null;
  const st = tw?.state;
  const real = st?.source === 'telemetry';
  const what = real ? "the real robot's world" : 'the real copy';
  const building = !tw?.err && (!tw?.pp || !!st?.starting);
  const status = tw?.err ? `could not start: ${tw.err}`
    : building ? `building ${what}… ${(st?.elapsed ?? 0).toFixed(0)} s`
      // 5 Nov: with Sync on the right half is ONLY the real robot - no contact = its last real pose stays (never the copy's guess)
      : real && st?.contact === false ? `NO CONTACT for ${(st.quiet_s ?? 0).toFixed(0)} s - showing its last real pose`
        : st ? `${!real && st.speed ? `${st.speed.toFixed(2)}× speed (both halves wait for the real copy)` : 'live'}${st.last ? ` · ${st.last.replace(/^REAL (copy|robot): /, '')}` : ''}` : 'running';
  return (
    <div className="msrr-split" aria-hidden>
      <div className="msrr-split-line" />
      {building && (
        // the copy is built in the background (20 s on a quiet laptop, up to ~90 s when it is busy): show it is alive
        <div className="msrr-split-loading" role="status">
          <div className="msrr-split-spinner" />
          <div>Building {what}… {(st?.elapsed ?? 0).toFixed(0)} s</div>
          <div className="msrr-split-bar"><div style={{ width: `${Math.min(95, ((st?.elapsed ?? 0) / 40) * 100)}%` }} /></div>
          <div className="msrr-split-hint">the left (ideal) side keeps working meanwhile, a little slower</div>
        </div>
      )}
      <div className="msrr-split-tag msrr-split-tag--left">{ideal ? 'IDEAL · what the sim plans' : 'SIM with errors (random robot + room) · Shapes demo'}</div>
      <div className="msrr-split-tag msrr-split-tag--right">
        {st?.source === 'telemetry'
          ? <><b>REAL robot{st.modules?.length ? ` (${st.modules.join(', ')})` : ''}</b> · its own encoder angles + predicted plastic flex / gear play / lock play; gravity and the floor place it (nothing taken from the ideal side)</>
          : <><b>REAL (sim of the real robot)</b> · random robot #{seed}, sag + gear play + lock play + room, gets exactly what Sync sends</>}
        <div className="msrr-split-status">{status}{st?.feedback && st.feedback.mode !== 'off' ? ` · live correction: ${st.feedback.mode}, off by ${Math.max(0, ...Object.values(st.feedback.err_mm)).toFixed(1)} mm` : ''}</div>
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
  const { tab, manual } = s;
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
  //
  // The Compose tab draws its own structure instead — the one being placed by
  // hand (manualBuild.ts). Same geometry path, same domes, same everything: the
  // point of building by hand is to see what the hardware would really do, so
  // anything drawn specially for it would be worth nothing.
  // Planner v2 draws its own robot (a lock graph + joint angles), never the cubes.
  const v2 = useV2Store.getState();
  const v2On = v2.mode === 'v2';
  const shownModules = v2On ? v2.view.modules : tab === 'compose'
    ? manualToFitted(manual)
    : built
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
  const cells = v2On ? [] : cellsOf(baseConfig);
  syncV2Overlay(st, v2On ? v2.view.overlay : null);
  syncReceivers(st, v2On ? v2.receivers : null);
  // plugs: ALWAYS from the module document's connectors on the drawn parts (the Editor's / Animation's own data and maths);
  // a live session only adds which plug is locked / picked / hovered, and the floor receivers
  syncPorts(st, v2On ? v2.view.modules : null, v2On ? v2.view.sig : -1,
    v2On && v2.manual && v2.physics?.live?.manual && v2.physics.live.id === v2.manual.id ? v2.manual : null);   // dots only while that live session is what is drawn (3 Nov: stopped physics left the old session's dots over another robot)

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
  // The joint angles are part of the signature, not just the pose id. A FITTED
  // module's angles are implied by its pose id and this changes nothing for it;
  // a HAND-BENT one keeps the same id while its joints move, so without this
  // the viewport would quietly ignore every edit made in the Compose tab.
  const sig = shownModules.map((m) => `${m.id}@${key(m.anchorCell)}|${key(m.anchorDir)}|${m.pose.id}`
    + (m.baseQuat ? `|${m.pose.angles.map((a) => a.toFixed(4)).join(',')}` : '')).join(';')
    + `|${justMoved ?? ''}|v2:${v2On ? v2.view.sig : 'off'}`
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

    // Drawn positions are cube units: metres * UNITS_PER_M / MODULINK_CUBE_SIZE (moduleGeometry.ts). Using only UNITS_PER_M
    // gave a 1.42 m module and a score of 132 for the Editor's 278 (31 Oct); this must match the Editor's number.
    st.bodyCentres = [];
    const toM = MODULINK_CUBE_SIZE / UNITS_PER_M;
    const addCentre = (p: readonly number[]) => st.bodyCentres.push([p[0] * toM, p[1] * toM, p[2] * toM]);
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

    const meshGeos = moduleMeshGeometries();
    parts.forEach((g, i) => {
      const highlight = g.moduleId === justMoved || g.moduleId === inFlight?.moduleId;
      const tint = st.builtMats[i % st.builtMats.length];

      // A module standing still is drawn from the REAL try8 meshes, each part
      // riding its own joint. One in flight is drawn as the stick model: the
      // tween interpolates the chain's centreline, not joint angles, so it has
      // no per-part orientation to give a mesh. The two agree at both ends of
      // every move (the module is a mesh before and after), and the stick form
      // is only on screen while it is moving.
      if (g.moduleId !== inFlight?.moduleId) {
        for (const body of moduleBodies(shownModules[i])) {
          addCentre(body.position);
          const geo = meshGeos.get(body.name);
          if (!geo) continue;
          const mat = highlight ? st.mats.moving : partMat(st, body, tint);
          const mesh = nextMesh(geo, mat);
          mesh.position.set(body.position[0], body.position[1], body.position[2]);
          mesh.quaternion.set(body.quaternion[0], body.quaternion[1], body.quaternion[2], body.quaternion[3]);
          mesh.scale.setScalar(1);
        }
        // (no connector domes: Nischay 5 Nov 'remove all these hemispheres' - the plugs, drawn from the module document, show them)
        return;
      }

      for (const rod of g.rods) {
        const mesh = nextMesh(st.rodGeo, highlight ? st.mats.moving : (rod.isSpine ? st.partMats.bigRod : st.partMats.rod));
        setSegment(mesh, rod.from, rod.to, rod.radius);
      }
      for (const j of g.joints) {
        addCentre(j.at);
        // Joints carry the module's own colour, so a chain still reads as
        // separate parts the way the assembly list numbers them.
        const mesh = nextMesh(st.ballGeo, highlight ? st.mats.moving : tint);
        mesh.position.set(j.at[0], j.at[1], j.at[2]);
        mesh.scale.setScalar(j.radius);
        mesh.quaternion.identity();
      }
    });

    for (let i = n; i < st.partPool.length; i++) st.partPool[i].visible = false;
  }

  // Placement preview: where a click would put a cube, or the whole run an
  // in-progress drag would create.
  setPreviewCells(st, v2On ? [] : st.hoverCells as Cell[]);

  // Target ghosts: only the cells that are not already filled, so the ghost shows
  // what is left to do rather than outlining the whole answer.
  // Where the plan really builds it: the target moved and turned as a whole onto the robot.
  const ghostSrc: Cell[] = v2On ? [] : transform?.alignedTarget ?? target;
  const ghostCells: Cell[] = ghostSrc.filter((c) => !baseConfig.occ.has(key(c)));
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
 * Planner v2 marks: the centre of gravity (green when the check passes, red when it
 * fails) with a plumb line to the floor, the support polygon on the floor, the floor
 * contacts and the locks. Rebuilt only when the overlay object changes.
 */
function syncV2Overlay(st: any, ov: import('@/features/msrr2/v2View').V2Overlay | null) {
  if (st.v2OverlaySrc === ov) return;
  st.v2OverlaySrc = ov;
  if (!st.v2Group) { st.v2Group = new THREE.Group(); st.scene.add(st.v2Group); }
  const g: THREE.Group = st.v2Group;
  for (const c of [...g.children]) {
    g.remove(c);
    (c as any).geometry?.dispose?.();
    (c as any).material?.dispose?.();
  }
  if (!ov) return;
  const ball = (p: number[], r: number, color: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 }));
    m.position.set(p[0], p[1], p[2]); m.renderOrder = 10; g.add(m);
  };
  const line = (pts: number[][], color: number, closed = false) => {
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const l = closed ? new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color })) : new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
    l.renderOrder = 9; g.add(l);
  };
  if (ov.com && ov.comFloor) {
    const c = ov.comOk ? 0x2ecc71 : 0xe74c3c;
    ball(ov.com, 0.35, c);
    line([ov.com, ov.comFloor], c);
    ball(ov.comFloor, 0.18, c);
  }
  if (ov.support.length >= 2) line(ov.support, 0xf1c40f, ov.support.length >= 3);
  for (const p of ov.contacts) ball(p, 0.15, 0xf1c40f);
  for (const p of ov.locks) ball(p, 0.2, 0x3498db);
  // the real centre of gravity (the robot sags under its own weight): orange
  if (ov.comSag && ov.com && Math.hypot(ov.comSag[0] - ov.com[0], ov.comSag[1] - ov.com[1], ov.comSag[2] - ov.com[2]) > 0.02) {
    ball(ov.comSag, 0.22, 0xff8c1a);
    line([ov.comSag, [ov.comSag[0], ov.comFloor ? ov.comFloor[1] : 0, ov.comSag[2]]], 0xff8c1a);
  }
  // floor loads: an upward arrow per touching part, length ~ newtons, with its value
  for (const f of ov.contactForces) {
    const h = Math.min(4, 0.3 + f.n * 0.25);
    line([f.p, [f.p[0], f.p[1] + h, f.p[2]]], 0xf1c40f);
    g.add(textSprite(`${f.n.toFixed(1)} N`, [f.p[0], f.p[1] + h + 0.35, f.p[2]]));
  }
}

/** Floor receivers: a disc on the floor at each one (the real part is ~80 mm across, pads 15 mm tall). A receiver that
 *  holds a locked end is drawn solid and labelled, so it is visible WHAT holds the robot up. */
/** Nischay's real floor receiver (floor_receiver.stl, the same file the MuJoCo scene uses), baked once into viewport units:
 *  STL: mm, receiver axis = -Y (back face at y = -0.65, pad tops at y = -15.95), centre x -276.44 / z -5.94, pads at 0/90/180/270 deg
 *  in the X-Z plane, gaps 6.3 mm deep at 45 deg (checked 28 Oct). Viewport: Y up, base on the floor, pads along +X before the yaw. */
let rxGeo: THREE.BufferGeometry | null = null, rxLoading = false;
function floorReceiverGeometry(onLoad: () => void): THREE.BufferGeometry | null {
  if (rxGeo || rxLoading) return rxGeo;
  rxLoading = true;
  fetch(floorReceiverUrl).then((r) => r.arrayBuffer()).then((buf) => {
    const geo = new STLLoader().parse(buf);
    const k = 0.001 * CUBES_PER_METRE;
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(276.44, 0.65, 5.94));          // centre on the axis, back face at 0
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));                         // receiver axis -Y -> +Y (up)
    geo.applyMatrix4(new THREE.Matrix4().makeScale(k, k, k));
    geo.computeVertexNormals(); rxGeo = geo; onLoad();
  }).catch(() => { rxLoading = false; });
  return null;
}

function syncReceivers(st: any, list: import('@/features/msrr2/physicsView').ReceiverMark[] | null) {
  if (st.rcvSrc === list) return;
  st.rcvSrc = list;
  if (!st.rcvGroup) { st.rcvGroup = new THREE.Group(); st.scene.add(st.rcvGroup); }
  const g: THREE.Group = st.rcvGroup;
  for (const c of [...g.children]) { g.remove(c); (c as any).geometry?.dispose?.(); (c as any).material?.dispose?.(); }
  if (!list) return;
  const R = 0.04 * CUBES_PER_METRE, H = 0.0153 * CUBES_PER_METRE;
  // labels sit on the floor just outside each receiver, pointing away from the middle of the receivers in use:
  // a module standing in a receiver hides anything placed above it (the old label sat right behind it)
  const cx = list.reduce((a, r) => a + r.p[0], 0) / Math.max(1, list.length), cz = list.reduce((a, r) => a + r.p[2], 0) / Math.max(1, list.length);
  const rx = floorReceiverGeometry(() => { st.rcvSrc = null; });          // the real STL (async): redraw once it has loaded
  for (const r of list) {
    const mat = new THREE.MeshStandardMaterial({ color: r.locked ? 0x2f80ed : 0x8a94a6, transparent: !r.locked, opacity: r.locked ? 1 : 0.7, metalness: 0.1, roughness: 0.6 });
    const mesh = rx ? new THREE.Mesh(rx, mat) : new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 32), mat);
    if (rx) { mesh.position.set(r.p[0], r.p[1], r.p[2]); mesh.rotation.y = ((r.yawDeg + 45) * Math.PI) / 180; }   // pads at yaw ± 45 (x = a gap)
    else mesh.position.set(r.p[0], r.p[1] + H / 2, r.p[2]);
    g.add(mesh);
    if (r.locked) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.25, R * 0.12, 8, 40), new THREE.MeshBasicMaterial({ color: 0x2ecc71 })); ring.rotation.x = Math.PI / 2; ring.position.set(r.p[0], r.p[1] + H, r.p[2]); g.add(ring); }
    let dx = r.p[0] - cx, dz = r.p[2] - cz; const dn = Math.hypot(dx, dz);
    if (dn < 1e-6) { dx = 0; dz = 1; } else { dx /= dn; dz /= dn; }
    const out = R * 2.6;
    g.add(textSprite(r.label, [r.p[0] + dx * out, r.p[1] + H + 0.12, r.p[2] + dz * out], 0.022));
  }
}

/** MANUAL tab: every connector of the live session, drawn with the SAME marker as every other viewport (ConnectorRenderer's
 *  buildConnectorMarker: dot, crosshair, outward arrow); hover it for its menu, click it in connect mode. Locked = green,
 *  picked / hovered = yellow. Markers are kept and only moved each frame; rebuilt when their colour changes. */
function syncPorts(st: any, modules: FittedModule[] | null, viewSig: number, man: ManualState | null) {
  if (!st.portGroup) { st.portGroup = new THREE.Group(); st.scene.add(st.portGroup); st.portNodes = new Map(); }
  const g: THREE.Group = st.portGroup; const nodes: Map<string, { node: THREE.Group; col: number }> = st.portNodes;
  const sig = `${viewSig}|${man ? `${man.pick.join(',')}|${man.hover?.id ?? ''}|${man.mode}|${man.ports.map((p) => p.locked ?? '').join(',')}` : ''}|${modules?.length ?? 0}`;
  if (st.portSig === sig && st.portSrc === man?.ports) return;
  st.portSig = sig; st.portSrc = man?.ports;
  g.visible = !st.portsHidden;
  const drop = (id: string) => { const n = nodes.get(id)!; g.remove(n.node); n.node.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose(); }); nodes.delete(id); };
  const seen = new Set<string>();
  const state = new Map((man?.ports ?? []).map((p) => [p.id, p]));
  const colour = (id: string) => (man && (man.pick.includes(id) || man.hover?.id === id) ? CONNECTOR_SEL_COLOR : state.get(id)?.locked ? 0x2ecc71 : CONNECTOR_COLOR);
  const place = (id: string, pose: { position: THREE.Vector3; normal: THREE.Vector3; roll?: THREE.Vector3 | null }, len: number) => {
    const col = colour(id); seen.add(id); const had = nodes.get(id);
    if (had && had.col === col) { had.node.position.copy(pose.position); orientConnectorMarker(had.node, pose); return; }
    if (had) drop(id);
    const node = buildConnectorMarker(pose, len, col); node.userData.port = id;
    nodes.set(id, { node, col }); g.add(node);
  };
  // module plugs: each drawn part's own connectors from the module document, through connectorSnap's maths. The part's matrix
  // = its drawn pose x the mesh bake (moduleMeshes: Studio frame -> model frame, metres -> cubes), so the plug rides the mesh.
  const conns = restConnectors(); const bake = new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion(...STUDIO_TO_MODEL_QUAT), new THREE.Vector3(CUBES_PER_METRE, CUBES_PER_METRE, CUBES_PER_METRE));
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), ONE = new THREE.Vector3(1, 1, 1);
  for (const m of modules ?? []) for (const b of moduleBodies(m)) {
    const c = conns.get(b.name); if (!c) continue;
    M.compose(P.set(b.position[0], b.position[1], b.position[2]), Q.set(b.quaternion[0], b.quaternion[1], b.quaternion[2], b.quaternion[3]), ONE).multiply(bake);
    for (const con of c.connectors) place(`${m.id}.${portOfConnector(con.id)}`, connectorWorldFrom(con, M), connectorMarkerLength(c.body) * CUBES_PER_METRE);
  }
  // floor receivers have no module part: their plugs come from the session
  for (const p of man?.ports ?? []) {
    if (p.kind !== 'floor') continue;
    const v = toView([p.p[0], p.p[1], p.p[2]]), w = toView([p.p[0] + p.n[0], p.p[1] + p.n[1], p.p[2] + p.n[2]]);
    place(p.id, { position: new THREE.Vector3(v[0], v[1], v[2]), normal: new THREE.Vector3(w[0] - v[0], w[1] - v[1], w[2] - v[2]).normalize() }, 0.03 * CUBES_PER_METRE);
  }
  for (const id of [...nodes.keys()]) if (!seen.has(id)) drop(id);
}

/** the module document's connector id -> the port name the physics and planner use (conn-endA -> A, conn-s1a -> S1A) */
const portOfConnector = (id: string) => id.replace(/^conn-/, '').replace(/^end/, '').toUpperCase();

/** a label that always faces the camera and is drawn on top; the canvas is sized to the text so nothing is cut off */
/** a label that keeps ONE size on screen at any zoom (Nischay 5 Nov: zoomed in, the receiver labels filled the view):
 *  `screen` = its height as a share of the view's height-ish (sizeAttenuation off) */
function textSprite(text: string, p: number[], screen = 0.026): THREE.Sprite {
  const font = 'bold 34px sans-serif';
  const m = document.createElement('canvas').getContext('2d')!; m.font = font;
  const w = Math.ceil(m.measureText(text).width) + 24, h = 64;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(20,24,32,0.75)'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#ffd34d'; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true, sizeAttenuation: false }));
  // the MSRR root group is scaled 1/UNITS_PER_M (cubes -> metres) and that scale applies to a screen-sized sprite too
  // (5 Nov: the labels came out an 'ant', 5.5x too small) - undo it
  const k = screen * UNITS_PER_M;
  sp.position.set(p[0], p[1], p[2]); sp.scale.set(k * w / h, k, 1); sp.renderOrder = 11;
  return sp;
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
