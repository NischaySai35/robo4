"""
TETROBOT .tetrobot importer for Blender
=======================================

Reconstructs a TETROBOT project (modules, joints, welds, poses) natively inside
Blender by replaying the same forward-kinematics the web app uses. Each module
becomes a collection of rod / joint / endcap meshes placed at their solved world
transforms.

Install:
  Blender → Edit → Preferences → Add-ons → Install… → pick this file → enable
  "Import-Export: TETROBOT Project (.nischay)".

Use:
  File → Import → TETROBOT Project (.nischay)

(Or run this file from Blender's Text Editor to register it for the session.)

This mirrors frontend/src/three/RobotFK.js and store/armStore.js. Keep the
constants below in sync if the rod dimensions ever change.
"""

bl_info = {
    "name": "TETROBOT Project (.nischay)",
    "author": "TETROBOT",
    "version": (1, 0, 0),
    "blender": (2, 93, 0),
    "location": "File > Import > TETROBOT Project (.nischay)",
    "description": "Import a TETROBOT modular-arm project (.nischay) and rebuild its geometry",
    "category": "Import-Export",
}

import hashlib
import json
import math
import struct

import bpy
from mathutils import Matrix, Quaternion, Vector
from bpy_extras.io_utils import ImportHelper
from bpy.props import StringProperty
from bpy.types import Operator

# ── Geometry constants (mirror armStore.js) ─────────────────────────────────────
ROD_RADIUS   = 0.07
JOINT_RADIUS = 0.13
ENDCAP_SIZE  = 0.36
ROD_LENGTHS  = {"R2": 1.341, "R3": 1.285, "R4": 1.060, "R5": 0.803, "R6": 1.341}
ROD_IDS      = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]

# id, type, bodyA, bodyB
JOINT_DEFS = [
    ("J1", "twist", "R1", "R2"),
    ("J2", "bend",  "R2", "R3"),
    ("J3", "bend",  "R3", "R4"),
    ("J4", "twist", "R4", "R5"),
    ("J5", "bend",  "R5", "R6"),
    ("J6", "twist", "R6", "R7"),
]


def rod_len(rod_id):
    if rod_id in ("R1", "R7"):
        return ENDCAP_SIZE
    return ROD_LENGTHS.get(rod_id, 1.2)


# ── .nischay decryption (mirror of frontend/src/persistence/codec.js) ───────────
_NSHCRY_PASS  = b"TETROBOT::nischay::v2::format-key::do-not-redistribute"
_NSHCRY_MAGIC = b"NSHCRY"


def _keystream(key, length):
    out = bytearray()
    n = 0
    while len(out) < length:
        out += hashlib.sha256(key + struct.pack(">I", n)).digest()
        n += 1
    return bytes(out[:length])


def decode_nischay(raw):
    """Decode .nischay bytes → project dict (supports legacy plain-JSON too)."""
    if not raw:
        raise ValueError("Empty file.")
    if raw[:1] in (b"{", b" ", b"\n", b"\t") or raw[:3] == b"\xef\xbb\xbf":
        return json.loads(raw.decode("utf-8"))
    if len(raw) < 24 or raw[:6] != _NSHCRY_MAGIC:
        raise ValueError("Not a TETROBOT .nischay file.")
    salt = raw[8:24]
    ct = raw[24:]
    key = hashlib.sha256(_NSHCRY_PASS + salt).digest()
    ks = _keystream(key, len(ct))
    pt = bytes(c ^ k for c, k in zip(ct, ks))
    return json.loads(pt.decode("utf-8"))


# ── Forward kinematics (mirror RobotFK._traverseFrom) ───────────────────────────
def solve_module(angles, root_id, mode, module_matrix):
    """Return (rod_frames, joint_world_pos).

    rod_frames[id] = 4x4 world matrix of the rod's pivot frame (origin at the
    rod's x=0 end, +X along the rod). joint_world_pos[id] = Vector.
    """
    rod_frames = {root_id: module_matrix.copy()}
    joint_pos = {}
    visited = {root_id}

    def traverse(current, current_frame):
        for i, (jid, jtype, a, b) in enumerate(JOINT_DEFS):
            fwd = a == current
            bwd = b == current
            if not (fwd or bwd):
                continue
            child = b if fwd else a
            if child in visited:
                continue
            visited.add(child)

            pivot_local = Matrix.Translation((rod_len(current), 0, 0)) if fwd else Matrix.Identity(4)
            angle = angles[i] if i < len(angles) else 0.0
            if jtype == "twist":
                rot = Matrix.Rotation(angle, 4, 'X')
            elif mode == "vertical":
                rot = Matrix.Rotation(angle, 4, 'Z')
            else:
                rot = Matrix.Rotation(angle, 4, 'Y')

            pivot_frame = current_frame @ pivot_local @ rot
            joint_pos[jid] = (current_frame @ pivot_local).to_translation()

            child_local = Matrix.Identity(4) if fwd else Matrix.Translation((-rod_len(child), 0, 0))
            child_frame = pivot_frame @ child_local
            rod_frames[child] = child_frame
            traverse(child, child_frame)

    traverse(root_id, rod_frames[root_id])
    return rod_frames, joint_pos


