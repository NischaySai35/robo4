/**
 * terrain — a rough, stony "road" heightfield shared by physics and rendering.
 *
 * The wheels were slipping on a glass-flat floor. A bumpy heightfield gives them geometry to
 * grip/catch on (real traction). Generates one height grid meant to back BOTH a physics
 * heightfield collider (so the physics surface is the bumps) and a matching THREE mesh (so
 * what you see IS what you collide with) — the collider side isn't wired up yet (DynamicSim
 * still falls back to a flat ground plane, see its KNOWN GAP note); this module only produces
 * the data + the visual mesh today.
 *
 * Index convention: collider heights[y + (n+1)*x] <-> mesh vertex (x + (n+1)*y), a deliberate
 * transpose — kept stable so whichever physics engine eventually consumes this data doesn't
 * need the mesh side to change.
 */
import * as THREE from 'three';

export interface Terrain {
  n: number;          // subdivisions per side (grid is (n+1)×(n+1) vertices)
  size: number;       // extent in X and Z (metres)
  amplitude: number;  // peak-to-peak bump height (metres) = heightfield scale.y
  heights: Float32Array; // centred ~[-0.5,0.5], collider-indexed (y + (n+1)*x)
}

// Cheap hashed value-noise with a few octaves → craggy, stony road.
function makeNoise(seed: number) {
  const rand = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const vnoise = (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const a = rand(x0, y0), b = rand(x0 + 1, y0), c = rand(x0, y0 + 1), d = rand(x0 + 1, y0 + 1);
    const u = smooth(fx), v = smooth(fy);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  return (x: number, y: number) => {
    let f = 0, amp = 0.5, freq = 1;
    for (let o = 0; o < 4; o++) { f += amp * vnoise(x * freq, y * freq); freq *= 2.13; amp *= 0.5; }
    return f; // ~[0,1]
  };
}

/** Generate a rough-road heightfield. `bumps` = roughly how many bumps span the terrain. */
export function generateTerrain(n: number, size: number, amplitude: number, seed = 1, bumps = 14): Terrain {
  const noise = makeNoise(seed);
  const heights = new Float32Array((n + 1) * (n + 1));
  for (let x = 0; x <= n; x++) {
    for (let y = 0; y <= n; y++) {
      const h = noise((x / n) * bumps, (y / n) * bumps) - 0.5; // centre around 0
      heights[y + (n + 1) * x] = h; // collider (Rapier) index
    }
  }
  return { n, size, amplitude, heights };
}

/** A THREE mesh whose surface exactly matches the heightfield collider (stony look). */
export function buildTerrainMesh(t: Terrain): THREE.Mesh {
  const { n, size, amplitude, heights } = t;
  const geo = new THREE.PlaneGeometry(size, size, n, n);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let x = 0; x <= n; x++) {
    for (let y = 0; y <= n; y++) {
      const vert = x + (n + 1) * y;           // mesh index (transpose of collider index)
      pos.setZ(vert, heights[y + (n + 1) * x] * amplitude);
    }
  }
  geo.rotateX(-Math.PI / 2);                    // lay flat: local +Z becomes world +Y (height)
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a3733, roughness: 1, metalness: 0, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
