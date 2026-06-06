const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://localhost:5178/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3500);

  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_v4_initial.png', fullPage: false });

  // Check gizmo is present
  const gizmo = await page.$('.gizmo-wrap');
  console.log('Gizmo present:', gizmo !== null);

  // Check view/fit button
  const viewBtn = await page.$('.view-btn');
  console.log('Fit button present:', viewBtn !== null);

  // Check top-right cluster
  const cluster = await page.$('.top-right-cluster');
  console.log('Cluster present:', cluster !== null);

  // Check joint accent strips
  const accents = await page.$$('.joint-accent');
  console.log('Joint accent strips:', accents.length);

  // Click the fit camera button
  if (viewBtn) {
    await viewBtn.click();
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_v4_fit.png', fullPage: false });

  // Click a gizmo axis button (snap to +X view)
  const axisBtns = await page.$$('.gizmo-axis-btn');
  console.log('Gizmo axis buttons:', axisBtns.length);
  if (axisBtns.length > 0) {
    await axisBtns[0].click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_v4_xview.png', fullPage: false });
  }

  // Test vertical mode
  const modeBtns = await page.$$('.mode-btn');
  if (modeBtns.length >= 2) {
    await modeBtns[1].click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_v4_vertical.png', fullPage: false });
  }

  // Check joint card colors (first joint accent color)
  const jointColor = await page.evaluate(() => {
    const card = document.querySelector('.joint-card');
    return card ? getComputedStyle(card).getPropertyValue('--joint-color').trim() : 'not found';
  });
  console.log('Joint 1 color var:', jointColor);

  // Check gizmo background
  const gizmoBg = await page.evaluate(() => {
    const g = document.querySelector('.gizmo-wrap');
    return g ? getComputedStyle(g).backgroundColor : 'not found';
  });
  console.log('Gizmo bg:', gizmoBg);

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
