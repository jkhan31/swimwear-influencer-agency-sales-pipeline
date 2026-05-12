# Swimwear Agency Outreach System
### A demo project by Jason K Hanani

A working prototype of an AI-powered outreach and sales pipeline system built for a swimwear influencer agency. Built to demonstrate real capability as part of a job application.

---

## What This Is

A two-part demo showing how an influencer agency can use Claude AI + n8n + Google Sheets to send personalized outreach to swimwear brands at scale, triage replies automatically, and surface only warm leads to a human closer.

---

## Project Structure

```
/
├── README.md                   # This file
├── CLAUDE.md                   # Instructions for Claude Code
├── 01-job-posting.md           # Job posting + simplified breakdown
├── 02-solution-architecture.md # Full production system spec
├── 03-demo-version-a.md        # React app spec (Claude API + UI)
├── 04-demo-version-b.md        # n8n + Sheets workflow spec + Loom script
├── 05-project-summary.md       # Project context and goals
│
├── demo-a/                     # React web app (build this first)
│   ├── App.jsx
│   ├── components/
│   │   ├── BrandForm.jsx
│   │   ├── OutputCards.jsx
│   │   └── PipelineLog.jsx
│   ├── lib/
│   │   └── claude.js
│   └── index.html
│
└── demo-b/                     # n8n workflow export + Sheets template
    ├── workflow.json            # Importable n8n workflow
    └── sheets-template.md      # Sheet structure reference
```

---

## Demos

### Demo A — React Outreach Generator
A single-page web app where you input a brand's details and Claude generates a personalized Instagram DM + cold email instantly. Includes approve/reject flow, pipeline log, and IP-based rate limiting.

**Stack:** React, Tailwind CSS, Netlify Functions (server-side Claude API proxy)  
**Run locally:**
```bash
cd demo-a
npm install
netlify dev    # use netlify dev, not npm run dev — runs functions + frontend together
```

**Deploy to Netlify:**
```bash
netlify deploy --prod
```

Set `ANTHROPIC_API_KEY` in Netlify dashboard → Site Settings → Environment Variables. The key never touches the browser.

---

### Demo B — n8n + Google Sheets Workflow
A live n8n automation: brand input → Claude generates outreach → logs to Google Sheets → classifies incoming reply → Telegram alert for warm leads.

**Stack:** n8n cloud, Anthropic API, Google Sheets API, Telegram Bot  
**Setup:** See `04-demo-version-b.md` for full node-by-node instructions  
**Present as:** Loom walkthrough (script included in the spec)

---

## Environment Variables

```env
ANTHROPIC_API_KEY=your_key_here
```

Set this in **Netlify dashboard only** (Site Settings → Environment Variables). Never commit it or expose it client-side. The Netlify Function proxy reads it server-side.

---

## Key Design Decisions

- **Netlify Functions as proxy** — API key never exposed to the browser; all Claude calls go server-side
- **IP-based rate limiting** — 5 generations/hour, 10/day per IP to prevent token abuse on the public demo
- **Claude Sonnet** for outreach generation — best tone, most human-feeling output
- **Claude Haiku** for reply classification — faster and cheaper for simple tasks
- **n8n** over Make/Zapier — better support for agent-style logic and self-hosting
- **Google Sheets as CRM** — matches the agency's existing stack exactly
- **Human quality gate** — operator reviews all messages before they send; nothing ships blind

---

## Background

Built by Jason K Hanani as a working demo for a Marketing & Sales Agent role at a Bali-based swimwear influencer agency. Full background at [jasonkhanani.com](https://jasonkhanani.com).
