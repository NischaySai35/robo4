const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 800 });

  const errors = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('http://localhost:5178/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2500);

  // Step 1: Read initial HUD position
  const initX = await page.$eval('.hud-val', el => el.textContent).catch(() => 'ERR');
  console.log('Initial end effector X:', initX);

  // Step 2: Drag the rightmost rod (end cap area) to change arm shape
  // The arm is centered around x=900, y=398 on the 1400x800 viewport.
  // The right end cap is approximately at x=1120, y=398.
  await page.mouse.move(1100, 398);
  await page.mouse.down();
  await page.waitForTimeout(100);
  // Drag upward to trigger IK
  await page.mouse.move(1100, 280, { steps: 20 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_dragging.png' });

  // Check status while dragging
  const statusWhileDragging = await page.$eval('.status-label', el => el.textContent).catch(() => 'ERR');
  const dragHintVisible = await page.$('.status-drag-hint') !== null;
  console.log('Status while dragging:', statusWhileDragging);
  console.log('Drag hint visible:', dragHintVisible);

  // Read changed HUD
  const newX = await page.$eval('.hud-val', el => el.textContent).catch(() => 'ERR');
  console.log('HUD X after drag:', newX);

  await page.mouse.up();
  await page.waitForTimeout(500);

  // Step 3: Check status reverts to idle
  const statusAfterRelease = await page.$eval('.status-label', el => el.textContent).catch(() => 'ERR');
  console.log('Status after release:', statusAfterRelease);

  // Step 4: Screenshot after drag
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_after_drag.png' });

  // Step 5: Test mode switch to vertical
  await page.click('.mode-btn:not(.active)');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_vertical.png' });
  const modeActive = await page.$eval('.mode-btn.active', el => el.textContent.trim()).catch(() => 'ERR');
  console.log('Active mode button:', modeActive);

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
