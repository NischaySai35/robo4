const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 800 });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://localhost:5178/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Screenshot 1: initial light theme
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_light.png' });

  // Check panel background color (should be white/light now)
  const panelBg = await page.evaluate(() => {
    const el = document.querySelector('.left-panel');
    return el ? window.getComputedStyle(el).backgroundColor : 'NOT FOUND';
  });
  console.log('Panel bg:', panelBg);

  // Check Home button exists
  const homeBtn = await page.$('.home-btn');
  console.log('Home button:', homeBtn !== null);

  // Check limit badge shows 100°
  const limitText = await page.$eval('.panel-footer span', el => el.textContent).catch(() => 'ERR');
  console.log('Limit badge:', limitText);

  // Hover over the arm area to test cursor / hover highlight
  await page.mouse.move(1100, 398); // near right rod
  await page.waitForTimeout(300);
  const cursor = await page.evaluate(() => document.querySelector('canvas')?.style.cursor || 'none');
  console.log('Cursor on hover:', cursor);
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_hover.png' });

  // Drag to trigger IK, then click Home to test
  await page.mouse.down();
  await page.mouse.move(1100, 250, { steps: 15 });
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_bent.png' });

  // Click HOME button
  await page.click('.home-btn');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_homed.png' });

  const angleAfterHome = await page.$eval('.stat-val', el => el.textContent).catch(() => 'ERR');
  console.log('Angle after home (first joint):', angleAfterHome);

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
