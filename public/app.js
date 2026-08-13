/* FrameInGoa — HH Goa 2026 frame & builder-ID generator
   Everything renders client-side on canvas: upload -> result in one pass. */
'use strict';

/* ── brand constants ─────────────────────────────────────────── */
const GREEN = '#0B6839';
const GREEN_DEEP = '#07522C';
const YELLOW = '#FEE101';
const WHITE = '#FFFDF4';
const INK = '#04341C';
const MONO = '"Victor Mono", monospace';
const SERIF = '"Imbue", serif';

const BUILDER_TITLES = [
  'SANDCASTLE ARCHITECT', 'TIDEPOOL DEBUGGER', 'COCONUT CTO', 'SHACK SYSADMIN',
  'SUNSET SHIPPER', 'PALM-TREE PUNDIT', 'FENI FULL-STACKER', 'BEACH BOUNTY HUNTER',
  'CASHEW KERNEL HACKER', 'HAMMOCK HFT WIZARD', 'SURFBOARD SRE', 'MOJITO ML MONK',
  'SHACK BACKEND BABA', 'PARASAILING PM', 'JETSKI DEVOPS JOCKEY', 'BAGA BEACH BUILDER',
  'KONKANI KERNEL KOMMANDER', 'CHORAO CHIEF OF CHAOS', 'MANDOVI MERGE MASTER',
  'SIOLIM SECURITY SAGE',
];

/* ── state ───────────────────────────────────────────────────── */
const state = {
  format: null,           // 'pfp' | 'card' | null
  photo: null,            // ImageBitmap | HTMLImageElement
  ox: 0, oy: 0,           // photo offset in output px
  zoom: 100,              // % of cover scale
  name: '', stack: '',
  titleSeed: 0,           // shuffle seed
  rendering: false,
};

/* ── dom ─────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');
const els = {
  fmtPfp: $('fmt-pfp'), fmtCard: $('fmt-card'),
  fileInput: $('file-input'), dropzone: $('dropzone'), dzLoading: $('dz-loading'),
  fieldsStep: $('fields-step'), resultStep: $('result-step'), resultNum: $('result-num'),
  photoStep: $('photo-step'), photoNum: $('photo-num'), formatHint: $('format-hint'),
  inName: $('in-name'), inStack: $('in-stack'), outTitle: $('out-title'),
  btnShuffle: $('btn-shuffle'), zoom: $('zoom'), editorHint: $('editor-hint'),
  btnDownload: $('btn-download'), btnShareX: $('btn-sharex'), btnNative: $('btn-native'),
  btnReset: $('btn-reset'), shareStatus: $('share-status'),
  toolWrap: $('tool'),
};

/* ── assets ──────────────────────────────────────────────────── */
const assets = {};
function loadImg(name, src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => { assets[name] = im; resolve(); };
    im.onerror = () => resolve(); // degrade gracefully
    im.src = src;
  });
}
const assetsReady = Promise.all([
  loadImg('sunrise', '/assets/sunrise.jpg'),
  loadImg('wordmark', '/assets/hacker-house.png'),
  loadImg('goa', '/assets/goa-hindi.png'),
  loadImg('studio', '/assets/logo-247.png'),
  loadImg('trees', '/assets/footer-trees.jpg'),
]);
const fontsReady = (async () => {
  try {
    await Promise.all([
      document.fonts.load(`700 100px ${SERIF}`), document.fonts.load(`500 100px ${SERIF}`),
      document.fonts.load(`700 40px ${MONO}`), document.fonts.load(`600 40px ${MONO}`),
    ]);
  } catch (_) { /* fall back to system fonts */ }
})();

/* ── helpers ─────────────────────────────────────────────────── */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
function builderNo() { return String(hashStr(state.name + '|' + state.stack + '|' + state.titleSeed) % 10000).padStart(4, '0'); }
function builderTitle() {
  if (state.titleSeed > 0) return BUILDER_TITLES[state.titleSeed % BUILDER_TITLES.length];
  return BUILDER_TITLES[hashStr(state.name || 'goa-builder') % BUILDER_TITLES.length];
}

