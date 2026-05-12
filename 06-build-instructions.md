# Build Instructions: Step-by-Step Guide for Both Demos

---

# DEMO A: React Outreach Generator

**Total time:** 2–3 hours  
**Prerequisites:** Node.js installed, Netlify CLI installed, Anthropic API key, a code editor

---

## Phase 1: Project Setup (15 min)

### Step 1 — Install Netlify CLI (if not already installed)
```bash
npm install -g netlify-cli
netlify login
```

### Step 2 — Scaffold the React + Vite project
```bash
mkdir demo-a && cd demo-a
npm create vite@latest . -- --template react
npm install
```

### Step 3 — Install dependencies
```bash
npm install tailwindcss @tailwindcss/vite
```

### Step 4 — Configure Tailwind

Edit `vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

Add to the top of `src/index.css`:
```css
@import "tailwindcss";
```

### Step 5 — Create the Netlify functions folder
```bash
mkdir -p netlify/functions
```

### Step 6 — Create `netlify.toml` in project root
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

### Step 7 — Create `.env.example`
```bash
echo "ANTHROPIC_API_KEY=" > .env.example
```

Create a local `.env` file (never commit this):
```bash
echo "ANTHROPIC_API_KEY=your_key_here" > .env
```

---

## Phase 2: Build the Netlify Function (Rate Limiter + API Proxy) (30 min)

### Step 8 — Create the rate limiter

Create `netlify/functions/rateLimiter.js`:
```javascript
// In-memory store — resets on cold start, fine for demo
const store = {};

class RateLimiter {
  check(ip) {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    if (!store[ip]) store[ip] = [];

    // Clean entries older than 24 hours
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

### Step 9 — Create the API proxy function

Create `netlify/functions/generate.js`:
```javascript
const { RateLimiter } = require('./rateLimiter');

const limiter = new RateLimiter();

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  // Rate limit check
  const ip =
    event.headers['x-forwarded-for']?.split(',')[0].trim() ||
    event.headers['client-ip'] ||
    'unknown';

  const allowed = limiter.check(ip);

  if (!allowed) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: 'rate_limited',
        message: "You've hit the demo limit (5 generations/hour). This tool is intentionally rate-limited. Want to see the full system? Reach out at jasonkhanani.com"
      })
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  // Call Anthropic API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API call failed', detail: err.message }),
    };
  }
};
```

---

## Phase 3: Build the Claude API Helper (10 min)

### Step 10 — Create `src/lib/claude.js`

```javascript
const SYSTEM_PROMPT = `You are an outreach specialist for a premium swimwear influencer agency.
Your job is to write personalized, warm outreach messages to swimwear brands
inviting them to collaborate with our curated roster of UGC creators and influencers.

Rules:
- Never sound salesy or templated
- Reference the brand's niche and vibe naturally  
- Be direct about the value proposition: real creators, real content, real results
- DM max 150 words, Email max 200 words + subject line
- Output ONLY valid JSON with no preamble and no markdown fences`;

export async function generateOutreach({ brandName, handle, niche, followerCount, market }) {
  const userPrompt = `Brand: ${brandName}
Instagram: @${handle || 'unknown'}
Niche: ${niche}
Followers: ${followerCount}
Market: ${market}

Write a personalized Instagram DM and cold email for this brand.

Output format:
{
  "dm": "...",
  "email_subject": "...",
  "email_body": "..."
}`;

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await response.json();

  // Handle rate limit
  if (response.status === 429) {
    throw new Error(data.message || 'Rate limited');
  }

  // Handle other errors
  if (!response.ok) {
    throw new Error(data.error || 'Generation failed');
  }

  // Parse Claude's response — strip markdown fences if present
  const raw = data.content[0].text;
  const clean = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('Failed to parse Claude response as JSON');
  }
}
```

---

## Phase 4: Build the React Components (60 min)

### Step 11 — Create `src/components/BrandForm.jsx`

```jsx
export default function BrandForm({ onSubmit, loading }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    onSubmit({
      brandName: form.brandName.value,
      handle: form.handle.value,
      niche: form.niche.value,
      followerCount: form.followerCount.value,
      market: form.market.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Brand Name *</label>
        <input
          name="brandName"
          required
          placeholder="e.g. Monday Swimwear"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Instagram Handle</label>
        <input
          name="handle"
          placeholder="e.g. mondayswimwear"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Niche / Vibe *</label>
        <select
          name="niche"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
        >
          <option value="">Select niche...</option>
          <option value="Swimwear">Swimwear</option>
          <option value="Resort Wear">Resort Wear</option>
          <option value="Sustainable Swimwear">Sustainable Swimwear</option>
          <option value="Luxury Swimwear">Luxury Swimwear</option>
          <option value="Surf & Active">Surf & Active</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Follower Count *</label>
        <select
          name="followerCount"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
        >
          <option value="">Select range...</option>
          <option value="under 10K">Under 10K</option>
          <option value="10K–100K">10K – 100K</option>
          <option value="100K–500K">100K – 500K</option>
          <option value="500K+">500K+</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Target Market *</label>
        <select
          name="market"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
        >
          <option value="">Select market...</option>
          <option value="US">US</option>
          <option value="EU">EU</option>
          <option value="SEA">SEA</option>
          <option value="Global">Global</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? 'Generating...' : 'Generate Outreach'}
      </button>
    </form>
  );
}
```

### Step 12 — Create `src/components/OutputCards.jsx`

```jsx
import { useState } from 'react';

function MessageCard({ title, content, onApprove, onRegenerate, approved }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);

  return (
    <div className={`bg-gray-800 border rounded-xl p-4 flex flex-col gap-3 ${approved ? 'border-green-600' : 'border-gray-700'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">{title}</span>
        {approved && <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">Approved</span>}
      </div>

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-orange-500"
        />
      ) : (
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{text}</p>
      )}

      <div className="text-xs text-gray-500">{text.split(' ').length} words</div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onApprove(text)}
          disabled={approved}
          className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm py-1.5 rounded-lg transition-colors"
        >
          ✅ Approve
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-1.5 rounded-lg transition-colors"
        >
          ✏️ {editing ? 'Done' : 'Edit'}
        </button>
        <button
          onClick={onRegenerate}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-1.5 rounded-lg transition-colors"
        >
          🔄 Redo
        </button>
      </div>
    </div>
  );
}

