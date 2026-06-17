# TETROBOT — files & interop

## `.nischay` — native project file (the editable source of truth)

A **binary, encrypted** container holding the full scene: every module's joint
angles, fixed root, world transform and mode, plus all welds (with their rigid
`mate` matrices) and the active module. The JSON below is the **decrypted**
structure — on disk the file is a `NSHCRY` binary blob (a SHA-256 keystream
cipher keyed by an app secret + per-file salt), so a text editor shows only
gibberish and only the TETROBOT app / this add-on can read it. See
`frontend/src/persistence/codec.js` and `decode_nischay()` below for the scheme.

> Honest note: the key ships inside client code, so this is strong app-locking /
> obfuscation, not unbreakable DRM (impossible for any client-side format).

```jsonc
{
  "format": "tetrobot-project",
  "version": 1,
  "savedAt": "2026-…",
  "scene": {
    "activeModuleId": "module-0",
    "nextId": 3,
    "modules": [
      { "id": "module-0", "label": "Module 1",
        "angles": [0,0,0,0,0,0], "activeRootId": "R1",
        "position": {"x":0,"y":0,"z":0},
        "quaternion": {"x":0,"y":0,"z":0,"w":1},
        "mode": "horizontal" }
    ],
    "welds": [
      { "a": {"moduleId":"module-0","faceKey":"R7_outer"},
        "b": {"moduleId":"module-1","faceKey":"R1_outer"},
        "mate": [/* 16 numbers — relative face transform */] }
    ]
  }
}
```

In the app: **left panel → PROJECT → Open / Save**. Work also auto-saves to the
browser (localStorage), so a reload never loses anything.

## Opening in other 3D software

There is no single file that is both perfectly-editable-in-our-app *and* natively
opens in Blender/Fusion — so there are two paths:

- **GLB** (left panel → PROJECT → **Export GLB**): a portable model snapshot of
  the current pose. Opens in Blender (File → Import → glTF) and most viewers.
  Geometry + pose only, not editable kinematics.
- **`blender_tetrobot_import.py`** (this folder): a Blender add-on that reads a
  `.nischay` file directly and rebuilds the rods/joints by replaying the same
  forward-kinematics — so our own format opens natively in Blender.

### Installing the Blender add-on
Blender → Edit → Preferences → Add-ons → Install… → pick
`blender_tetrobot_import.py` → enable **"Import-Export: TETROBOT Project
(.nischay)"**. Then: **File → Import → TETROBOT Project (.nischay)**.

> Keep the geometry constants at the top of the add-on in sync with
> `frontend/src/store/armStore.js` if rod dimensions ever change.

Fusion 360 has no `.nischay` reader; for CAD use a STEP export (not yet
implemented) rather than GLB.
