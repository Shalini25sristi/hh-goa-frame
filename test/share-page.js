// Visual check of the /s/:id share page + desktop viewport render.
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();

  // share page with a real generated graphic
  const png = fs.readFileSync('/tmp/opencode/out-pfp.png');
  const up = await fetch('http://localhost:3000/api/share', { method: 'POST', body: png });
  const { url } = await up.json();
  console.log('share page:', url);

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/opencode/shot-share.png' });

  // desktop landing
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/opencode/shot-desktop.png', fullPage: false });

  // perf: total transferred bytes on cold load
  const reqs = [];
  page.on('response', async (r) => { try { const b = await r.body(); reqs.push([r.url(), b.length]); } catch (_) {} });
  await page.reload({ waitUntil: 'networkidle' });
  const total = reqs.reduce((a, [, n]) => a + n, 0);
  reqs.sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([u, n]) => console.log(`  ${(n / 1024).toFixed(0)}KB  ${u.split('/').slice(-2).join('/')}`));
  console.log('TOTAL page weight:', (total / 1024).toFixed(0) + 'KB');

  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
