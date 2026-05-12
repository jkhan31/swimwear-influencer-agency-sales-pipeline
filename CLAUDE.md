# CLAUDE.md — Instructions for Claude Code

This file tells you everything you need to know to work on this project effectively. Read it fully before doing anything.

---

## What This Project Is

We're building a demo of an AI-powered outreach system for a swimwear influencer agency. The goal is to show a working prototype as part of a job application — not a production system, but something real enough to prove genuine capability.

**Current scope: Demo B only**

- **Demo B** — An n8n + Google Sheets workflow (in progress)

---

## Read These Files First

Before building Demo B, read these docs:

1. `05-project-summary.md` — Overall context, goals, and constraints
2. `04-demo-version-b.md` — Full spec for the n8n workflow

The architecture context is in `02-solution-architecture.md` if you need to understand the bigger picture.

---

## Build: Demo B (n8n Workflow)

Build the n8n workflow node by node as specified in `04-demo-version-b.md`. Export as `demo-b/workflow.json` when done.

The workflow should:
- Listen for incoming Instagram/email messages
- Classify replies using Claude
- Update Google Sheets with status
- Send Telegram alerts for interested brands

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

## File Structure

```
demo-b/
├── workflow.json              # n8n workflow (exported)
└── sheets-template.md         # Google Sheets setup guide
```

---

## What Good Looks Like

Demo B is done when:
- [ ] n8n workflow runs end-to-end without errors
- [ ] Output appears correctly in the Google Sheet
- [ ] Reply classification works and updates sheet status
- [ ] Telegram alert fires for INTERESTED replies
- [ ] Workflow exported as `demo-b/workflow.json`

---

## Common Pitfalls

- Claude sometimes wraps JSON in markdown fences (` ```json ``` `) even when told not to — always strip before parsing
- The Anthropic API requires the `anthropic-version` header — don't omit it
- n8n's Google Sheets node needs OAuth — set this up before building the workflow
- Keep DM under 150 words and email under 200 words — enforce in the prompt
- n8n workflow needs proper error handling — test each node independently before connecting

---

## Demo B Deliverable

When complete, the `demo-b/workflow.json` file will be the primary deliverable. Export the workflow from n8n and commit it to the repo.
