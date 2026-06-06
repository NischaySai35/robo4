const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 800 });

  const errors = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://localhost:5178/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3500);

  await page.screenshot({ path: 'C:/Users/HP/AppData/Local/Temp/robo4_initial.png' });
  console.log('ERRORS:', JSON.stringify(errors));

  const hasLeftPanel = await page.$('.left-panel') !== null;
  const hasCanvas = await page.$('canvas') !== null;
  const hasHUD = await page.$('.hud') !== null;
  const hasStatus = await page.$('.status-bar') !== null;
  const logoText = await page.$eval('.logo-main', el => el.textContent).catch(() => 'NOT FOUND');
  const statusText = await page.$eval('.status-label', el => el.textContent).catch(() => 'NOT FOUND');

  console.log('left-panel:', hasLeftPanel);
  console.log('canvas:', hasCanvas);
  console.log('hud:', hasHUD);
  console.log('status:', hasStatus);
  console.log('logo:', logoText);
  console.log('statusLabel:', statusText);

  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
