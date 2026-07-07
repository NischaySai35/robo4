const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SHOT_DIR = 'D:/robo4/.scratch2';
const PROJECT_FILE = 'C:/Users/HP/Downloads/try1.nischay';
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

function extractCoM(text) {
  const m = text.match(/CoM X\s*([\-\d.]+)\s*m[\s\S]*?CoM Y\s*([\-\d.]+)\s*m[\s\S]*?CoM Z\s*([\-\d.]+)\s*m/);
  return m ? { x: m[1], y: m[2], z: m[3] } : null;
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const page = await browser.newPage({ viewport: null });
  const diagLogs = [];
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('physics-diag') || t.includes('DynamicSim')) diagLogs.push({ t: Date.now(), msg: t });
  });

  await page.addInitScript(() => { try { delete window.showOpenFilePicker; } catch (e) {} });
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => localStorage.setItem('robo_physics_diag', '1'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const intro = page.locator('.intro');
  if (await intro.count()) { await intro.click({ timeout: 5000 }).catch(() => {}); }
  await page.waitForTimeout(600);

  const spCurrent = page.locator('.sp-current');
  if (await spCurrent.count()) {
    await spCurrent.first().click({ timeout: 8000, force: true }).catch(async () => {
      await page.locator('.sp-close').first().click({ timeout: 8000, force: true }).catch(() => {});
    });
  }
  await page.waitForTimeout(800);
  if (await page.locator('.sp-backdrop').count()) {
    await page.locator('.sp-close').first().click({ timeout: 8000, force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }

  await page.getByText('File', { exact: true }).click();
  await page.waitForTimeout(300);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.getByText('Open Project…').click(),
  ]);
  await chooser.setFiles(PROJECT_FILE);
  await page.waitForTimeout(2500);

  await page.getByText('Animation', { exact: true }).click();
  await page.waitForTimeout(1200);

  let gravBtn = page.getByText(/Gravity (ON|OFF)/).first();
  if (!(await gravBtn.isVisible().catch(() => false))) {
    await page.getByText('CENTER OF MASS').first().click().catch(() => {});
    await page.waitForTimeout(500);
  }
  if (!(await gravBtn.isVisible().catch(() => false))) {
    await page.getByText('CENTER OF MASS').first().click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Raw body transforms straight from the live document (ground truth, not UI text).
  const dumpBodies = async () => page.evaluate(() => {
    const doc = window.tetrobotModel.getState().doc;
    const out = {};
    for (const [id, b] of Object.entries(doc.bodies)) {
      out[b.name + '::' + id.slice(0, 6)] = b.transform.position.map(n => +n.toFixed(5));
    }
    return out;
  });

  console.log('=== BEFORE GRAVITY ===');
  console.log(JSON.stringify(await dumpBodies(), null, 0));

  await gravBtn.scrollIntoViewIfNeeded().catch(() => {});
  await gravBtn.click({ timeout: 10000 });

  const samples = [];
  const N = 15, GAP_MS = 2000; // 30 seconds total, one sample every 2s
  for (let i = 0; i < N; i++) {
    await page.waitForTimeout(GAP_MS);
    const bodies = await dumpBodies();
    const text = await page.locator('body').innerText();
    const com = extractCoM(text);
    samples.push({ t: (i + 1) * GAP_MS / 1000, com, bodies });
    console.log(`t=${(i + 1) * GAP_MS / 1000}s COM=${JSON.stringify(com)}`);
  }
  await page.screenshot({ path: path.join(SHOT_DIR, 'final.png') });

  // Diff body positions between consecutive samples to find which body actually moves.
  console.log('=== PER-BODY DELTAS BETWEEN CONSECUTIVE SAMPLES ===');
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1].bodies, cur = samples[i].bodies;
    const moved = [];
    for (const key of Object.keys(cur)) {
      const a = prev[key], b = cur[key];
      if (!a || !b) continue;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d > 0.0005) moved.push(`${key}:${(d * 1000).toFixed(2)}mm`);
    }
    if (moved.length) console.log(`t=${samples[i-1].t}s->${samples[i].t}s MOVED: ${moved.join(', ')}`);
    else console.log(`t=${samples[i-1].t}s->${samples[i].t}s: no body moved >0.5mm`);
  }

  console.log('=== DIAG LOG COUNT ===', diagLogs.length);
  console.log('=== LAST 10 DIAG LOGS ===');
  console.log(diagLogs.slice(-10).map(d => d.msg).join('\n'));

  fs.writeFileSync(path.join(SHOT_DIR, 'samples.json'), JSON.stringify(samples, null, 2));

  await browser.close();
})().catch(async (e) => {
  console.error('ERR', e.message, e.stack);
  process.exit(1);
});
