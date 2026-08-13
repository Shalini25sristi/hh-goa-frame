// E2E smoke test: drives the tool in headless chromium, captures
// the generated graphics + page screenshots for visual review.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } }); // phone-ish
  page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text()); });
  page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message));

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/opencode/shot-1-landing.png', fullPage: true });

  // upload portrait photo
  await page.setInputFiles('#file-input', '/tmp/opencode/portrait.jpg');
  await page.waitForSelector('#result-step:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/opencode/shot-2-pfp.png', fullPage: true });

  // export the raw PFP canvas PNG
  const pfpData = await page.evaluate(() => document.getElementById('preview').toDataURL('image/png'));
  require('fs').writeFileSync('/tmp/opencode/out-pfp.png', Buffer.from(pfpData.split(',')[1], 'base64'));

  // switch to builder ID + fill fields
  await page.click('#fmt-card');
  await page.fill('#in-name', 'Shalini Nair');
  await page.fill('#in-stack', 'Full-stack · Rust · React');
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/opencode/shot-3-card.png', fullPage: true });
  const cardData = await page.evaluate(() => document.getElementById('preview').toDataURL('image/png'));
  require('fs').writeFileSync('/tmp/opencode/out-card.png', Buffer.from(cardData.split(',')[1], 'base64'));

  // landscape photo through the card (aspect handling)
  await page.setInputFiles('#file-input', '/tmp/opencode/landscape.jpg');
  await page.waitForTimeout(700);
  const cardLand = await page.evaluate(() => document.getElementById('preview').toDataURL('image/png'));
  require('fs').writeFileSync('/tmp/opencode/out-card-landscape.png', Buffer.from(cardLand.split(',')[1], 'base64'));

  // share flow (intercept the popup)
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 15000 }),
    page.click('#btn-sharex'),
  ]);
  console.log('X intent URL:', popup.url().slice(0, 220));
  await popup.close();

  // download flow
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btn-download'),
  ]);
  console.log('Download filename:', dl.suggestedFilename());

  await browser.close();
  console.log('E2E OK');
})().catch((e) => { console.error('E2E FAILED:', e.message); process.exit(1); });