export default function OutputCards({ result, brandData, onApprove, onRegenerate, approvedDM, approvedEmail }) {
  if (!result) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MessageCard
        title="Instagram DM"
        content={result.dm}
        approved={approvedDM}
        onApprove={(text) => onApprove('dm', text, brandData)}
        onRegenerate={onRegenerate}
      />
      <div className="flex flex-col gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2">
          <span className="text-xs text-gray-400">Subject: </span>
          <span className="text-sm text-white">{result.email_subject}</span>
        </div>
        <MessageCard
          title="Cold Email"
          content={result.email_body}
          approved={approvedEmail}
          onApprove={(text) => onApprove('email', text, brandData)}
          onRegenerate={onRegenerate}
        />
      </div>
    </div>
  );
}
```

### Step 13 — Create `src/components/PipelineLog.jsx`

```jsx
export default function PipelineLog({ entries, onToggleStatus }) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-white mb-3">Pipeline Log</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Niche</th>
              <th className="px-4 py-3">DM Preview</th>
              <th className="px-4 py-3">Email Preview</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {entries.map((entry, i) => (
              <tr key={i} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{entry.brandName}<br /><span className="text-gray-500 text-xs">@{entry.handle}</span></td>
                <td className="px-4 py-3 text-gray-300">{entry.niche}</td>
                <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{entry.dm}</td>
                <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{entry.email}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleStatus(i)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      entry.status === 'Sent'
                        ? 'bg-blue-900 text-blue-300'
                        : 'bg-green-900 text-green-300'
                    }`}
                  >
                    {entry.status}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{entry.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Step 14 — Build `src/App.jsx`

```jsx
import { useState } from 'react';
import BrandForm from './components/BrandForm';
import OutputCards from './components/OutputCards';
import PipelineLog from './components/PipelineLog';
import { generateOutreach } from './lib/claude';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [error, setError] = useState(null);
  const [approvedDM, setApprovedDM] = useState(false);
  const [approvedEmail, setApprovedEmail] = useState(false);
  const [pipeline, setPipeline] = useState([]);

  const handleGenerate = async (brandData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setApprovedDM(false);
    setApprovedEmail(false);
    setCurrentBrand(brandData);

    try {
      const output = await generateOutreach(brandData);
      setResult(output);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (type, text, brandData) => {
    if (type === 'dm') setApprovedDM(true);
    if (type === 'email') setApprovedEmail(true);

    // Add to pipeline log when both approved, or on first approval
    const existing = pipeline.find(e => e.brandName === brandData.brandName);
    if (!existing) {
      setPipeline(prev => [...prev, {
        brandName: brandData.brandName,
        handle: brandData.handle,
        niche: brandData.niche,
        dm: type === 'dm' ? text : result?.dm,
        email: type === 'email' ? text : result?.email_body,
        status: 'Approved',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    }
  };

  const handleToggleStatus = (index) => {
    setPipeline(prev => prev.map((e, i) =>
      i === index ? { ...e, status: e.status === 'Approved' ? 'Sent' : 'Approved' } : e
    ));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Agency Outreach Generator</h1>
          <p className="text-xs text-gray-500">Powered by Claude AI — Swimwear Influencer Agency</p>
        </div>
        <span className="text-xs bg-orange-900 text-orange-400 px-3 py-1 rounded-full">Demo</span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Brand Details</h2>
            <BrandForm onSubmit={handleGenerate} loading={loading} />
          </div>

          {/* Output */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Generated Outreach</h2>

            {loading && (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Crafting your outreach...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-sm text-red-300">
                <p className="font-semibold mb-1">Something went wrong</p>
                <p>{error}</p>
                {error.includes('demo limit') && (
                  <a href="https://jasonkhanani.com" className="mt-2 inline-block text-orange-400 underline">
                    → Get in touch to see more
                  </a>
                )}
              </div>
            )}

            {result && !loading && (
              <OutputCards
                result={result}
                brandData={currentBrand}
                onApprove={handleApprove}
                onRegenerate={() => handleGenerate(currentBrand)}
                approvedDM={approvedDM}
                approvedEmail={approvedEmail}
              />
            )}

            {!result && !loading && !error && (
              <div className="flex items-center justify-center h-48 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                <p className="text-sm">Fill in the brand details and click Generate</p>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Log */}
        <PipelineLog entries={pipeline} onToggleStatus={handleToggleStatus} />
      </main>
    </div>
  );
}
```

---

## Phase 5: Test Locally (15 min)

### Step 15 — Run with Netlify Dev
```bash
netlify dev
```

This starts everything on `http://localhost:8888`. The Netlify Function proxy runs alongside Vite automatically.

### Step 16 — Test the flow
1. Fill in a brand: "Monday Swimwear", handle "mondayswimwear", Swimwear, 100K–500K, Global
2. Click Generate — watch the spinner
3. Verify DM and email appear in both cards
4. Click Approve on both — check the pipeline log appears below
5. Click the status badge to toggle Approved → Sent
6. Try submitting 6 times quickly — verify the rate limit error appears on the 6th with the jasonkhanani.com link

---

## Phase 6: Deploy to Netlify (15 min)

### Step 17 — Initialise Netlify site
```bash
netlify init
# Choose: Create & configure a new site
# Team: your team
# Site name: agency-outreach-demo (or anything you like)
```

### Step 18 — Set environment variable
```bash
netlify env:set ANTHROPIC_API_KEY your_actual_key_here
```

### Step 19 — Deploy
```bash
netlify deploy --prod
```

Your live URL will look like: `https://agency-outreach-demo.netlify.app`

Copy this link — it goes in the proposal.

---
---

# DEMO B: n8n + Google Sheets Workflow

**Total time:** 3–5 hours  
**Prerequisites:** n8n cloud account, Anthropic API key, Google account, Telegram app

---

## Phase 1: Accounts & Credentials Setup (30 min)

### Step 1 — Create n8n Cloud account
- Go to [n8n.io](https://n8n.io) → Start for free
- Create a new workspace
- You'll land on the canvas — this is where you build

### Step 2 — Get your Anthropic API key
- Go to [console.anthropic.com](https://console.anthropic.com)
- API Keys → Create Key → copy it somewhere safe

### Step 3 — Set up Telegram Bot (for alerts)
1. Open Telegram → search for `@BotFather`
2. Send `/newbot`
3. Give it a name: `Agency Outreach Demo`
4. Give it a username: `agencyoutreachdemo_bot` (must end in `_bot`)
5. BotFather sends you a token — copy it (format: `123456789:ABCdef...`)
6. Start a chat with your new bot (search its username, hit Start)
7. Get your Chat ID: go to `https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates` in your browser — find `"chat":{"id":XXXXXXX}` — copy that number

### Step 4 — Create the Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com) → New spreadsheet
2. Name it: `Agency Outreach Demo`
3. Create two tabs (click + at the bottom):
   - Tab 1: rename to `Outreach Queue`
   - Tab 2: rename to `Pipeline`
4. In `Outreach Queue`, add these headers in Row 1:
   - A1: `Brand Name`
   - B1: `Handle`
   - C1: `Niche`
   - D1: `DM`
   - E1: `Email Subject`
   - F1: `Email Body`
   - G1: `Status`
   - H1: `Generated At`
   - I1: `Reply`
   - J1: `Classification`
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit`

---

## Phase 2: Connect Credentials in n8n (20 min)

### Step 5 — Add Anthropic API credential
1. In n8n, go to **Credentials** (left sidebar)
2. Click **Add Credential**
3. Search for `Anthropic` — if not listed, use `Header Auth` with:
   - Name: `Anthropic`
   - Header: `x-api-key`
   - Value: your Anthropic API key
4. Save

### Step 6 — Connect Google Sheets
1. In Credentials → Add Credential → `Google Sheets OAuth2 API`
2. Click Connect → sign in with your Google account → Allow access
3. Save — you'll see it listed as connected

### Step 7 — Add Telegram credential
1. Credentials → Add Credential → `Telegram`
2. Paste your Bot Token
3. Save

---

## Phase 3: Build the n8n Workflow (90 min)

Go to **Workflows** → **New Workflow**. Add nodes in this order:

### Step 8 — Node 1: Form Trigger
1. Click the **+** button on the canvas
2. Search for `n8n Form Trigger` → select it
3. Configure:
   - Form Title: `Generate Outreach`
   - Add fields:
     - `brand_name` (Text, Required)
     - `instagram_handle` (Text)
     - `niche` (Dropdown: Swimwear, Resort Wear, Sustainable Swimwear, Luxury Swimwear, Surf & Active)
     - `follower_count` (Dropdown: Under 10K, 10K–100K, 100K–500K, 500K+)
     - `market` (Dropdown: US, EU, SEA, Global)
4. Copy the form URL shown — you'll use this to trigger the workflow

### Step 9 — Node 2: Build Prompt (Code node)
1. Add node → search `Code` → select it
2. Connect it after the Form Trigger
3. Language: JavaScript
4. Paste this code:
```javascript
const systemPrompt = `You are an outreach specialist for a premium swimwear influencer agency.
Write personalized, warm outreach messages to swimwear brands inviting them to collaborate
with our curated roster of UGC creators and influencers.
Rules:
- Never sound salesy or templated
- Reference the brand niche naturally
- DM max 150 words, Email max 200 words + subject line
- Output ONLY valid JSON, no preamble, no markdown fences`;

const d = $input.first().json;

const userPrompt = `Brand: ${d.brand_name}
Instagram: @${d.instagram_handle || 'unknown'}
Niche: ${d.niche}
Followers: ${d.follower_count}
Market: ${d.market}

Output format:
{
  "dm": "...",
  "email_subject": "...",
  "email_body": "..."
}`;

return {
  systemPrompt,
  userPrompt,
  brand_name: d.brand_name,
  instagram_handle: d.instagram_handle,
  niche: d.niche,
  follower_count: d.follower_count,
  market: d.market,
};
```

### Step 10 — Node 3: Claude API Call (HTTP Request)
1. Add node → `HTTP Request`
2. Connect after Build Prompt
3. Configure:
   - Method: `POST`
   - URL: `https://api.anthropic.com/v1/messages`
   - Authentication: `Predefined Credential Type` → `Header Auth` → select your Anthropic credential
   - Add Headers manually:
     - `anthropic-version`: `2023-06-01`
     - `content-type`: `application/json`
   - Body: `JSON`
   - Paste this body (use **Expression** mode for dynamic values):
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1000,
  "system": "{{ $json.systemPrompt }}",
  "messages": [
    {
      "role": "user",
      "content": "{{ $json.userPrompt }}"
    }
  ]
}
```

### Step 11 — Node 4: Parse Response (Code node)
1. Add node → `Code`
2. Connect after Claude API Call
3. Paste:
```javascript
const raw = $input.first().json.content[0].text;

// Strip markdown fences if present
const clean = raw.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(clean);

// Pull original brand data from 2 nodes back
const brand = $('Build Prompt').first().json;

return {
  dm: parsed.dm,
  email_subject: parsed.email_subject,
  email_body: parsed.email_body,
  brand_name: brand.brand_name,
  handle: brand.instagram_handle || '',
  niche: brand.niche,
  status: 'Pending Review',
  generated_at: new Date().toISOString(),
};
```

### Step 12 — Node 5: Write to Google Sheets
1. Add node → `Google Sheets`
2. Connect after Parse Response
3. Configure:
   - Operation: `Append Row`
   - Credential: select your Google Sheets credential
   - Spreadsheet: search for `Agency Outreach Demo` (or paste Sheet ID)
   - Sheet: `Outreach Queue`
   - Map columns:
     - Brand Name → `{{ $json.brand_name }}`
     - Handle → `{{ $json.handle }}`
     - Niche → `{{ $json.niche }}`
     - DM → `{{ $json.dm }}`
     - Email Subject → `{{ $json.email_subject }}`
     - Email Body → `{{ $json.email_body }}`
     - Status → `{{ $json.status }}`
     - Generated At → `{{ $json.generated_at }}`

### Step 13 — Node 6: Simulate Reply (Set node)
1. Add node → `Edit Fields (Set)`
2. Connect after Google Sheets
3. Add field:
   - Name: `simulated_reply`
   - Value: `Hey! We'd love to learn more about your creators. What kind of brands do you typically work with?`
4. Also pass through `brand_name` and `handle` from previous node

### Step 14 — Node 7: Claude Reply Triage (HTTP Request)
1. Add another `HTTP Request` node
2. Connect after Simulate Reply
3. Same setup as Node 3 (same URL, headers, credential)
4. Body:
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 200,
  "messages": [
    {
      "role": "user",
      "content": "Classify this reply into exactly one of: INTERESTED, NOT_INTERESTED, FOLLOW_UP, SPAM\n\nReply: \"{{ $json.simulated_reply }}\"\n\nOutput ONLY valid JSON: { \"classification\": \"INTERESTED\", \"reason\": \"...\" }"
    }
  ]
}
```

### Step 15 — Node 8: Parse Classification (Code node)
1. Add `Code` node
2. Connect after Reply Triage
3. Paste:
```javascript
const raw = $input.first().json.content[0].text;
const clean = raw.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(clean);

const prev = $('Simulate Reply').first().json;

return {
  classification: parsed.classification,
  reason: parsed.reason,
  brand_name: prev.brand_name,
  handle: prev.handle,
  simulated_reply: prev.simulated_reply,
};
```

### Step 16 — Node 9: Update Google Sheets
1. Add `Google Sheets` node
2. Connect after Parse Classification
3. Configure:
   - Operation: `Update Row`
   - Spreadsheet: same sheet
   - Sheet: `Outreach Queue`
   - Match column: `Brand Name` = `{{ $json.brand_name }}`
   - Update:
     - Status → `{{ $json.classification }}`
     - Reply → `{{ $json.simulated_reply }}`
     - Classification → `{{ $json.classification }}`

### Step 17 — Node 10: IF Branch
1. Add `IF` node
2. Connect after Update Google Sheets
3. Condition:
   - Value 1: `{{ $json.classification }}`
   - Operation: `equals`
   - Value 2: `INTERESTED`

### Step 18 — Node 11: Telegram Alert (true branch only)
1. Add `Telegram` node
2. Connect to the **true** output of the IF node
3. Configure:
   - Credential: your Telegram credential
   - Chat ID: your chat ID (the number from Step 3)
   - Text:
```
🔥 NEW INTERESTED REPLY

Brand: {{ $json.brand_name }}
Handle: @{{ $json.handle }}

Their reply:
"{{ $json.simulated_reply }}"

Classification: {{ $json.classification }}
Reason: {{ $json.reason }}

→ View in Sheets: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID
```

---

## Phase 4: Test the Workflow (20 min)

### Step 19 — Activate and test
1. Click **Save** in top right
2. Click **Activate** (toggle at top)
3. Open the Form URL (from Node 1)
4. Fill in: Brand Name "Monday Swimwear", Handle "mondayswimwear", Swimwear, 100K–500K, Global
5. Submit
6. Watch the execution in n8n (click the workflow, executions appear at bottom)
7. Open your Google Sheet — you should see a new row in `Outreach Queue`
8. Check your Telegram — the alert should have arrived

### Step 20 — Verify each node ran correctly
- Node 2 (Build Prompt): check JSON output has `systemPrompt` and `userPrompt` fields
- Node 3 (Claude API): check `content[0].text` has valid JSON
- Node 4 (Parse): check `dm`, `email_subject`, `email_body` fields are populated
- Node 5 (Sheets): open Sheet — row should appear
- Node 7 (Triage): check classification came back as `INTERESTED`
- Node 8 (Parse): check `classification` = `INTERESTED`
- Node 9 (Update Sheets): status column should now show `INTERESTED`
- Node 11 (Telegram): message should have arrived

### Step 21 — Fix common issues
- **Node 3 fails with 401**: API key credential is wrong — re-check header name is exactly `x-api-key`
- **Node 4 JSON parse error**: Claude returned markdown fences — the strip regex in the code handles it; check the raw response in the execution log
- **Node 5 Sheets error**: OAuth token expired — re-authenticate Google credential
- **Node 9 can't find row**: `Brand Name` column match is case-sensitive — make sure column header matches exactly

---

## Phase 5: Export & Record Loom (30 min)

### Step 22 — Export the workflow
1. In n8n, open the workflow
2. Click the **⋮** menu → **Download**
3. Save as `demo-b/workflow.json` in your project

### Step 23 — Record the Loom
1. Open [loom.com](https://loom.com) → New Recording → Screen + Camera
2. Have open in separate tabs:
   - n8n canvas (workflow visible)
   - n8n form URL
   - Google Sheet
   - Telegram on phone (or Telegram Web)
3. Follow the script in `04-demo-version-b.md` — aim for 3–4 minutes
4. Keep camera on — founders respond to face + voice
5. Upload and get the shareable link

---

## Final Checklist Before Sharing

### Demo A
- [ ] Live on Netlify with a clean URL
- [ ] API key is NOT visible in browser DevTools (Network tab → check `/api/generate` request has no key in headers)
- [ ] Rate limit fires correctly after 5 attempts
- [ ] Rate limit message links to jasonkhanani.com
- [ ] Works on mobile (open on your phone)
- [ ] Tested with 3 different brands — output feels personalized, not templated

### Demo B
- [ ] Workflow runs end-to-end without errors
- [ ] Google Sheet populated correctly
- [ ] Telegram alert arrives with full context
- [ ] workflow.json exported to project folder
- [ ] Loom recorded, link copied
- [ ] Sheet is publicly viewable (File → Share → Anyone with link can view)

---

## How to Include in the Proposal

At the end of your proposal message, add:

```
I built a working prototype to show you how this would work:

→ Live demo: https://agency-outreach-demo.netlify.app
→ Loom walkthrough (n8n + Sheets): https://loom.com/share/...

Both took about 4 hours to build. The real system would take 2 weeks.
```

That's it. Let the demos do the talking.
