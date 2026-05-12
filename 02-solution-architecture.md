# Solution Architecture: AI-Powered Outreach & Sales Pipeline

## Overview

A fully automated outreach system for a swimwear influencer agency, built around n8n as the orchestration layer, Claude as the AI brain, and Google Sheets as the CRM. The human operator (Jason) acts as the quality gate and sales closer — not a manual worker.

---

## System Flow

```
Brand Discovery → Lead Enrichment → Outreach Generation → Delivery → Reply Triage → Human Closer → Pipeline Tracking → Weekly Report
```

---

## Component Breakdown

### 1. Brand Discovery & Lead Sourcing

**Purpose:** Build a database of qualified swimwear brands to target.

---

#### Full Pipeline Flow

```
Seed Input (hashtags / competitor accounts)
        ↓
Instagram Scraper (Apify or free alternative)
— handle, followers, bio, email if in bio —
        ↓
Filter Node (n8n)
— followers 10K–500K, engagement > 1.5%, niche match —
        ↓
Email Enrichment (Apollo.io / Hunter.io / bio parse)
        ↓
Dedup Check (Sheets COUNTIF)
        ↓
Google Sheets [Leads tab]
        ↓
Outreach Generation workflow
```

---

#### Instagram Discovery — Production Options

**Option 1 — Apify (recommended for production)**
- Pre-built, maintained Instagram scrapers that handle blocks and rate limits
- Inputs: hashtags (`#swimwear`, `#resortwear`, `#sustainableswimwear`), location tags, or a competitor's follower list
- Returns: handle, follower count, bio, website, email (if in bio), post count, engagement estimate
- Connects to n8n natively via HTTP Request node
- Cost: ~$50/month for moderate volume; free tier available for testing

**Option 2 — PhantomBuster**
- Better for scraping followers of a specific account (e.g. who follows a competitor swimwear brand)
- More plug-and-play than Apify, slightly less flexible
- Cost: ~$70/month
- Has n8n integration via webhook

**Option 3 — Manual curation + AI enrichment (safest)**
- Curate brands manually via Instagram search, hashtag browsing, or industry lists
- Paste handles into Google Sheets
- n8n reads each row, Claude scores the brand (niche fit, follower range, market) and writes a personalized outreach
- Zero scraping risk, lower volume, higher quality leads
- Best starting point before scaling to automation

> ⚠️ **Legal note:** Instagram scraping violates Meta's ToS. Small-volume outreach scraping is widely practised and rarely actioned, but worth knowing. Manual curation + Apollo for email finding is fully above board.

---

#### Instagram Discovery — Free Demo Stack

For the demo and early testing, skip paid scrapers entirely. Use this free stack:

**Step 1 — Manual Seed List**
- Search Instagram for: `#swimwear`, `#resortwear`, `#sustainableswimwear`, `#luxuryswimwear`
- Copy 20–30 brand handles into a Google Sheet manually
- Takes ~20 minutes, gives you a clean seed list

**Step 2 — Instaloader (free, open-source CLI)**
- Python tool that scrapes public Instagram profile data
- No API key needed, runs locally
- Install: `pip install instaloader`
- Usage:
```bash
# Scrape a single profile
instaloader --no-pictures --no-videos mondayswimwear

# Output: username, followers, bio, website, post count
```
- For demo: run on 10–20 handles from your seed list, export to CSV, import to Sheets
- Limitations: rate-limited by Instagram; fine for demo volume (20–50 profiles), not for production scale

**Step 3 — Bio Email Extraction (free, n8n Code node)**
- Many swimwear brands put their email directly in their Instagram bio
- Extract with a simple regex in n8n:
```javascript
const bio = $json.biography || "";
const emailMatch = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
return { email: emailMatch ? emailMatch[0] : null };
```
- Catches ~40–60% of brand emails for free

**Step 4 — Hunter.io Free Tier (email enrichment fallback)**
- 25 free email searches/month
- For brands without email in bio: search by domain (`hunter.io/search/mondayswimwear.com`)
- Returns verified business email + confidence score
- Free tier is enough for a demo of 20–25 brands

**Free Demo Stack Summary:**

| Step | Tool | Cost | Output |
|------|------|------|--------|
| Seed list | Manual Instagram search | Free | 20–30 handles in Sheets |
| Profile data | Instaloader (CLI) | Free | Followers, bio, website |
| Email from bio | n8n regex | Free | ~50% email coverage |
| Email enrichment | Hunter.io free tier | Free | 25 searches/month |
| **Total** | | **$0** | ~20 enriched leads |

---

#### Email Enrichment — Production Options

