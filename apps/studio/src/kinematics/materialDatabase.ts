/**
 * Engineering material properties database.
 *
 * Used by analysis.ts to compute von Mises stress and structural safety factor.
 * Material is matched against the body's material name (case-insensitive
 * substring match) from the Document's materials record.
 *
 * FoS (factor of safety) = yieldStrength / σ_vonMises
 *
 * Industrial thresholds:
 *   FoS > 3   : adequate (static loading, well-designed)
 *   FoS 2–3   : acceptable (common for controlled environments)
 *   FoS 1.5–2 : marginal — review geometry or reduce load
 *   FoS < 1.5 : critical — failure imminent
 *   FoS < 1.0 : yielding already occurring
 */

export interface MaterialProps {
  id: string;
  name: string;
  yieldStrength: number;    // Pa (0.2% proof stress for metals)
  ultimateStrength: number; // Pa
  youngsModulus: number;    // Pa (elastic modulus)
  density: number;          // kg/m³ (reference — Document density overrides this)
  fatigueLimitRatio: number;// σ_endurance / σ_ultimate (rotating beam, R=-1)
  poissonRatio: number;
}

export const MATERIAL_DB: MaterialProps[] = [
  // ── Aluminium alloys ──────────────────────────────────────────────────────
  {
    id: 'al6061', name: 'Aluminium 6061-T6',
    yieldStrength: 276e6, ultimateStrength: 310e6,
    youngsModulus: 68.9e9, density: 2700, fatigueLimitRatio: 0.40, poissonRatio: 0.33,
  },
  {
    id: 'al7075', name: 'Aluminium 7075-T6',
    yieldStrength: 503e6, ultimateStrength: 572e6,
    youngsModulus: 71.7e9, density: 2810, fatigueLimitRatio: 0.38, poissonRatio: 0.33,
  },
  // ── Steel ─────────────────────────────────────────────────────────────────
  {
    id: 'steel4140', name: 'Steel 4140 (Q+T, 900°C)',
    yieldStrength: 655e6, ultimateStrength: 1020e6,
    youngsModulus: 210e9, density: 7850, fatigueLimitRatio: 0.46, poissonRatio: 0.29,
  },
  {
    id: 'ss316', name: 'Stainless 316L',
    yieldStrength: 310e6, ultimateStrength: 620e6,
    youngsModulus: 193e9, density: 7990, fatigueLimitRatio: 0.40, poissonRatio: 0.28,
  },
  // ── Titanium ──────────────────────────────────────────────────────────────
  {
    id: 'titanium', name: 'Titanium Ti-6Al-4V',
    yieldStrength: 880e6, ultimateStrength: 950e6,
    youngsModulus: 113.8e9, density: 4430, fatigueLimitRatio: 0.50, poissonRatio: 0.34,
  },
  // ── Composites ────────────────────────────────────────────────────────────
  {
    id: 'carbon', name: 'CFRP (woven T300, quasi-isotropic)',
    yieldStrength: 600e6, ultimateStrength: 800e6,
    youngsModulus: 70e9, density: 1600, fatigueLimitRatio: 0.55, poissonRatio: 0.10,
  },
  // ── FDM polymers (as-printed, 100% infill — actual is lower) ─────────────
  {
    id: 'pla', name: 'PLA (FDM)',
    yieldStrength: 50e6, ultimateStrength: 65e6,
    youngsModulus: 3.5e9, density: 1240, fatigueLimitRatio: 0.30, poissonRatio: 0.36,
  },
  {
    id: 'petg', name: 'PETG (FDM)',
    yieldStrength: 50e6, ultimateStrength: 53e6,
    youngsModulus: 2.2e9, density: 1270, fatigueLimitRatio: 0.28, poissonRatio: 0.38,
  },
  {
    id: 'abs', name: 'ABS (FDM)',
    yieldStrength: 40e6, ultimateStrength: 45e6,
    youngsModulus: 2.3e9, density: 1050, fatigueLimitRatio: 0.25, poissonRatio: 0.35,
  },
  // ── Engineering plastics ─────────────────────────────────────────────────
  {
    id: 'nylon', name: 'Nylon PA6 (dry)',
    yieldStrength: 70e6, ultimateStrength: 75e6,
    youngsModulus: 3.0e9, density: 1140, fatigueLimitRatio: 0.35, poissonRatio: 0.39,
  },
];

// Keyword → material id patterns; first match wins (order matters — more specific first)
const PATTERNS: [RegExp, string][] = [
  [/7075/i,                                  'al7075'],
  [/6061/i,                                  'al6061'],
  [/al(?:umini?um)?|alum|alloy.*al|al.*alloy/i, 'al6061'],
  [/steel.*4140|4140.*steel/i,               'steel4140'],
  [/stainless|ss.*316|316.*ss|inox/i,        'ss316'],
  [/steel|mild|iron/i,                       'steel4140'],
  [/titan/i,                                 'titanium'],
  [/carbon|cfrp|cf.*re?in|composite/i,       'carbon'],
  [/petg/i,                                  'petg'],
  [/pla/i,                                   'pla'],
  [/abs/i,                                   'abs'],
  [/nylon|poly.?amide|pa\s*\d/i,             'nylon'],
];

const BY_ID = new Map(MATERIAL_DB.map((m) => [m.id, m]));

/** Match a material name string (from doc.materials) to engineering properties. */
export function getMaterialProps(name: string): MaterialProps {
  for (const [re, id] of PATTERNS) {
    if (re.test(name)) return BY_ID.get(id)!;
  }
  // Conservative default: PLA (most common for 3D-printed hobby robots)
  return BY_ID.get('pla')!;
}

export { BY_ID as MATERIAL_BY_ID };
