/**
 * make-icons.cjs — regenerate the TETROBOT app icons from a source PNG.
 *
 * Source: scripts/icon-source.png (1024×1024, transparent — the gold star).
 * Outputs (into electron/, which is both git-tracked and packaged at runtime):
 *   electron/icon.ico  — multi-resolution Windows icon (exe, installer, window)
 *   electron/icon.png  — 512×512 PNG (Linux / fallback)
 *
 * Run:  node scripts/make-icons.cjs
 * Requires: sharp, png-to-ico (devDependencies).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const _ptiMod = require('png-to-ico');
const pngToIco = _ptiMod.default || _ptiMod;

const SRC = path.join(__dirname, 'icon-source.png');
const OUT_DIR = path.join(__dirname, '..', 'electron');
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error('Source not found:', SRC);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // High-quality downscaled PNG buffers for each ICO size.
  const pngBuffers = await Promise.all(
    ICO_SIZES.map((s) =>
      sharp(SRC).resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    )
  );

  const ico = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico);

  await sharp(SRC).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(path.join(OUT_DIR, 'icon.png'));

  console.log('Wrote electron/icon.ico (' + ICO_SIZES.join(',') + ') and electron/icon.png (512)');
})().catch((e) => { console.error(e); process.exit(1); });
