# FrameInGoa — HH Goa 2026 Frame & Builder ID Generator

A lightweight, client-side web tool for attendees of **Hacker House Goa 2026** to generate branded social-media frames and builder ID cards. Upload a photo, pick a format, and download a share-ready PNG in seconds.

Live feel: **#FrameInGoa** — green, yellow, palms, and the Hindi गोवा stamp.

---

## Features

- **PFP Frame** — Square 1080×1080 profile-picture frame with HH Goa branding.
- **Builder ID** — Portrait 1080×1350 event-badge card with name, stack, and a generated builder title.
- **No login required** — everything happens in the browser.
- **Drag / pinch / zoom editor** — reposition and zoom your photo after uploading.
- **One-tap share** — generates a public link with your frame as the social-card preview.
- **Responsive design** — works on desktop and mobile.
- **Themed UI** — inspired by [hhgoa.com](https://hhgoa.com) with subtle animations, palms, and Goa motifs.

---

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Graphics:** HTML5 Canvas (client-side rendering)
- **Sharing:** Express endpoint that stores rendered PNGs and serves OG/Twitter meta tags

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
git clone https://github.com/Shalini25sristi/hh-goa-frame.git
cd hh-goa-frame
npm install
```

### Run locally

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
hh-goa-frame/
├── public/                 # Static frontend files
│   ├── index.html          # Main page
│   ├── style.css           # Styling and animations
│   ├── app.js              # Canvas rendering and UI logic
│   └── assets/             # Images, logos, palms, motifs
├── data/                   # Generated share images (created at runtime, gitignored)
├── server.js               # Express server + share API
├── test/                   # E2E and share-page tests
├── package.json
└── README.md
```

---

## How It Works

1. Choose a format — **PFP Frame** or **Builder ID**.
2. Fill badge details (Builder ID only).
3. Upload a photo (JPG, PNG, or HEIC).
4. Drag to reposition and use the slider to zoom.
5. Download your PNG or share directly to X with a preview link.

---

## Sharing API

The server exposes a small API for social sharing:

- `POST /api/share` — Upload a rendered PNG, get back a shareable ID and URL.
- `GET /i/:id.png` — Raw PNG image for crawlers.
- `GET /s/:id` — Share page with OG/Twitter meta tags.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `3000`) |
| `BASE_URL` | Public base URL used for share links |

---

## Built For

[Hacker House Goa 2026](https://hhgoa.com) — 28–31 Oct, Goa, India.

Designed with ♥ by **2:47 PM Studio** vibes.

---

## License

ISC
