// HH Goa 2026 — Frame / Builder ID generator
// Serves the static app + share endpoints that give every generated
// graphic a public URL whose OG preview IS the generated image.
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
// Vercel serverless functions have a read-only filesystem except /tmp.
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.join(__dirname, 'data');
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB rendered PNG cap

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (err) {
  console.error('Could not create data directory:', err.message);
}

// Trust proxy headers (ngrok / cloudflare / reverse proxies) so absolute
// OG URLs are built with the public host + protocol.
app.set('trust proxy', true);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: 'index.html' }));

function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

// --- upload a rendered graphic, get back a shareable id -------------------
app.post('/api/share', express.raw({ type: () => true, limit: MAX_BYTES }), (req, res) => {
  const buf = req.body;
  if (!buf || buf.length < 100) return res.status(400).json({ error: 'empty body' });
  // PNG magic bytes
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (!isPng) return res.status(415).json({ error: 'png only' });

  const id = crypto.randomBytes(6).toString('base64url'); // 8 chars, url safe
  fs.writeFileSync(path.join(DATA_DIR, `${id}.png`), buf);
  res.json({ id, url: `${baseUrl(req)}/s/${id}`, image: `${baseUrl(req)}/i/${id}.png` });
});

// --- raw image (this is what crawlers grab for the preview) ---------------
app.get('/i/:id.png', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.id}.png`);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  fs.createReadStream(file).pipe(res);
});

// --- share page: rich OG/Twitter meta for crawlers, pretty page for humans -
app.get('/s/:id', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.id}.png`);
  if (!fs.existsSync(file)) return res.status(404).send('This frame has drifted out to sea. Make your own at the link below.');
  const base = baseUrl(req);
  const img = `${base}/i/${req.params.id}.png`;
  const page = `${base}/s/${req.params.id}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>HH Goa 2026 — #FrameInGoa</title>
<meta name="description" content="Locked in for Hacker House Goa 2026. 28–31 Oct, Goa India. Make your own frame."/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Hacker House Goa 2026"/>
<meta property="og:title" content="I'm locked in for Hacker House Goa 2026 🌴"/>
<meta property="og:description" content="4 days. one rhythm. everything intentional. 28–31 Oct · Goa, India. Make your own #FrameInGoa frame."/>
<meta property="og:url" content="${page}"/>
<meta property="og:image" content="${img}"/>
<meta property="og:image:type" content="image/png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="I'm locked in for Hacker House Goa 2026 🌴"/>
<meta name="twitter:description" content="4 days. one rhythm. everything intentional. Make your own #FrameInGoa frame."/>
<meta name="twitter:image" content="${img}"/>
<link rel="icon" href="/assets/favicon.webp"/>
<style>
  body{margin:0;min-height:100vh;background:#0B6839;color:#fff;font-family:ui-monospace,Menlo,monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:28px;box-sizing:border-box;text-align:center}
  img{max-width:min(88vw,520px);max-height:62vh;border:3px solid #FEE101;box-shadow:0 18px 50px rgba(0,0,0,.35)}
  a.btn{background:#FEE101;color:#0B6839;text-decoration:none;font-weight:800;text-transform:uppercase;padding:14px 26px;font-size:15px;letter-spacing:.04em}
  p{opacity:.85;font-size:14px;margin:0}
</style>
</head>
<body>
  <img src="${img}" alt="HH Goa 2026 frame"/>
  <a class="btn" href="/">Make your own frame →</a>
  <p>HACKER HOUSE GOA · 28–31 OCT 2026 · #FrameInGoa</p>
</body>
</html>`);
});

// Start server locally; export app for serverless platforms like Vercel.
if (require.main === module) {
  app.listen(PORT, () => console.log(`HH Goa frame tool → http://localhost:${PORT}`));
}

module.exports = app;
