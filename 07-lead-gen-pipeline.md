# Lead Generation Pipeline — Full Architecture
## Generalized B2B Outreach System (n8n + Claude + Google Sheets)

**Author:** Jason K Hanani  
**Status:** WIP — build target  
**Stack:** Self-hosted n8n · Claude API · Apollo.io · Outscraper · Google Workspace · Gmail SMTP  
**Repo:** swimwear-influencer-agency-sales-pipeline (generalized from swimwear demo)

---

## What This Solves

The existing demo (`agency-outreach-demo-n8n.json`) starts from an existing list of leads. This pipeline adds the missing **top-of-funnel layer** — sourcing and enriching leads automatically before they enter the outreach queue.

The full system now covers:

```
Lead Sourcing → Enrichment → Dedup → Outreach Generation → Delivery → Reply Classification → CRM Logging → Alert
```

Previously the system started at **Outreach Generation**. This doc covers everything before it.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    LEAD SOURCING LAYER                       │
│                                                             │
│  [Trigger: Manual / Scheduled]                              │
│         ↓                                                   │
│  [Source Router]                                            │
│  ┌──────────────┬──────────────────┬──────────────────┐    │
│  │ Apollo.io    │ Outscraper       │ Manual CSV        │    │
│  │ (B2B DB)     │ (Google Maps)    │ (fallback)        │    │
│  └──────┬───────┴────────┬─────────┴────────┬──────────┘    │
│         └────────────────┴──────────────────┘               │
│                          ↓                                   │
│  [Enrichment Node — Apollo / Hunter.io]                     │
│                          ↓                                   │
│  [Filter & Qualify Node]                                    │
│                          ↓                                   │
│  [Dedup Check — Google Sheets COUNTIF]                      │
│                          ↓                                   │
│  [Write to Sheets: Leads Tab — status: NEW]                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  OUTREACH GENERATION LAYER                   │
│  (existing demo — Claude Sonnet → email + DM generation)    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  REPLY HANDLING LAYER                        │
│  (existing demo — Claude Haiku classifier → alert)          │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 1: Lead Sourcing

### Two Primary Sources

#### Source A — Apollo.io API (Best for B2B)

Apollo has a database of ~275M contacts and ~73M companies. Search by industry, company size, job title, and location. No scraping required — fully above-board API access.

**What it returns per lead:**
- First name, last name, job title
- Company name, website, industry, employee count
- Verified business email (when available)
- LinkedIn URL
- Phone (paid tier)

**Free tier limits:** 50 email credits/month — enough for testing and demo.

**n8n implementation:**

```
HTTP Request Node
  Method: POST
  URL: https://api.apollo.io/v1/mixed_people/search
  Headers:
    Content-Type: application/json
    Cache-Control: no-cache
  Body (JSON):
    {
      "api_key": "{{ $env.APOLLO_API_KEY }}",
      "q_organization_industry_tag_ids": ["marketing_agency"],
      "organization_num_employees_ranges": ["1,50"],
      "person_titles": ["founder", "owner", "ceo", "head of marketing"],
      "person_locations": ["United States", "United Kingdom", "Australia"],
      "page": 1,
      "per_page": 25
    }
```

**Key parameters to customize per client niche:**
- `q_organization_industry_tag_ids` — industry filter
- `organization_num_employees_ranges` — company size
- `person_titles` — decision maker titles
- `person_locations` — target geography

---

#### Source B — Outscraper / Google Maps (Best for Local B2B)

Use when the target is local businesses: clinics, restaurants, real estate agents, gyms, law firms. Apollo doesn't cover these well. Google Maps does.

**What it returns per lead:**
- Business name, address, phone
- Website URL
- Google rating + review count
- Category / niche

**n8n implementation:**

```
HTTP Request Node
  Method: GET
  URL: https://api.outscraper.com/maps/search-v3
  Query Parameters:
    query: "digital marketing agency London"
    language: en
    region: GB
    limit: 25
    async: false
  Headers:
    X-API-KEY: {{ $env.OUTSCRAPER_API_KEY }}
```

**Then pass website URLs to email finder (Hunter.io or Apollo) to get contact emails.**

**Free tier:** Outscraper gives ~50 free results on signup. After that ~$3 per 1,000 results — very cheap.

---

#### Source C — Manual CSV Upload (Fallback)

For clients who already have a partial list, or for niche markets not covered by Apollo/GMaps.

```
n8n: Google Sheets Trigger or CSV Read node
→ Parse rows
→ Skip straight to Enrichment
→ Continue normal flow
```

---

### Source Router Logic (n8n Switch Node)

```javascript
// Switch node — routes based on trigger input
const source = $json.source_type;

if (source === "apollo") return 0;      // Route to Apollo HTTP Request
if (source === "gmaps") return 1;       // Route to Outscraper HTTP Request  
if (source === "manual") return 2;      // Route to Sheets read
```