/* row of small diamonds — the site's signature strip */
function diamondRow(c, y, w, color, size = 16, gap = 14, alpha = 1) {
  c.save();
  c.fillStyle = color; c.globalAlpha = alpha;
  const step = size + gap;
  for (let x = step / 2; x < w + step; x += step) {
    c.beginPath();
    c.moveTo(x, y - size / 2); c.lineTo(x + size / 2, y);
    c.lineTo(x, y + size / 2); c.lineTo(x - size / 2, y);
    c.closePath(); c.fill();
  }
  c.restore();
}

/* cover-fit the user's photo into a window, honouring pan + zoom */
function drawPhotoCover(c, img, wx, wy, ww, wh, clipFn) {
  const base = Math.max(ww / img.width, wh / img.height) * (state.zoom / 100);
  const dw = img.width * base, dh = img.height * base;
  const maxX = Math.max(0, (dw - ww) / 2), maxY = Math.max(0, (dh - wh) / 2);
  state.ox = clamp(state.ox, -maxX, maxX);
  state.oy = clamp(state.oy, -maxY, maxY);
  const dx = wx + (ww - dw) / 2 + state.ox;
  const dy = wy + (wh - dh) / 2 + state.oy;
  c.save();
  c.beginPath(); clipFn(); c.clip();
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, dx, dy, dw, dh);
  c.restore();
}

/* text wrapped around a circle; flip=true renders along the bottom arc */
function arcText(c, text, cx, cy, r, centerAngle, spread, font, color, flip) {
  c.save();
  c.font = font; c.fillStyle = color;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = flip
      ? centerAngle + spread / 2 - spread * t
      : centerAngle - spread / 2 + spread * t;
    c.save();
    c.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
    c.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
    c.fillText(text[i], 0, 0);
    c.restore();
  }
  c.restore();
}

function fitFont(c, text, maxW, startSize, weight, family, minSize = 30) {
  let size = startSize;
  while (size > minSize) {
    c.font = `${weight} ${size}px ${family}`;
    if (c.measureText(text).width <= maxW) break;
    size -= 4;
  }
  return size;
}

/* ── FORMAT A · PFP frame (1080×1080) ────────────────────────── */
function renderPFP(c, S) {
  const cx = S / 2, cy = S * 0.505, R = S * 0.352;

  // background: the sunrise artwork, cropped square
  const art = assets.sunrise;
  if (art) {
    const base = Math.max(S / art.width, S / art.height);
    c.drawImage(art, (S - art.width * base) / 2, (S - art.height * base) / 2, art.width * base, art.height * base);
    c.fillStyle = 'rgba(4,52,28,0.34)'; c.fillRect(0, 0, S, S); // deepen for contrast
  } else { c.fillStyle = GREEN; c.fillRect(0, 0, S, S); }

  // photo, front and center
  drawPhotoCover(c, state.photo, cx - R, cy - R, R * 2, R * 2,
    () => c.arc(cx, cy, R, 0, Math.PI * 2));

  // brand ring around the photo
  c.lineWidth = S * 0.024; c.strokeStyle = YELLOW;
  c.beginPath(); c.arc(cx, cy, R + S * 0.016, 0, Math.PI * 2); c.stroke();
  c.lineWidth = S * 0.006; c.strokeStyle = 'rgba(255,253,244,.85)';
  c.beginPath(); c.arc(cx, cy, R + S * 0.038, 0, Math.PI * 2); c.stroke();

  // curved text ring — dark ribbon behind the bottom arc keeps it
  // readable over the busy artwork
  const textR = R + S * 0.075, botSpread = Math.PI * 0.80;
  c.save();
  c.strokeStyle = 'rgba(4,52,28,.72)'; c.lineWidth = S * 0.062; c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, textR, Math.PI / 2 - botSpread / 2 - 0.10, Math.PI / 2 + botSpread / 2 + 0.10); c.stroke();
  c.restore();
  arcText(c, 'HACKER HOUSE GOA 2026', cx, cy, textR, -Math.PI / 2, Math.PI * 0.92,
    `700 ${S * 0.041}px ${MONO}`, YELLOW, false);
  arcText(c, '28 – 31 OCT · GOA, INDIA', cx, cy, textR, Math.PI / 2, botSpread,
    `700 ${S * 0.037}px ${MONO}`, WHITE, true);

  // zigzag strips, top + bottom
  diamondRow(c, S * 0.024, S, YELLOW, S * 0.020, S * 0.016);
  diamondRow(c, S * 0.976, S, YELLOW, S * 0.020, S * 0.016);

  // corner stamps
  if (assets.goa) {
    c.save(); c.translate(S * 0.105, S * 0.088); c.rotate(-0.12);
    const h = S * 0.10, w = h * (assets.goa.width / assets.goa.height);
    c.drawImage(assets.goa, -w / 2, -h / 2, w, h); c.restore();
  }
  if (assets.studio) {
    const h = S * 0.075, w = h * (assets.studio.width / assets.studio.height);
    c.drawImage(assets.studio, S * 0.885 - w / 2, S * 0.915 - h / 2, w, h);
  }
}

