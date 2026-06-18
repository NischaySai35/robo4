import { create } from 'zustand';

const makeModule = (id, label, pos = { x: 0, y: 0, z: 0 }) => ({
  id,
  label,
  angles: [0, 0, 0, 0, 0, 0],
  activeRootId: 'R1',
  position:   { x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0 },
  quaternion: { x: 0, y: 0, z: 0, w: 1 },
  mode: 'horizontal',
});

export const useMultiStore = create((set, get) => ({
  // Start EMPTY — the legacy 6-servo arm is no longer created by default. Build
  // with the model (primitives / imported STL) or add a module explicitly.
  modules: [],
  activeModuleId: null,
  nextId: 1,   // next numeric suffix for new module ids (serialized in project files)

  // Welds — rigid joins between two module faces. Each: { a, b, mate:number[16] }
  // where a/b = { moduleId, faceKey }. Modules sharing welds form one assembly.
  welds: [],

  // Update a (follower) module's joint angles — used by cross-module IK to drive
  // joints in modules other than the active one.
  setModuleAngles(id, angles) {
    set(s => ({
      modules: s.modules.map(m =>
        m.id === id ? { ...m, angles: [...angles] } : m,
      ),
    }));
  },

  // Lightweight world-transform update for a single module (used by rigid-follow
  // propagation to persist follower placements after a drag).
  setModuleTransform(id, position, quaternion) {
    set(s => ({
      modules: s.modules.map(m =>
        m.id === id
          ? { ...m,
              position:   { x: position.x,   y: position.y,   z: position.z },
              quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
            }
          : m,
      ),
    }));
  },

  // Connect-mode face selection
  connectMode:   false,
  face1:         null,   // { moduleId, faceKey }
  face2:         null,
  connectError:  null,

  // Delete-mode: user clicks a module in the viewport to delete it
  deleteMode: false,
  setDeleteMode(active) {
    set({ deleteMode: active });
  },

  // Disconnect-mode module selection
  disconnectMode: false,
  dSel1:          null,   // moduleId of first selected module
  dSel2:          null,   // moduleId of second selected module
  disconnectError: null,

  // Delete a module — all may be removed (empty scene is allowed).
  removeModule(id) {
    const { modules, activeModuleId, welds } = get();
    const remaining = modules
      .filter(m => m.id !== id)
      .map((m, i) => ({ ...m, label: `Module ${i + 1}` })); // renumber
    const newActive = activeModuleId === id ? (remaining[0]?.id ?? null) : activeModuleId;
    // Drop any weld touching the removed module
    const keptWelds = welds.filter(w => w.a.moduleId !== id && w.b.moduleId !== id);
    set({ modules: remaining, activeModuleId: newActive, welds: keptWelds });
  },

  // addModule(spawnPos?) — spawnPos comes from SimCanvas (live world bounds of all
  // modules) so the new module never lands inside an existing one, regardless of
  // how modules have been joined/repositioned. Falls back to z-slot logic if no
  // live placement is available (e.g. before the scene has mounted).
  addModule(spawnPos = null) {
    const current = get().modules;
    let pos;
    if (spawnPos && typeof spawnPos.z === 'number') {
      pos = { x: spawnPos.x ?? 0, y: spawnPos.y ?? 0, z: spawnPos.z };
    } else {
      const usedSlots = new Set(current.map(m => Math.round(m.position.z / 4)));
      let slot = 0;
      while (usedSlots.has(slot)) slot++;
      pos = { x: 0, y: 0, z: slot * 4.0 };
    }
    const nid   = get().nextId;
    const id    = `module-${nid}`;
    const label = `Module ${current.length + 1}`;
    set(s => ({
      modules: [...s.modules, makeModule(id, label, pos)],
      nextId: s.nextId + 1,
      // If nothing was active (e.g. first module, or all were deleted), make this
      // the active module so the viewport always has a live FK to hover/drag.
      activeModuleId: s.activeModuleId ?? id,
    }));
    return id;
  },

  setActiveModule(id) {
    set({ activeModuleId: id });
  },

  // Called when switching away from a module to persist its live Three.js state
  saveModuleState(id, { angles, activeRootId, position, quaternion, mode }) {
    set(s => ({
      modules: s.modules.map(m =>
        m.id === id ? { ...m, angles, activeRootId, position, quaternion, mode } : m,
      ),
    }));
  },

  setConnectMode(active) {
    set({ connectMode: active, face1: null, face2: null, connectError: null });
  },

  setDisconnectMode(active) {
    set({ disconnectMode: active, dSel1: null, dSel2: null, disconnectError: null });
  },
  setDSel1(id)          { set({ dSel1: id, disconnectError: null }); },
  setDSel2(id)          { set({ dSel2: id, disconnectError: null }); },
  clearDSelections()    { set({ dSel1: null, dSel2: null, disconnectError: null }); },
  setDisconnectError(m) { set({ disconnectError: m }); },

  // Remove every weld, home all joints, and lay modules out fresh (z-slots, upright).
  disconnectAll() {
    set(s => ({
      welds: [],
      modules: s.modules.map((m, i) => ({
        ...m,
        angles:     [0, 0, 0, 0, 0, 0],
        position:   { x: 0, y: 0, z: i * 4.0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      })),
      disconnectMode: false, dSel1: null, dSel2: null, disconnectError: null,
    }));
  },

  // Move moduleId back to the first unoccupied z-slot, reset quaternion, and
  // remove any welds directly joining it to the first-selected module.
  applyDisconnect(moduleId) {
    set(s => {
      const usedSlots = new Set(
        s.modules.filter(m => m.id !== moduleId).map(m => Math.round(m.position.z / 4))
      );
      let slot = 0;
      while (usedSlots.has(slot)) slot++;
      const other = s.dSel1;
      const keptWelds = s.welds.filter(w => {
        const pair = new Set([w.a.moduleId, w.b.moduleId]);
        return !(pair.has(moduleId) && pair.has(other));
      });
      return {
        modules: s.modules.map(m =>
          m.id === moduleId
            ? { ...m,
                position:   { x: 0, y: 0, z: slot * 4.0 },
                quaternion: { x: 0, y: 0, z: 0, w: 1  },
              }
            : m,
        ),
        welds: keptWelds,
        disconnectMode: false,
        dSel1: null,
        dSel2: null,
        disconnectError: null,
      };
    });
  },

  setFace1(info)  { set({ face1: info,  connectError: null }); },
  setFace2(info)  { set({ face2: info,  connectError: null }); },
  clearFaces()    { set({ face1: null,  face2: null, connectError: null }); },
  setConnectError(msg) { set({ connectError: msg }); },

  // Record the weld and exit connect mode. Module world transforms are applied
  // imperatively (and persisted via setModuleTransform) by performJoin, since a
  // whole sub-assembly may move. `weld` = { a, b, mate } (may be null).
  applyJoin(weld = null) {
    set(s => {
      let welds = s.welds;
      if (weld) {
        // Replace any existing weld between the same two modules, then add this one
        welds = s.welds.filter(w => {
          const wp = new Set([w.a.moduleId, w.b.moduleId]);
          return !(wp.has(weld.a.moduleId) && wp.has(weld.b.moduleId));
        });
        welds = [...welds, weld];
      }
      return {
        welds,
        connectMode: false,
        face1: null,
        face2: null,
        connectError: null,
      };
    });
  },
}));