This means one workflow handles all three sourcing methods. The operator picks the source when triggering the workflow.

---

## Part 2: Enrichment

After sourcing, not every lead will have a verified email. Enrichment fills the gaps.

### Email Finding Priority Order

```
1. Apollo returned email?          → Use it (highest confidence)
2. Email in GMaps listing?         → Use it
3. Hunter.io domain search?        → Use if confidence > 70%
4. No email found?                 → Flag as "No Email" in Sheets, skip outreach
```

**Hunter.io n8n node:**

```
HTTP Request Node
  Method: GET
  URL: https://api.hunter.io/v2/domain-search
  Query Parameters:
    domain: {{ $json.website_domain }}
    api_key: {{ $env.HUNTER_API_KEY }}
    limit: 1
```

Parse response:
```javascript
const data = $json.data;
const topEmail = data?.emails?.[0];

return {
  email: topEmail?.value || null,
  email_confidence: topEmail?.confidence || 0,
  email_source: "hunter"
};
```

---

## Part 3: Filtering & Qualification

Before any lead enters the outreach queue, run them through a qualification check. This keeps the pipeline clean and prevents wasted API calls on bad leads.

**n8n Code Node:**

```javascript
const lead = $json;

// Required fields check
const hasEmail = !!lead.email && lead.email_confidence >= 70;
const hasName = !!(lead.first_name || lead.company_name);
const hasContext = !!(lead.company_name || lead.industry);

// Quality gate
const qualified = hasEmail && hasName && hasContext;

// Disqualify reason (for logging)
let disqualify_reason = null;
if (!hasEmail) disqualify_reason = "no_verified_email";
else if (!hasName) disqualify_reason = "missing_name";
else if (!hasContext) disqualify_reason = "missing_company_context";

return {
  ...lead,
  qualified,
  disqualify_reason,
  sourced_at: new Date().toISOString()
};
```

Only `qualified: true` leads proceed. Disqualified leads are still logged to Sheets for review.

---

## Part 4: Deduplication

Prevents the same lead from being contacted twice — critical when running multiple sourcing batches.

**n8n Google Sheets node — COUNTIF check:**

```javascript
// After writing lead to a temp holding row,
// check if email already exists in Leads tab

// In Sheets: add a helper column with:
// =COUNTIF(B:B, B2) > 1
// Flag duplicates before they enter queue

// OR handle in n8n with a Read Sheets → find matching email → branch
const existingLeads = $node["Read Leads Sheet"].json;
const isDuplicate = existingLeads.some(row => row.email === $json.email);

if (isDuplicate) {
  return { ....$json, skip: true, skip_reason: "duplicate" };
}
return { ....$json, skip: false };
```

---

## Part 5: Write to Google Sheets

All leads (qualified and disqualified) get written to the **Leads tab** for full audit trail.

### Leads Tab Schema

| Column | Field | Source |
|--------|-------|--------|
| A | Lead ID | Auto (timestamp + index) |
| B | Email | Apollo / Hunter / GMaps |
| C | First Name | Apollo / manual |
| D | Last Name | Apollo / manual |
| E | Company | Apollo / GMaps |
| F | Job Title | Apollo |
| G | Industry | Apollo / tag |
| H | Website | Apollo / GMaps |
| I | LinkedIn URL | Apollo |
| J | Source | apollo / gmaps / manual |
| K | Qualified | TRUE / FALSE |
| L | Disqualify Reason | Filter node output |
| M | Status | NEW → CONTACTED → REPLIED → CLOSED |
| N | Sourced At | Timestamp |
| O | Last Updated | Auto-updated |

---

## Part 6: Handoff to Outreach Generation

Once a lead is written to Sheets with `Status: NEW` and `Qualified: TRUE`, the outreach generation workflow picks it up.

**Trigger options:**
- **Scheduled:** n8n polls Sheets every hour for new `NEW` leads and processes them in batches
- **Webhook:** Sheets Apps Script fires a webhook to n8n when a new row is added

**Recommended:** Scheduled polling — simpler, no Apps Script needed.

```
n8n Schedule Trigger (every 1 hour)
  ↓
Read Sheets — filter Status = "NEW" AND Qualified = TRUE
  ↓
Limit node (max 10 per batch — control API spend)
  ↓
Claude Sonnet — generate personalized email
  ↓
Update Sheets — Status → "OUTREACH_QUEUED"
  ↓
[Existing outreach delivery workflow takes over]
```

---

## Part 7: Adapting for Instagram / IG Scraping (Bali Use Case)

For the Bali posting specifically, the lead source is Instagram accounts rather than B2B databases. The architecture is the same — only the sourcing node changes.