| Tool | Best For | Cost |
|------|----------|------|
| **Apollo.io** | Company + email search by industry/size | Free: 50/mo; Paid: $49/mo |
| **Hunter.io** | Domain-based email finding | Free: 25/mo; Paid: $49/mo |
| **Bio parsing** | Brands that list email in Instagram bio | Free |
| **Clearbit** | Enterprise enrichment with full company data | $99/mo+ |

**Recommended:** Start with bio parsing (free) + Hunter.io free tier for the demo. Upgrade to Apollo.io paid when volume requires it.

---

#### Lead Filtering Logic (n8n Code node)

After scraping, filter leads before they enter the outreach queue:

```javascript
const lead = $json;

const meetsFollowerRange = lead.followers >= 10000 && lead.followers <= 500000;
const hasEmail = !!lead.email;
const isSwimwearNiche = ["swim", "bikini", "resort", "beach", "surf"].some(
  kw => (lead.bio || "").toLowerCase().includes(kw)
);
const notAlreadyContacted = lead.status !== "Contacted";

const qualified = meetsFollowerRange && hasEmail && isSwimwearNiche && notAlreadyContacted;

return {
  ...lead,
  qualified,
  disqualify_reason: !qualified ?
    (!meetsFollowerRange ? "follower range" :
     !hasEmail ? "no email" :
     !isSwimwearNiche ? "niche mismatch" : "already contacted")
    : null
};
```

Only `qualified: true` leads proceed to outreach generation.

---

#### Fields Captured Per Lead

| Field | Source | Required |
|-------|--------|----------|
| Brand name | Scraper / manual | ✅ |
| Instagram handle | Scraper / manual | ✅ |
| Follower count | Scraper | ✅ |
| Bio text | Scraper | ✅ |
| Website URL | Scraper | — |
| Email | Bio parse / Hunter / Apollo | ✅ |
| Niche tags | Claude classification | — |
| Market / region | Manual or scraper | — |
| Engagement rate | Scraper (Apify) | — |
| Status | System | ✅ (`New`) |

---

### 2. Outreach Generation — Claude API

**Purpose:** Generate personalized, human-feeling DMs and cold emails for each brand.

**Tools:**
- **Claude Sonnet** (via API) — primary model for writing outreach copy
- **Claude Haiku** (via API) — cheaper model for classification, scoring, and tagging tasks
- **n8n** — orchestrates the prompt → API call → output flow

**Prompt Logic:**
```
System: You are an outreach specialist for a premium influencer agency...
User: Brand: {brand_name}
      Handle: {instagram_handle}
      Niche: {niche_tags}
      Followers: {follower_count}

      Write a personalized Instagram DM (max 150 words) and cold email (max 200 words)
      to propose a creator collaboration. Tone: warm, direct, not salesy.
      Output as JSON: { "dm": "...", "email": "..." }
```

**Output:** Two message variations per brand (DM + email), written to `[Outreach Queue]` tab in Sheets with status `Pending Review`

