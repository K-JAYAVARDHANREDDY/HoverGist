# HoverGist — Project README

> An embeddable SDK that lets developers add GPT-4 powered section summarization to any website.  
> Press **Alt**, click a section → instant AI gist in a floating tooltip.

---

## 📁 Project Structure

```
hovergist/
├── backend/               ← Express API server
│   ├── server.js          ← Main entry point
│   ├── middleware/
│   │   ├── auth.js        ← API key generation & validation
│   │   └── rateLimit.js   ← 200 calls/day per key enforcement
│   ├── .env               ← Your environment variables (add OpenAI key here)
│   ├── .env.example       ← Template
│   └── package.json
│
├── sdk/
│   └── hovergist.sdk.js   ← The embeddable SDK (zero dependencies)
│
└── demo/
    ├── index.html         ← Multi-section demo website
    ├── style.css          ← Premium dark glassmorphism design
    └── app.js             ← Config panel, FAQ, usage display
```

---

## 🚀 Quick Start

### Step 1 — Add your OpenAI API Key

Edit `backend/.env`:

```env
OPENAI_API_KEY=sk-your-real-openai-key-here
```

### Step 2 — Start the backend

```bash
cd backend
npm start
```

You'll see:
```
╔══════════════════════════════════════════════╗
║         HoverGist API Server v1.0.0          ║
║  Listening on  : http://localhost:3001        ║
║  Demo API Key  : hg_demo_key_00000000        ║
╚══════════════════════════════════════════════╝
```

### Step 3 — Open the demo

Open `demo/index.html` in your browser.

Press **Alt** on your keyboard, then click any section.

---

## 🔌 SDK Integration (for your own website)

```html
<!-- 1. Include the SDK -->
<script src="path/to/hovergist.sdk.js"></script>

<!-- 2. Initialize -->
<script>
  HoverGist.init({
    apiKey:         'hg_your_key_here',
    backendUrl:     'http://localhost:3001',
    theme:          'dark',       // 'dark' | 'light' | 'auto'
    triggerKey:     'Alt',        // key to activate hover mode
    highlightColor: '#6366f1',    // glow ring color
    maxWords:       120,          // max gist length

    // Optional callbacks
    onGist:     (gist, el) => console.log(gist),
    onActivate: () => console.log('HoverGist ON'),
  });
</script>
```

### SDK Public API

| Method | Description |
|---|---|
| `HoverGist.init(config)` | Initialize the SDK |
| `HoverGist.activate()` | Programmatically turn on hover mode |
| `HoverGist.deactivate()` | Turn off hover mode |
| `HoverGist.isActive()` | Returns `true` if active |
| `HoverGist.configure(partial)` | Update config at runtime |
| `HoverGist.getUsage()` | Returns `{ used, remaining, limit }` |
| `HoverGist.destroy()` | Remove all listeners and DOM elements |

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Server status |
| `GET` | `/api/keys/generate?label=MyApp` | None | Generate a developer API key |
| `GET` | `/api/usage` | `x-api-key` | Current usage stats |
| `POST` | `/api/gist` | `x-api-key` | Generate a gist (calls GPT-4) |

### POST /api/gist — Request Body

```json
{
  "text": "The section's text content (required)",
  "elementTag": "p",
  "context": "Page title or context hint",
  "maxWords": 120
}
```

### POST /api/gist — Response

```json
{
  "success": true,
  "gist": "Your concise AI-generated summary here.",
  "meta": {
    "tokensUsed": 142,
    "latencyMs": 820,
    "model": "gpt-4",
    "charCount": 432
  }
}
```

### Rate Limit Headers

Every response includes:
```
X-RateLimit-Limit:     200
X-RateLimit-Remaining: 198
X-RateLimit-Reset:     2026-04-23T15:00:00.000Z
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | string | `''` | Your HoverGist API key |
| `backendUrl` | string | `http://localhost:3001` | Backend server URL |
| `theme` | string | `'dark'` | `'dark'`, `'light'`, or `'auto'` |
| `triggerKey` | string | `'Alt'` | Key to toggle hover mode |
| `highlightColor` | string | `'#6366f1'` | Hover ring & accent color |
| `maxWords` | number | `120` | Max words in the gist |
| `minChars` | number | `20` | Min chars before calling API |
| `tooltipMaxWidth` | number | `360` | Tooltip width in px |
| `targetSelector` | string | `null` | Limit to specific CSS selector |
| `onGist` | function | `null` | Callback: `(gist, element) => {}` |
| `onError` | function | `null` | Callback: `(error, element) => {}` |
| `onActivate` | function | `null` | Callback: `() => {}` |
| `onDeactivate` | function | `null` | Callback: `() => {}` |

---

## 🔒 Rate Limiting

- **200 calls per API key per 24-hour window**
- Enforced at the backend — cannot be bypassed client-side
- Returns `HTTP 429` with `{ error, remaining: 0, resetAt }` when exceeded
- Usage visible in the demo's config panel (⚙️ bottom left)
- **Swap in Redis** for distributed/multi-server deployments

---

## 🔑 API Key Management

Generate a key:
```
GET http://localhost:3001/api/keys/generate?label=MyApp
```

Response:
```json
{
  "apiKey": "hg_77c7de64d250406bb0cf6026",
  "label": "MyApp",
  "usage": { "limit": 200, "window": "24 hours" },
  "instructions": {
    "sdkInit": "HoverGist.init({ apiKey: 'hg_77...', backendUrl: '...' })"
  }
}
```

A **demo key** (`hg_demo_key_00000000`) is pre-seeded on every server start for quick testing.
