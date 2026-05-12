# Project Summary: Swimwear Agency Outreach System

## What We're Building & Why

We're applying for a Marketing & Sales Agent role at a Bali-based swimwear influencer agency. To stand out, we're building a working demo that proves we can operate and improve their AI outreach system — not just talk about it.

---

## The Agency's Problem (In One Sentence)

They need to send hundreds of personalized outreach messages to swimwear brands every week, handle the replies intelligently, and close the deals — without hiring a large team.

---

## Their Current Stack

- **Claude + Clowbot** — sends Instagram DMs and emails automatically
- **Google Sheets** — their entire CRM and pipeline tracker
- **Manual human** — currently reviews AI output, qualifies replies, closes deals

---

## What We're Adding / Improving

1. **Smarter prompts** — Claude generates truly personalized messages per brand, not templated blasts
2. **Reply triage agent** — AI classifies every reply (Interested / Not Interested / Follow-Up / Spam) so only warm leads reach the human
3. **Proper Sheets CRM** — structured pipeline with auto-calculations, stage tracking, and weekly auto-report
4. **Human closer layer** — operator (Jason) handles all qualified leads personally: discovery call → proposal → close

---

## Demo Goals

We're building two demos to include in the job proposal:

### Demo A — React Web App
A clean single-page app where you input a brand's details and Claude instantly generates a personalized Instagram DM + cold email. Includes an approve/reject flow and a pipeline log. Shows the AI generation logic in a polished UI.

**Purpose:** Visually impressive, immediately shareable, proves Claude API competency.

### Demo B — n8n + Google Sheets Workflow
A live n8n automation that takes a brand input, calls Claude to generate outreach, logs it to Google Sheets, simulates an incoming reply, classifies it with Claude, and sends a Telegram alert if the brand is interested.

**Purpose:** Mirrors their actual stack exactly. Proves you can build the real system, not just a mockup.

---

## Key Files in This Project

| File | Purpose |
|------|---------|
| `01-job-posting.md` | Full job posting + simplified summary of what they want |
| `02-solution-architecture.md` | Full technical spec of the production system |
| `03-demo-version-a.md` | Spec for React demo (Claude API + UI) |
| `04-demo-version-b.md` | Spec for n8n + Sheets demo + Loom script |
| `05-project-summary.md` | This file — overall context for Claude Code |

---

## Build Priority

1. **Start with Demo A** — fastest to build, shareable immediately
2. **Then Demo B** — more impressive to a technical founder, takes longer

---

## Technical Constraints

- Claude API model to use: `claude-sonnet-4-20250514`
- All prompts should request JSON output only (no markdown fences, no preamble)
- Demo A: React + Tailwind, no backend, API key via environment variable
- Demo B: n8n cloud, Google Sheets OAuth, Telegram bot for alerts
- UI aesthetic: clean, minimal, professional — dark mode preferred, coral/warm accent

---

## Tone / Framing for the Proposal

- We're pitching as an **AI operator + systems builder**, not a salesperson
- Strongest proof point from Jason's background: integrated AI chatbot at Zalora → 68% ticket deflection, 24/7 coverage
- Honest gap: no direct B2B cold outreach sales experience — frame as "learning the close, already have the system"
- Jason is already in Bali — lead with this when relevant

---

## Success Criteria for the Demo

The founder should be able to watch a 60-second Loom or click a link and think:
> "This person already built what I need. I just need to point them at our system."