**Quality Gate (Jason's job):**
- Review batch in Sheets each morning
- Flag or edit any messages that feel off
- Approve batch → status changes to `Approved`

---

### 3. Delivery

**Purpose:** Send approved messages at scale across Instagram and email.

**Tools:**
- **Clowbot** (existing) — Instagram DM delivery via webhook trigger from n8n
- **Instantly or Smartlead** — email sequence delivery via API trigger from n8n

**Instagram Safety Rules:**
- Max 20–30 DMs/day per account during warmup phase
- Ramp to 50–80/day after 2–3 weeks
- Rotate accounts if volume needs to increase
- Never send identical messages — Claude variation handles this

**n8n Trigger Logic:**
- Scheduled daily (e.g. 9am Bali time)
- Pulls all `Approved` rows from Sheets
- Sends DM via Clowbot webhook
- Sends email via Instantly API
- Updates status to `Sent` + logs timestamp

---

### 4. Reply Triage Agent

**Purpose:** Automatically classify incoming replies so only warm leads reach Jason.

**Tools:**
- **Clowbot / Instantly webhook** — fires when a reply is received
- **n8n** — catches webhook, sends reply to Claude for classification
- **Claude Haiku** — classifies reply into one of four buckets

**Classification Prompt:**
```
Classify this reply into exactly one category:
- INTERESTED: Brand is open to learning more or asking questions
- NOT_INTERESTED: Brand declined or unsubscribed
- FOLLOW_UP: Brand is neutral, needs a nudge
- SPAM: Irrelevant or automated reply

Reply: {reply_text}

Output as JSON: { "classification": "INTERESTED", "reason": "..." }
```

**Routing Logic:**
- `INTERESTED` → Slack/Telegram alert to Jason with full context + suggested response draft
- `NOT_INTERESTED` → auto-archive in Sheets, status `Closed - Lost`
- `FOLLOW_UP` → schedule follow-up sequence in Instantly, status `Follow-Up Queued`
- `SPAM` → ignore, log only

---

### 5. Human Closer Layer (Jason)

**Purpose:** Convert warm replies into booked calls and closed deals.

**Workflow:**
1. Receive Slack/Telegram alert with brand name, their reply, and a Claude-drafted response suggestion
2. Review and send a personalized reply (edit the draft or write fresh)
3. Book discovery call via Calendly link
4. Run discovery call — qualify budget, timeline, creator fit
5. Send proposal (templated deck or one-pager)
6. Close deal → mark `Closed - Won` in Sheets

**Jason's Toolkit:**
- Calendly for call booking
- Proposal template (Google Slides or Notion)
- Sheets pipeline for tracking deal stage

---

### 6. Google Sheets CRM

**Purpose:** Single source of truth for the entire pipeline.

**Tabs:**
| Tab | Purpose |
|-----|---------|
| `Leads` | Raw brand database from discovery |
| `Outreach Queue` | Messages pending review + approved |
| `Pipeline` | Active deals by stage |
| `Closed` | Won and lost deals with reason |
| `Weekly Report` | Auto-generated summary metrics |

**Pipeline Stages:**
```
New Lead → Contacted → Replied → Qualified → Call Booked → Proposal Sent → Closed Won / Closed Lost
```

**Key Formulas:**
- `ARRAYFORMULA` — auto-populate calculated fields across rows
- `QUERY` — pull filtered views per stage, per week, per region
- `IMPORTRANGE` — connect multiple sheets if needed
- `SPARKLINE` — mini trend charts in the weekly report tab

**Apps Script Automation:**
- Daily: auto-flag leads with no activity in 7+ days
- Weekly: generate summary stats and email to founder

---

### 7. Weekly Report

**Auto-generated every Monday morning via Apps Script:**

```
Week of [date]

OUTREACH
- DMs sent: X
- Emails sent: X
- Reply rate: X%

PIPELINE
- New qualified leads: X
- Discovery calls booked: X
- Proposals sent: X
- Deals closed: X
- Revenue closed: €X

AUTOMATION HEALTH
- Avg message quality score: X/5
- Triage accuracy: X%
- Flagged issues: [list]
```

---

## Tech Stack Summary

### Production Stack

| Layer | Tool | Cost/mo |
|-------|------|---------|
| Orchestration | n8n (cloud or self-hosted) | $20 |
| AI Generation | Claude Sonnet + Haiku (API) | $30–50 |
| Instagram Scraping | Apify | $50 (or free tier) |
| Email Enrichment | Apollo.io / Hunter.io | $50–100 |
| Email Delivery | Instantly / Smartlead | $40–100 |
| Instagram DMs | Clowbot (existing) | — |
| CRM | Google Sheets | Free |
| Alerts | Slack or Telegram | Free |
| **Total** | | **~$190–320/mo** |

### Free Demo Stack

| Layer | Tool | Cost |
|-------|------|------|
| Orchestration | n8n cloud (free tier) | Free |
| AI Generation | Claude API (pay per use) | ~$1–2 for demo |
| Instagram Scraping | Instaloader (CLI) | Free |
| Email Enrichment | Hunter.io free tier + bio parsing | Free |
| Email Delivery | Skipped (simulated in demo) | Free |
| Instagram DMs | Skipped (simulated in demo) | Free |
| CRM | Google Sheets | Free |
| Alerts | Telegram bot | Free |
| **Total** | | **~$1–2** |

---

## 30-Day Build Plan

### Week 1 — Audit & Map
- Audit existing Claude prompts and Clowbot setup
- Identify quality gaps in current outreach
- Set up Google Sheets CRM structure
- Run first manual seed list (20–30 brands via Instaloader)
- Document current pipeline state

### Week 2 — Build Core Flow
- n8n: lead input → filter → Claude generation → Sheets queue
- Build review/approve workflow in Sheets
- Connect Clowbot and Instantly triggers
- Set up bio email parsing in n8n

### Week 3 — Add Intelligence
- Build reply triage agent (Claude Haiku classifier)
- Set up Slack/Telegram alert system
- Add Apollo.io enrichment for brands without emails
- Test full end-to-end flow with small batch (10–20 brands)

### Week 4 — Go Live & Optimize
- Run first full live batch
- Monitor quality, refine prompts based on reply rates
- Deliver first weekly report to founder
- Document everything for handover/scaling

---

## Key Design Principles

1. **AI fills the funnel, human closes deals** — never fully automate the close
2. **Quality gate before every send** — Jason reviews before anything ships
3. **Everything logged** — no black boxes, full audit trail in Sheets
4. **Prompt versioning** — track which prompt version generated each message for A/B learning
5. **Fail safely** — if n8n fails, Sheets still shows pending queue; nothing is lost
6. **Start free, scale paid** — Instaloader + Hunter free tier for demo, Apify + Apollo for production
