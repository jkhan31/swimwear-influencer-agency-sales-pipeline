# Demo Version A: Claude-Powered Outreach Generator (React Web App)

## Goal
A polished, shareable single-page web app that demonstrates the core AI outreach logic. The founder can use it live during a call or Jason can share a screenshot/recording in his proposal.

**Build time:** 2–3 hours  
**Tech:** React + Claude API (via Anthropic SDK)  
**Shareable as:** Claude artifact, or deployed to Netlify/Vercel

---

## What It Does (User Flow)

```
User inputs brand info → clicks Generate → Claude writes DM + Email → 
user approves or regenerates → approved messages appear in pipeline log below
```

### Step 1: Brand Input Form
User fills in:
- Brand Name (text input)
- Instagram Handle (text input, optional)
- Niche / Vibe (dropdown: Swimwear, Resort Wear, Sustainable, Luxury, Surf)
- Follower Count (dropdown: <10K, 10K–100K, 100K–500K, 500K+)
- Target Market (dropdown: US, EU, SEA, Global)

### Step 2: Generate Button
- Calls Claude Sonnet API with a structured prompt
- Shows a loading spinner with copy: *"Crafting your outreach..."*

### Step 3: Output Panel
Two side-by-side cards:
- **Instagram DM** (max 150 words) — with character count
- **Cold Email** (max 200 words) — with subject line

Each card has:
- ✅ Approve button
- 🔄 Regenerate button
- ✏️ Edit (textarea toggle)

### Step 4: Pipeline Log
Below the generator, a simple table showing all approved messages:
| Brand | Handle | Niche | DM Preview | Email Preview | Status | Timestamp |
- Status options: `Approved` / `Sent` (toggle manually)
- Table persists in React state during session

---

## Claude API Prompt

```javascript
const systemPrompt = `You are an outreach specialist for a premium swimwear influencer agency. 
Your job is to write personalized, warm outreach messages to swimwear brands 
inviting them to collaborate with our curated roster of UGC creators and influencers.

Rules:
- Never sound salesy or templated
- Reference the brand's niche and vibe naturally
- Be direct about the value proposition: real creators, real content, real results
- DM max 150 words, Email max 200 words + subject line
- Output ONLY valid JSON, no preamble, no markdown fences`;

const userPrompt = `Brand: ${brandName}
Instagram: @${handle}
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
```

---

## UI Design Notes

**Overall aesthetic:** Clean, minimal, professional. Dark sidebar or header with agency branding placeholder. Not a toy — looks like a real internal tool.

**Color palette:**
- Background: `#0f0f0f` or `#ffffff` (offer toggle)
- Accent: coral / warm orange (swimwear / beach vibe)
- Text: high contrast

**Layout:**
```
[Header: Agency Outreach Generator]
[Brand Input Form — left column]     [Output Cards — right column]
[Pipeline Log — full width below]
```

**Mobile:** Single column stack

---

## File Structure (Claude Code Project)

```
demo-a/
├── index.html
├── App.jsx              # Main component
├── components/
│   ├── BrandForm.jsx    # Input form
│   ├── OutputCards.jsx  # DM + Email cards side by side
│   ├── PipelineLog.jsx  # Approved messages table
│   └── LoadingSpinner.jsx
├── lib/
│   └── claude.js        # API call wrapper
├── styles/
│   └── globals.css
└── README.md
```

---

## Claude Code Instructions

Tell Claude Code:

```
Build a React single-page app called "Agency Outreach Generator". 

It should:
1. Have a form to input brand name, Instagram handle, niche (dropdown), follower count (dropdown), and target market (dropdown)
2. On submit, call the Anthropic API (claude-sonnet-4-20250514) with a prompt that generates a personalized Instagram DM and cold email as JSON
3. Display the DM and email in two side-by-side cards with approve, regenerate, and edit options
4. Log approved messages to a pipeline table below with columns: Brand, Niche, DM Preview, Email Preview, Status, Timestamp
5. Use a clean dark UI with coral/orange accents — should feel like a real internal tool, not a demo

Use the Anthropic JS SDK. API key from environment variable ANTHROPIC_API_KEY.
Use Tailwind CSS for styling.
No backend needed — all client side.
```

---

## How to Share / Present

**Option 1 — Live demo on call:**
Run locally (`npm run dev`), share screen, generate 2–3 brands live

**Option 2 — Deploy to Netlify:**
`netlify deploy` — get a shareable URL to include in proposal

**Option 3 — Screenshot + Loom:**
Record a 60-second Loom walkthrough, link in proposal

---

## What This Proves to the Founder

- You understand what they're trying to do (AI-generated personalized outreach)
- You can actually build with Claude API, not just talk about it
- You think in systems (input → process → output → log)
- The quality gate concept is built in (approve before send)
- You have taste — the UI looks like a real tool