# ── Mesh helpers ────────────────────────────────────────────────────────────────
def _get_mat(name, rgba):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = rgba
            if "Metallic" in bsdf.inputs:
                bsdf.inputs["Metallic"].default_value = 0.6
            if "Roughness" in bsdf.inputs:
                bsdf.inputs["Roughness"].default_value = 0.4
    return mat


def _link(obj, coll, mat):
    if mat:
        obj.data.materials.append(mat)
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)


def _add_rod(coll, frame, length, mat):
    bpy.ops.mesh.primitive_cylinder_add(radius=ROD_RADIUS, depth=length, vertices=6)
    obj = bpy.context.active_object
    # cylinder is along +Z centered at origin → along +X spanning [0, length]
    local = Matrix.Translation((length / 2.0, 0, 0)) @ Matrix.Rotation(math.radians(90), 4, 'Y')
    obj.matrix_world = frame @ local
    _link(obj, coll, mat)
    return obj


def _add_endcap(coll, frame, mat):
    bpy.ops.mesh.primitive_cube_add(size=ENDCAP_SIZE)
    obj = bpy.context.active_object
    obj.matrix_world = frame @ Matrix.Translation((ENDCAP_SIZE / 2.0, 0, 0))
    _link(obj, coll, mat)
    return obj


def _add_cuboid(coll, frame, mat):
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    obj = bpy.context.active_object
    scale = Matrix.Diagonal((ENDCAP_SIZE, ENDCAP_SIZE, ENDCAP_SIZE * 2, 1.0))
    obj.matrix_world = frame @ Matrix.Translation((rod_len("R3") / 2.0, 0, 0)) @ scale
    _link(obj, coll, mat)
    return obj


def _add_joint(coll, pos, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=JOINT_RADIUS, location=pos)
    obj = bpy.context.active_object
    _link(obj, coll, mat)
    return obj


# ── Build one module ────────────────────────────────────────────────────────────
def build_module(mod, parent_coll, mats):
    pos = mod.get("position", {})
    q = mod.get("quaternion", {})
    module_matrix = (
        Matrix.Translation((pos.get("x", 0.0), pos.get("y", 0.0), pos.get("z", 0.0)))
        @ Quaternion((q.get("w", 1.0), q.get("x", 0.0), q.get("y", 0.0), q.get("z", 0.0))).to_matrix().to_4x4()
    )

    angles = mod.get("angles", [0.0] * 6)
    root_id = mod.get("activeRootId", "R1")
    mode = mod.get("mode", "horizontal")

    rod_frames, joint_pos = solve_module(angles, root_id, mode, module_matrix)

    coll = bpy.data.collections.new(mod.get("label", mod.get("id", "Module")))
    parent_coll.children.link(coll)

    for rid in ROD_IDS:
        frame = rod_frames.get(rid)
        if frame is None:
            continue
        if rid in ("R1", "R7"):
            _add_endcap(coll, frame, mats["endcap"])
        else:
            _add_rod(coll, frame, rod_len(rid), mats["rod"])
            if rid == "R3":
                _add_cuboid(coll, frame, mats["rod"])

    for _jid, pos_v in joint_pos.items():
        _add_joint(coll, pos_v, mats["joint"])

    return coll


# ── Importer operator ───────────────────────────────────────────────────────────
class IMPORT_OT_tetrobot(Operator, ImportHelper):
    bl_idname = "import_scene.tetrobot"
    bl_label = "Import TETROBOT Project"
    bl_options = {"REGISTER", "UNDO"}

    filename_ext = ".nischay"
    filter_glob: StringProperty(default="*.nischay;*.json", options={"HIDDEN"})

    def execute(self, context):
        try:
            with open(self.filepath, "rb") as f:
                data = decode_nischay(f.read())
        except Exception as e:  # noqa: BLE001
            self.report({"ERROR"}, f"Could not read file: {e}")
            return {"CANCELLED"}

        if data.get("format") != "tetrobot-project":
            self.report({"ERROR"}, "Not a TETROBOT project file.")
            return {"CANCELLED"}

        scene = data.get("scene", {})
        modules = scene.get("modules", [])
        if not modules:
            self.report({"ERROR"}, "Project contains no modules.")
            return {"CANCELLED"}

        mats = {
            "rod":    _get_mat("TETRO_Rod",    (0.48, 0.56, 0.67, 1.0)),
            "joint":  _get_mat("TETRO_Joint",  (0.87, 0.40, 0.00, 1.0)),
            "endcap": _get_mat("TETRO_Endcap", (0.79, 0.63, 0.13, 1.0)),
        }

        root_coll = bpy.data.collections.new(f"TETROBOT ({len(modules)} modules)")
        context.scene.collection.children.link(root_coll)

        for mod in modules:
            build_module(mod, root_coll, mats)

        self.report({"INFO"}, f"Imported {len(modules)} module(s).")
        return {"FINISHED"}


def _menu(self, context):
    self.layout.operator(IMPORT_OT_tetrobot.bl_idname, text="TETROBOT Project (.nischay)")


def register():
    bpy.utils.register_class(IMPORT_OT_tetrobot)
    bpy.types.TOPBAR_MT_file_import.append(_menu)


def unregister():
    bpy.types.TOPBAR_MT_file_import.remove(_menu)
    bpy.utils.unregister_class(IMPORT_OT_tetrobot)


if __name__ == "__main__":
    register()
