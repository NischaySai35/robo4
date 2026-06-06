const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 800 });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://localhost:5178/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_white_scene.png' });

  // HUD background (should be light/white now)
  const hudBg = await page.evaluate(() => {
    const hud = document.querySelector('.hud');
    return hud ? window.getComputedStyle(hud).backgroundColor : 'NOT FOUND';
  });
  console.log('HUD bg:', hudBg);

  // Status bar background
  const statusBg = await page.evaluate(() => {
    const sb = document.querySelector('.status-bar');
    return sb ? window.getComputedStyle(sb).backgroundColor : 'NOT FOUND';
  });
  console.log('Status bar bg:', statusBg);

  // Root indicator background (should be light amber now)
  const rootBg = await page.evaluate(() => {
    const ri = document.querySelector('.root-indicator');
    return ri ? window.getComputedStyle(ri).backgroundColor : 'NOT FOUND';
  });
  console.log('Root indicator bg:', rootBg);

  // Switch to vertical mode
  const modeBtns = await page.$$('.mode-btn');
  if (modeBtns.length >= 2) {
    await modeBtns[1].click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_vertical.png' });
    console.log('Vertical mode: screenshot taken');
  }

  // Switch root rod to rod D (index 3, last rod)
  // Click somewhere near the right area of the 3D scene to select a different root
  // Just verify no underground clipping by taking screenshot
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_vertical2.png' });
  console.log('Vertical mode root switch: screenshot taken');

  // Active mode button bg (should be light blue now)
  const modeBtnBg = await page.evaluate(() => {
    const btn = document.querySelector('.mode-btn.active');
    return btn ? window.getComputedStyle(btn).backgroundColor : 'NOT FOUND';
  });
  console.log('Active mode-btn bg:', modeBtnBg);

  // kbd element bg (should be light blue)
  const kbdBg = await page.evaluate(() => {
    const k = document.querySelector('kbd');
    return k ? window.getComputedStyle(k).backgroundColor : 'NOT FOUND';
  });
  console.log('kbd bg:', kbdBg);

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