/* ── FORMAT B · builder ID card (1080×1350) ──────────────────── */
function renderCard(c, W, H) {
  c.fillStyle = GREEN; c.fillRect(0, 0, W, H);

  // zigzag border strips
  diamondRow(c, 22, W, YELLOW, 18, 15);
  diamondRow(c, 46, W, 'rgba(255,253,244,.35)', 9, 17);

  // header wordmark + gova stamp
  const wm = assets.wordmark;
  if (wm) {
    const w = W * 0.66, h = w * (wm.height / wm.width);
    c.drawImage(wm, (W - w) / 2, 96, w, h);
  } else {
    c.fillStyle = YELLOW; c.font = `700 92px ${SERIF}`; c.textAlign = 'center';
    c.fillText('HACKER HOUSE', W / 2, 190);
  }
  if (assets.goa) {
    c.save(); c.translate(W * 0.80, 128); c.rotate(-0.10);
    const h = 108, w = h * (assets.goa.width / assets.goa.height);
    c.drawImage(assets.goa, -w / 2, -h / 2, w, h); c.restore();
  }
  c.fillStyle = YELLOW; c.font = `700 31px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('GOA, INDIA  ·  28 – 31 OCT 2026', W / 2, 268);
  diamondRow(c, 312, W, 'rgba(255,253,244,.4)', 8, 16);

  // photo window
  const px = 90, py = 356, pw = W - 180, ph = 460;
  c.fillStyle = GREEN_DEEP; c.fillRect(px - 14, py - 14, pw + 28, ph + 28);
  drawPhotoCover(c, state.photo, px, py, pw, ph, () => c.rect(px, py, pw, ph));
  c.lineWidth = 10; c.strokeStyle = YELLOW; c.strokeRect(px - 5, py - 5, pw + 10, ph + 10);
  // corner ticks
  c.fillStyle = YELLOW;
  [[px - 22, py - 22], [px + pw + 8, py - 22], [px - 22, py + ph + 8], [px + pw + 8, py + ph + 8]]
    .forEach(([x, y]) => c.fillRect(x, y, 14, 14));

  // admit strip under photo
  const sy = py + ph + 14;
  c.fillStyle = '#0A0A0A'; c.fillRect(px - 14, sy, pw + 28, 58);
  c.fillStyle = YELLOW; c.font = `700 26px ${MONO}`; c.textAlign = 'left';
  c.fillText('✦ ADMIT ONE', px + 14, sy + 30);
  c.textAlign = 'right';
  c.fillText(`BUILDER No. ${builderNo()} ✦`, px + pw - 14, sy + 30);

  // name / stack / generated class
  const name = (state.name || 'YOUR NAME').toUpperCase();
  const stack = (state.stack || 'YOUR STACK · YOUR ROLE').toUpperCase();
  const ns = fitFont(c, name, W - 160, 108, 700, SERIF);
  c.fillStyle = WHITE; c.font = `700 ${ns}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText(name, W / 2, 985);

  c.fillStyle = YELLOW; c.font = `600 34px ${MONO}`;
  const st = fitFont(c, stack, W - 200, 34, 600, MONO, 20);
  c.font = `600 ${st}px ${MONO}`;
  c.fillText(stack, W / 2, 1046);

  c.fillStyle = 'rgba(255,253,244,.65)'; c.font = `600 22px ${MONO}`;
  c.fillText('— GENERATED BUILDER CLASS —', W / 2, 1102);

  // title pill
  const title = `★ ${builderTitle()} ★`;
  const ts = fitFont(c, title, W - 320, 38, 700, MONO, 22);
  c.font = `700 ${ts}px ${MONO}`;
  const tw = c.measureText(title).width + 64;
  c.fillStyle = YELLOW;
  c.fillRect((W - tw) / 2, 1122, tw, 58);
  c.fillStyle = GREEN; c.textBaseline = 'middle';
  c.fillText(title, W / 2, 1152);

  // palms + flowers strip, anchored to the bottom (uniform 0.75 scale, no distortion)
  if (assets.trees) {
    const t = assets.trees, scale = 0.75;
    const srcH = 207; // bottom band: lower fronds + flower border
    c.drawImage(t, 0, t.height - srcH, t.width, srcH, 0, H - srcH * scale, W, srcH * scale);
  }
  if (assets.studio) {
    const h = 86, w = h * (assets.studio.width / assets.studio.height);
    const lx = W / 2 - w / 2, ly = H - 118;
    c.save();
    c.fillStyle = 'rgba(4,52,28,.85)';
    c.beginPath(); c.roundRect(lx - 18, ly - 12, w + 36, h + 24, 10); c.fill();
    c.drawImage(assets.studio, lx, ly, w, h);
    c.restore();
  }
}

