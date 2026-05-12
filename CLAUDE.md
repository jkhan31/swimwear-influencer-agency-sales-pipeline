# CLAUDE.md — Instructions for Claude Code

This file tells you everything you need to know to work on this project effectively. Read it fully before doing anything.

---

## What This Project Is

We're building a demo of an AI-powered outreach system for a swimwear influencer agency. The goal is to show a working prototype as part of a job application — not a production system, but something real enough to prove genuine capability.

There are two demos to build:

- **Demo A** — A React web app (build this first, it's faster)
- **Demo B** — An n8n + Google Sheets workflow (build after Demo A)

---

## Read These Files First

Before writing any code, read these docs in order:

1. `05-project-summary.md` — Overall context, goals, and constraints
2. `03-demo-version-a.md` — Full spec for the React app
3. `04-demo-version-b.md` — Full spec for the n8n workflow

The architecture context is in `02-solution-architecture.md` if you need to understand the bigger picture.

---

## Build Order

### Phase 1: Demo A (React App)

Build a single-page React app with three sections:

1. **Brand Input Form** — collects brand name, handle, niche, follower count, market
2. **Output Cards** — two side-by-side cards showing the generated DM and email, each with approve / regenerate / edit
3. **Pipeline Log** — table of all approved messages with status tracking

Full spec in `03-demo-version-a.md`. The Claude Code prompt is at the bottom of that file — use it verbatim.

### Phase 2: Demo B (n8n Workflow)

Build the n8n workflow node by node as specified in `04-demo-version-b.md`. Export as `demo-b/workflow.json` when done.

---

## Architecture: Netlify Functions (Required)

**The API key must never be exposed to the browser.** The app is deployed publicly on Netlify and shared in a job proposal — anyone could extract a client-side API key from the network tab.

**Solution: Netlify Functions as a server-side proxy.**

All Claude API calls go through a Netlify Function (`netlify/functions/generate.js`). The frontend calls `/api/generate`, not the Anthropic API directly. The API key lives only in Netlify's environment variables, never in the browser.

```
Browser → POST /api/generate → Netlify Function → Anthropic API → response → Browser
```

### Netlify Function Structure

```
netlify/
└── functions/
    └── generate.js     # Proxy + rate limiting logic
```

### Function Template

```javascript
// netlify/functions/generate.js
const { RateLimiter } = require('./rateLimiter');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Rate limit check (see Rate Limiting section below)
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const limiter = new RateLimiter();
  const allowed = await limiter.check(ip);

  if (!allowed) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Rate limit reached. Please try again later.' })
    };
  }

  // Forward to Anthropic
  const body = JSON.parse(event.body);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return {
    statusCode: response.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
```

### Frontend API Call Pattern

The frontend calls the Netlify Function — never the Anthropic API directly:

```javascript
// lib/claude.js
export async function generateOutreach(brandData) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: buildPrompt(brandData) }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Generation failed');
  }

  const data = await response.json();
  const text = data.content[0].text;
  // Strip markdown fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
```

---

## Rate Limiting

**Goal:** Prevent token abuse on the public demo without blocking legitimate use (e.g. the founder trying it out).

**Strategy: IP-based rate limiting stored in Netlify Blobs (or a simple in-memory store for demo scale).**

### Limits
| Window | Max Requests | Behavior when exceeded |
|--------|-------------|----------------------|
| Per IP, per hour | 5 generations | Return 429 with friendly message |
| Per IP, per day | 10 generations | Return 429 with friendly message |

### Implementation Options (choose one)

**Option 1 — In-Memory (simplest, resets on cold start — fine for demo)**
```javascript
// netlify/functions/rateLimiter.js
const store = {};

class RateLimiter {
  check(ip) {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    if (!store[ip]) store[ip] = [];

    // Clean old entries
    store[ip] = store[ip].filter(t => t > dayAgo);

    const lastHour = store[ip].filter(t => t > hourAgo).length;
    const lastDay = store[ip].length;

    if (lastHour >= 5 || lastDay >= 10) return false;

    store[ip].push(now);
    return true;
  }
}

module.exports = { RateLimiter };
```

**Option 2 — Netlify Blobs (persists across cold starts — better)**
```javascript
const { getStore } = require('@netlify/blobs');

class RateLimiter {
  async check(ip) {
    const store = getStore('rate-limits');
    const key = `ip:${ip}`;
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const raw = await store.get(key);
    let timestamps = raw ? JSON.parse(raw) : [];

    timestamps = timestamps.filter(t => t > dayAgo);

    const lastHour = timestamps.filter(t => t > hourAgo).length;
    if (lastHour >= 5 || timestamps.length >= 10) return false;

    timestamps.push(now);
    await store.set(key, JSON.stringify(timestamps));
    return true;
  }
}

module.exports = { RateLimiter };
```

Use **Option 1** for initial build speed. Upgrade to **Option 2** if abuse is a concern.

### UI Behavior on Rate Limit
- Show a friendly message: *"You've hit the demo limit. This tool is intentionally rate-limited to keep it available for everyone. Reach out to Jason directly to see more."*
- Include a link to `jasonkhanani.com` or a mailto
- Do not show a generic error — turn the limit into a brand moment

---

## Claude API Rules

- Model: `claude-sonnet-4-20250514` for outreach generation
- Model: `claude-haiku-4-5-20251001` for reply classification (cheaper, faster)
- Max tokens: `1000` for generation, `200` for classification
- Always request JSON output — include in system prompt: *"Output ONLY valid JSON, no preamble, no markdown fences"*
- Parse responses safely — always wrap `JSON.parse()` in try/catch, strip markdown fences first

### Expected JSON Output Shape (Outreach Generation)
```json
{
  "dm": "Hey [brand], ...",
  "email_subject": "Creator collab for [brand]",
  "email_body": "Hi [name], ..."
}
```

### Expected JSON Output Shape (Reply Classification)
```json
{
  "classification": "INTERESTED",
  "reason": "Brand asked about creator roster"
}
```

---

## UI Rules

- **Framework:** React with Tailwind CSS
- **Style:** Clean, minimal, professional. Dark background preferred (`#0f0f0f` or `#111`)
- **Accent color:** Coral / warm orange (`#FF6B6B` or similar) — beach/swimwear vibe
- **No toy UI** — this should look like a real internal tool, not a student project
- **Layout:** Two-column on desktop (form left, output right), single column on mobile
- **Loading state:** Show spinner + copy "Crafting your outreach..." while Claude is thinking
- **Error state:** Show a friendly error message if the API call fails, with a retry button

---

## File Structure

```
demo-a/
├── netlify/
│   └── functions/
│       ├── generate.js        # Netlify Function proxy to Anthropic API
│       └── rateLimiter.js     # IP-based rate limiting logic
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── BrandForm.jsx
│   │   ├── OutputCards.jsx
│   │   ├── PipelineLog.jsx
│   │   └── LoadingSpinner.jsx
│   └── lib/
│       └── claude.js          # Calls /api/generate (never Anthropic directly)
├── netlify.toml               # Redirects /api/generate → netlify function
├── index.html
├── .env.example
├── vite.config.js
└── package.json

demo-b/
├── workflow.json
└── sheets-template.md
```

### netlify.toml (required)
```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=your_key_here
```

This lives **only in Netlify's environment variables dashboard** — never in the frontend, never in `.env` committed to the repo.

Create a `.env.example` with:
```
ANTHROPIC_API_KEY=
```

Never commit the real key. The Netlify Function reads `process.env.ANTHROPIC_API_KEY` server-side.

---

## What Good Looks Like

Demo A is done when:
- [ ] Netlify Function proxies Claude API calls correctly (no API key in browser)
- [ ] Rate limiter blocks after 5 requests/hour per IP
- [ ] Rate limit UI message is friendly and links to jasonkhanani.com
- [ ] Form submits and Claude generates a real DM + email
- [ ] Output looks polished and readable in two cards
- [ ] Approve button logs the message to the pipeline table below
- [ ] Regenerate rewrites without clearing the form
- [ ] Error handling works gracefully (API error, rate limit, parse failure)
- [ ] Runs locally with `netlify dev` (not just `npm run dev`)
- [ ] Deploys cleanly to Netlify with `netlify deploy --prod`

Demo B is done when:
- [ ] n8n workflow runs end-to-end without errors
- [ ] Output appears correctly in the Google Sheet
- [ ] Reply classification works and updates sheet status
- [ ] Telegram alert fires for INTERESTED replies
- [ ] Workflow exported as `demo-b/workflow.json`

---

## Common Pitfalls

- **Never call Anthropic API from the browser** — API key will be exposed. Always use the Netlify Function proxy
- Claude sometimes wraps JSON in markdown fences (` ```json ``` `) even when told not to — always strip before parsing
- The Anthropic API requires the `anthropic-version` header — don't omit it
- Use `netlify dev` locally (not `npm run dev`) so Netlify Functions run alongside the Vite dev server
- Tailwind needs to be configured for JSX files in `tailwind.config.js` content paths
- n8n's Google Sheets node needs OAuth — set this up before building the workflow
- Keep DM under 150 words and email under 200 words — enforce in the prompt, verify in the UI
- In-memory rate limiter resets on Netlify cold starts — acceptable for demo, use Netlify Blobs if needed

---

## Deployment

### Local Development
```bash
cd demo-a
npm install
netlify dev    # runs Vite + Netlify Functions together on localhost:8888
```

### Deploy to Netlify
```bash
netlify deploy --prod
```

Before deploying, set in Netlify dashboard (Site Settings → Environment Variables):
```
ANTHROPIC_API_KEY=your_key_here
```

The live URL (e.g. `https://agency-outreach-demo.netlify.app`) is what goes in the job proposal.