### IG Source Options (ranked by stability)

| Option | Tool | Cost | Stability |
|--------|------|------|-----------|
| Hashtag search | Apify IG Scraper | ~$50/mo | Medium |
| Competitor followers | PhantomBuster | ~$70/mo | Medium |
| Manual + Instaloader | Instaloader CLI | Free | Low volume only |

### IG Lead Schema (replaces Apollo fields)

| Column | Field |
|--------|-------|
| B | Email (from bio or Hunter) |
| C | Instagram Handle |
| D | Account Name |
| E | Follower Count |
| F | Bio Text |
| G | Website |
| H | Niche Tags (Claude-classified) |
| I | Engagement Rate |

### IG Qualification Filter

```javascript
const lead = $json;

const followerRange = lead.followers >= 10000 && lead.followers <= 500000;
const hasEmail = !!lead.email;
const nicheMatch = ["swim", "bikini", "resort", "surf", "beach"].some(
  kw => (lead.bio || "").toLowerCase().includes(kw)
);

return {
  ...lead,
  qualified: followerRange && hasEmail && nicheMatch
};
```

---

## Full Node Map (n8n Canvas)

```
[Manual Trigger / Schedule Trigger]
        ↓
[Set: source_type = "apollo" | "gmaps" | "manual"]
        ↓
[Switch: Route by source_type]
   ↓            ↓              ↓
[Apollo     [Outscraper    [Read CSV /
 API Call]   API Call]      Sheets]
   ↓            ↓              ↓
[Merge — normalize to common schema]
        ↓
[Enrichment — Hunter.io email finder]
        ↓
[Code: Filter & Qualify]
        ↓
[Code: Dedup Check vs Sheets]
        ↓
[IF: qualified AND not duplicate]
   ↓                    ↓
[Write to          [Write to
 Leads tab]         Leads tab
 Status: NEW]       Status: DISQUALIFIED]
        ↓
[Update: Sourced_At timestamp]
        ↓
[→ Outreach Generation Workflow picks up from here]
```

---

## Environment Variables Required

```
APOLLO_API_KEY=your_apollo_key
OUTSCRAPER_API_KEY=your_outscraper_key
HUNTER_API_KEY=your_hunter_key
ANTHROPIC_API_KEY=your_claude_key
GOOGLE_SHEETS_ID=your_sheet_id
```

Set these in n8n → Settings → Environment Variables. Never hardcode in workflow nodes.

---

## Cost Estimate (Live Client)

| Tool | Usage | Cost/mo |
|------|-------|---------|
| Apollo.io | 50 credits free / $49 paid | $0–49 |
| Outscraper | ~$3 per 1,000 results | $5–15 |
| Hunter.io | 25 free / $49 paid | $0–49 |
| Claude Haiku (classification) | ~$2–5 | $2–5 |
| Claude Sonnet (generation) | ~$10–20 | $10–20 |
| n8n self-hosted | VPS already running | $0 |
| Gmail SMTP | Free | $0 |
| Google Sheets | Free | $0 |
| **Total** | | **~$17–138/mo** |

Pass tool costs through to client — a paying client at €2,500 project fee won't balk at $50/mo in API costs.

---

## Build Order

**Phase 1 — Core sourcing (this doc)**
- [ ] Apollo.io account + API key
- [ ] Outscraper account + API key (free tier to start)
- [ ] Hunter.io account + API key (free tier)
- [ ] Build sourcing workflow in n8n
- [ ] Test with 10 leads end-to-end → Sheets

**Phase 2 — Connect to existing outreach workflow**
- [ ] Wire Leads tab → outreach generation trigger
- [ ] Test full loop: source → enrich → qualify → generate → send → classify → log

**Phase 3 — Demo + Loom**
- [ ] Record end-to-end Loom (source a lead live, show it hit Sheets, show email generated)
- [ ] Update GitHub repo with this doc + new workflow JSON
- [ ] Submit Bali proposal with updated demo link

**Phase 4 — Generalize for sale**
- [ ] Remove swimwear-specific prompts, make niche configurable via input
- [ ] Write client-facing README (non-technical)
- [ ] Price: €2,500 build + €199/mo retainer

---

## Notes & Decisions

- **Apollo over GMaps as default** — covers most B2B use cases without scraping risk
- **GMaps for local business clients** — restaurants, clinics, real estate; Apollo doesn't index these well
- **Hunter as fallback only** — Apollo emails are generally higher confidence
- **Batch size capped at 10/hour** — prevents Gmail sending limits and Claude API rate issues during initial run
- **Everything logged** — even disqualified leads go to Sheets; nothing is silently dropped
- **Human review before send** — operator approves outreach queue before delivery; never fully autonomous