/* ── render dispatcher ───────────────────────────────────────── */
function render() {
  if (!state.photo) return;
  const isPfp = state.format === 'pfp';
  const W = 1080, H = isPfp ? 1080 : 1350;
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  ctx.clearRect(0, 0, W, H);
  if (isPfp) renderPFP(ctx, W); else renderCard(ctx, W, H);
}

/* ── photo intake (jpg / png / heic, any aspect) ─────────────── */
let heicLoaderPromise = null;
function ensureHeic2Any() {
  if (window.heic2any) return Promise.resolve();
  if (!heicLoaderPromise) {
    heicLoaderPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  return heicLoaderPromise;
}

async function decodePhoto(blob) {
  try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
  catch (_) {
    const url = URL.createObjectURL(blob);
    const im = new Image(); im.src = url; await im.decode(); return im;
  }
}

async function handleFile(file) {
  if (!file) return;
  els.dzLoading.hidden = false;
  els.dzLoading.textContent = 'Reading photo…';
  try {
    let blob = file;
    const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
    if (isHeic) {
      els.dzLoading.textContent = 'Converting HEIC…';
      await ensureHeic2Any();
      blob = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    }
    state.photo = await decodePhoto(blob);
    state.ox = 0; state.oy = 0; state.zoom = 100; els.zoom.value = 100;
    await Promise.all([assetsReady, fontsReady]);
    els.resultStep.hidden = false;
    els.editorHint.hidden = false;
    render();
    els.resultStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error(err);
    els.dzLoading.textContent = 'Could not read that image — try a JPG or PNG.';
    return;
  }
  els.dzLoading.hidden = true;
}

/* ── export / share ──────────────────────────────────────────── */
function renderBlob() {
  return new Promise((res) => canvas.toBlob(res, 'image/png'));
}
function fileName() {
  return state.format === 'pfp' ? 'hh-goa-2026-frame.png' : 'hh-goa-2026-builder-id.png';
}

async function download() {
  const blob = await renderBlob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const CAPTION = `I'm locked in for Hacker House Goa 2026 🌴
4 days. one rhythm. everything intentional.
Goa, India · 28–31 Oct · #FrameInGoa`;

async function shareToX() {
  els.btnShareX.disabled = true;
  els.shareStatus.textContent = 'Uploading your frame…';
  let url = '';
  try {
    const blob = await renderBlob();
    const r = await fetch('/api/share', { method: 'POST', body: blob });
    if (r.ok) url = (await r.json()).url;
  } catch (_) { /* fall through to text-only intent */ }
  els.btnShareX.disabled = false;
  if (url) {
    els.shareStatus.textContent = 'Link ready — your graphic shows up as the post preview ✦';
  } else {
    els.shareStatus.textContent = 'Could not create a share link — attach your downloaded PNG instead.';
  }
  const intent = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(CAPTION) +
    (url ? '&url=' + encodeURIComponent(url) : '');
  window.open(intent, '_blank', 'noopener');
}

async function nativeShare() {
  const blob = await renderBlob();
  const file = new File([blob], fileName(), { type: 'image/png' });
  try { await navigator.share({ files: [file], title: 'HH Goa 2026', text: CAPTION }); }
  catch (_) { /* user cancelled */ }
}

/* ── editor gestures: drag to pan, pinch/wheel/slider to zoom ── */
function bindEditor() {
  const pointers = new Map();
  let pinchDist = 0;
  const scale = () => canvas.width / canvas.getBoundingClientRect().width;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      state.ox += (e.clientX - prev.x) * scale();
      state.oy += (e.clientY - prev.y) * scale();
      render();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) {
        state.zoom = clamp(state.zoom * (d / pinchDist), 100, 300);
        els.zoom.value = Math.round(state.zoom);
        render();
      }
      pinchDist = d;
    }
  });
  const release = (e) => { pointers.delete(e.pointerId); pinchDist = 0; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.zoom = clamp(state.zoom - Math.sign(e.deltaY) * 8, 100, 300);
    els.zoom.value = Math.round(state.zoom);
    render();
  }, { passive: false });

  els.zoom.addEventListener('input', () => { state.zoom = +els.zoom.value; render(); });
}

