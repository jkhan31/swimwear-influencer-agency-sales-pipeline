# Demo Version B: n8n + Google Sheets Live Workflow

## Goal
A working n8n automation that mirrors their actual stack — brand input triggers Claude to generate outreach, logs everything to Google Sheets, and classifies a sample reply. Presented as a Loom video walkthrough.

**Build time:** 3–5 hours  
**Tech:** n8n (cloud), Claude API, Google Sheets API  
**Deliverable:** Loom video (3–5 min) + shareable n8n workflow JSON + live Google Sheet link

---

## What It Does

```
[Manual Trigger: Brand Name Input]
        ↓
[n8n: Build prompt with brand details]
        ↓
[Claude API: Generate DM + Email as JSON]
        ↓
[Google Sheets: Log to Outreach Queue tab]
        ↓
[Simulate Reply: Run reply through triage agent]
        ↓
[Claude API: Classify reply as INTERESTED / NOT_INTERESTED / FOLLOW_UP]
        ↓
[Google Sheets: Update status + log classification]
        ↓
[Telegram/Slack: Send alert if INTERESTED]
```

---

## n8n Workflow Nodes

### Node 1: Manual Trigger (or Form Trigger)
- Type: `Manual Trigger` or `n8n Form`
- Inputs: brand_name, instagram_handle, niche, follower_count, market
- For demo: use n8n's built-in form trigger for a clean input UI

### Node 2: Build Prompt
- Type: `Code` node (JavaScript)
- Assembles the Claude prompt from trigger inputs
```javascript
const systemPrompt = `You are an outreach specialist for a premium swimwear influencer agency...`;

const userPrompt = `Brand: ${$json.brand_name}
Instagram: @${$json.instagram_handle}
Niche: ${$json.niche}
Followers: ${$json.follower_count}
Market: ${$json.market}

Generate a personalized Instagram DM (max 150 words) and cold email (max 200 words + subject line).
Output ONLY valid JSON: { "dm": "...", "email_subject": "...", "email_body": "..." }`;

return { systemPrompt, userPrompt, ...($json) };
```

### Node 3: Claude API Call (Outreach Generation)
- Type: `HTTP Request`
- Method: POST
- URL: `https://api.anthropic.com/v1/messages`
- Headers:
  - `x-api-key: {{ $env.ANTHROPIC_API_KEY }}`
  - `anthropic-version: 2023-06-01`
  - `content-type: application/json`
- Body:
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1000,
  "system": "{{ $json.systemPrompt }}",
  "messages": [{ "role": "user", "content": "{{ $json.userPrompt }}" }]
}
```

### Node 4: Parse Claude Response
- Type: `Code` node
- Extract and parse the JSON from Claude's response
```javascript
const raw = $json.content[0].text;
const parsed = JSON.parse(raw);
return {
  dm: parsed.dm,
  email_subject: parsed.email_subject,
  email_body: parsed.email_body,
  brand_name: $('Manual Trigger').item.json.brand_name,
  handle: $('Manual Trigger').item.json.instagram_handle,
  niche: $('Manual Trigger').item.json.niche,
  status: 'Pending Review',
  generated_at: new Date().toISOString()
};
```

### Node 5: Write to Google Sheets (Outreach Queue)
- Type: `Google Sheets` node
- Operation: `Append Row`
- Sheet: `Outreach Queue`
- Columns: Brand Name, Handle, Niche, DM, Email Subject, Email Body, Status, Generated At

### Node 6: Simulate Incoming Reply (Demo Only)
- Type: `Set` node
- Hardcode a sample reply for demo purposes
```
"Hey! We'd love to learn more about your creators. 
What kind of brands do you typically work with?"
```

### Node 7: Claude Reply Triage (Classification)
- Type: `HTTP Request` (same Claude API call)
- Prompt:
```
Classify this reply into exactly one of: INTERESTED, NOT_INTERESTED, FOLLOW_UP, SPAM

Reply: "{{ $json.simulated_reply }}"

Output ONLY valid JSON: { "classification": "INTERESTED", "reason": "Brand is asking about creator fit" }
```

### Node 8: Update Google Sheets (Status Update)
- Type: `Google Sheets` node
- Operation: `Update Row` (match on Brand Name)
- Update: Status → classification result, Reply → simulated reply text

### Node 9: Conditional Branch
- Type: `IF` node
- Condition: `classification == "INTERESTED"`
- True → Node 10 (Send Alert)
- False → End

### Node 10: Send Telegram / Slack Alert
- Type: `Telegram` or `Slack` node
- Message:
```
🔥 NEW INTERESTED REPLY

Brand: {{ $json.brand_name }}
Handle: @{{ $json.handle }}

Their reply: "{{ $json.simulated_reply }}"

Suggested response: [Claude-drafted reply here]

→ View in Sheets: [link]
```

---

## Google Sheets Structure

### Tab: Outreach Queue
| Brand Name | Handle | Niche | DM | Email Subject | Email Body | Status | Generated At | Reply | Classification |
|---|---|---|---|---|---|---|---|---|---|

### Tab: Pipeline
| Brand | Stage | Owner | Next Action | Last Updated |
|---|---|---|---|---|

**Status values:**
- `Pending Review` → `Approved` → `Sent` → `Replied` → `Qualified` → `Closed Won` / `Closed Lost`

---

## Loom Video Script (3–5 minutes)

**[0:00–0:30] — Intro**
> "Hey — I wanted to show you a working prototype of how I'd build your outreach system. This is n8n connected to Claude and Google Sheets. Let me walk you through it."

**[0:30–1:30] — Trigger the workflow**
> Open n8n form, fill in a real swimwear brand (e.g. "Monday Swimwear"), hit submit. Show the workflow executing node by node.

**[1:30–2:30] — Show Google Sheets output**
> Cut to the Google Sheet. Show the DM and email that just appeared. Read a line or two — point out the personalization. "Claude pulled in their niche and wrote something that doesn't sound like a template."

**[2:30–3:30] — Reply triage**
> "Now here's the part that saves the most time. When a brand replies, the system reads it and classifies it automatically." Show the simulated reply hitting the sheet and the status updating to INTERESTED.

**[3:30–4:00] — Telegram alert**
> Show the Telegram message arriving. "This is the only thing that lands on the operator's desk — a warm lead, their reply, and a suggested response. Everything else is handled automatically."

**[4:00–4:30] — Close**
> "This is a stripped-down version of what I'd build for you in the first two weeks. Happy to walk through it on a call."

---

## Setup Checklist

- [ ] n8n cloud account (free tier works for demo)
- [ ] Anthropic API key (set as n8n credential)
- [ ] Google Sheets API connected to n8n via OAuth
- [ ] Demo Google Sheet created with correct tab/column structure
- [ ] Telegram bot set up (BotFather → get token → add to n8n)
- [ ] Loom account for recording
- [ ] Test run with 2–3 sample brands before recording

---

## What This Proves to the Founder

- You already understand their exact stack (n8n + Claude + Sheets)
- You can build end-to-end, not just configure tools
- The reply triage logic is working — not theoretical
- You think in alerts and human escalation, not full automation
- You're already operating at the level they need — no ramp-up required