/* ── wiring ──────────────────────────────────────────────────── */
function setFormat(f) {
  state.format = f;
  els.fmtPfp.classList.toggle('active', f === 'pfp');
  els.fmtCard.classList.toggle('active', f === 'card');
  els.fmtPfp.setAttribute('aria-selected', f === 'pfp');
  els.fmtCard.setAttribute('aria-selected', f === 'card');
  els.formatHint.classList.toggle('hidden', f !== null);
  els.fieldsStep.hidden = f !== 'card';
  els.photoStep.hidden = f === null;
  els.toolWrap.classList.toggle('card-flow', f === 'card');
  if (f === 'card') {
    els.photoNum.textContent = '03';
    els.resultNum.textContent = '04';
  } else if (f === 'pfp') {
    els.photoNum.textContent = '02';
    els.resultNum.textContent = '03';
  }
  if (state.photo && f) render();
}

function refreshTitle() { els.outTitle.textContent = builderTitle(); }

els.fmtPfp.addEventListener('click', () => setFormat('pfp'));
els.fmtCard.addEventListener('click', () => setFormat('card'));
els.fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
els.inName.addEventListener('input', () => { state.name = els.inName.value.trim(); refreshTitle(); render(); });
els.inStack.addEventListener('input', () => { state.stack = els.inStack.value.trim(); render(); });
els.btnShuffle.addEventListener('click', () => {
  state.titleSeed = Math.floor(Math.random() * 100000);
  refreshTitle(); render();
});
els.btnDownload.addEventListener('click', download);
els.btnShareX.addEventListener('click', shareToX);
els.btnReset.addEventListener('click', () => {
  state.photo = null; state.ox = 0; state.oy = 0; state.zoom = 100;
  els.fileInput.value = '';
  els.resultStep.hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// desktop drag & drop
['dragover', 'dragleave', 'drop'].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.toggle('drag', ev === 'dragover');
    if (ev === 'drop') handleFile(e.dataTransfer.files[0]);
  })
);

// native share only when the platform can attach files
if (navigator.canShare) {
  const probe = new File([new Blob(['x'])], 'x.png', { type: 'image/png' });
  if (navigator.canShare({ files: [probe] })) {
    els.btnNative.hidden = false;
    els.btnNative.addEventListener('click', nativeShare);
  }
}

bindEditor();
setFormat(null);
refreshTitle();

/* ── scroll reveals & number counters ────────────────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

function animateCounter(el) {
  const target = +el.dataset.target;
  const duration = 1400;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(target * eased);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach((el) => statObserver.observe(el));
