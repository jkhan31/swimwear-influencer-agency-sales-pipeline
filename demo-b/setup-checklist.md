# Demo B Setup Checklist — Parallel Installation

Follow these steps in parallel. You can set up accounts while Claude builds the workflow.json.

---

## Phase 1: Create Accounts (30 min)

### Step 1 — n8n Cloud Account
- [ ] Go to https://n8n.io → "Start for free"
- [ ] Sign up with email
- [ ] Create a workspace
- [ ] Land on the canvas (you'll import the workflow here)
- **Note:** Keep this tab open; you'll need it later

### Step 2 — API Keys (Anthropic, Apollo, Hunter)
**Anthropic API Key (REQUIRED):**
- [ ] Go to https://console.anthropic.com
- [ ] Navigate to "API Keys"
- [ ] Click "Create Key"
- [ ] Copy the key somewhere safe
- **Note:** This key should never be shared or committed to git

**Apollo.io API Key (OPTIONAL — for automated lead sourcing):**
- [ ] Go to https://www.apollo.io
- [ ] Sign up (free tier: 50 credits/month)
- [ ] Navigate to API settings
- [ ] Copy your API key
- **Note:** If you don't set this up, the sourcing workflow uses hardcoded sample brands for demo

**Hunter.io API Key (OPTIONAL — for email enrichment):**
- [ ] Go to https://hunter.io
- [ ] Sign up (free tier: 25 emails/month)
- [ ] Navigate to API settings
- [ ] Copy your API key
- **Note:** If you don't set this up, sourcing workflow skips email enrichment

### Step 3 — Google Sheet Setup
- [ ] Go to https://sheets.google.com
- [ ] Click "New spreadsheet"
- [ ] Name it: `Agency Outreach Demo`
- [ ] Add three sheet tabs:
  1. **Leads** — sourced and enriched leads (from lead-sourcing workflow)
  2. **Outreach Queue** — generated messages (from outreach workflow)
  3. **Pipeline** — manual deal tracking
- [ ] Copy the sheet headers from `sheets-template.md` into each tab (headers in Row 1)

**Leads tab headers (15 columns):**
```
A: Lead ID | B: Email | C: First Name | D: Last Name | E: Company | 
F: Job Title | G: Industry | H: Website | I: Instagram Handle | J: Source | 
K: Qualified | L: Disqualify Reason | M: Status | N: Sourced At | O: Last Updated
```

**Outreach Queue headers (10 columns):**
```
A: Brand Name | B: Handle | C: Niche | D: DM | E: Email Subject | 
F: Email Body | G: Status | H: Generated At | I: Reply | J: Classification
```

**Pipeline headers (5 columns):**
```
A: Brand | B: Stage | C: Owner | D: Next Action | E: Last Updated
```

- [ ] Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID_HERE}/edit`
- **Note:** You'll paste this Sheet ID into n8n later

---

## Phase 2: n8n Credentials Setup (15 min)

### Step 4 — Add Anthropic Credential
- [ ] In n8n, go to **Credentials** (left sidebar)
- [ ] Click **Add Credential**
- [ ] Search for `Header Auth` (or create manually)
- [ ] Create credential:
  - Name: `Anthropic`
  - Header: `x-api-key`
  - Value: `{your Anthropic API key from Step 2}`
- [ ] Save and test
- **Note:** Copy down the credential ID (you'll need it for workflow.json)

### Step 5 — Connect Google Sheets OAuth2
- [ ] In Credentials → **Add Credential**
- [ ] Search for `Google Sheets OAuth2 API`
- [ ] Click **Connect** → sign in with your Google account
- [ ] Allow access when prompted
- [ ] Save
- **Note:** Copy down the credential ID

### Step 6 — Set Up Environment Variables (Optional but Recommended)
- [ ] In n8n, go to **Settings** → **Environment Variables**
- [ ] Add these variables (paste the keys from Step 2):
  - `ANTHROPIC_API_KEY` = {your Anthropic key}
  - `APOLLO_API_KEY` = {your Apollo key, if you have one}
  - `HUNTER_API_KEY` = {your Hunter key, if you have one}
  - `GOOGLE_SHEETS_ID` = {your sheet ID from Step 3}
- **Note:** Leave Apollo and Hunter blank if you don't set up accounts — workflows have fallbacks

---

## Phase 3: Import Workflows (15 min)

### Step 7 — Import Three Workflows
You should have three workflow JSON files in `demo-b/`:
1. **workflow.json** — Original Demo B (form-triggered, manual test)
2. **workflow-lead-sourcing.json** — Lead sourcing from Apollo or manual
3. **workflow-outreach-from-leads.json** — Automated outreach from Leads tab

Import them in order:

**Import workflow-lead-sourcing.json first:**
- [ ] In n8n, click **Workflows** → **Import from file**
- [ ] Select `workflow-lead-sourcing.json`
- [ ] The 12 nodes should appear
- [ ] Name the workflow "Lead Sourcing" for clarity

**Import workflow-outreach-from-leads.json second:**
- [ ] **Workflows** → **Import from file**
- [ ] Select `workflow-outreach-from-leads.json`
- [ ] The 14 nodes should appear
- [ ] Name this "Outreach from Leads"

**Import workflow.json last (optional):**
- [ ] **Workflows** → **Import from file**
- [ ] Select `workflow.json`
- [ ] Name this "Demo B (Form Trigger)" for reference
- **Note:** This is the original form-triggered demo; use it for manual testing only

### Step 8 — Replace Placeholder Credential IDs and Sheet ID
All three workflows have placeholders:
- `YOUR_ANTHROPIC_CREDENTIAL_ID`
- `YOUR_SHEETS_CREDENTIAL_ID`
- `YOUR_SHEET_ID`

**For each workflow (same steps for all three):**

**HTTP Request nodes (Claude API calls):**
- [ ] Click each HTTP Request node
- [ ] Under "Authentication" → select your `Anthropic` credential from Step 4
- [ ] Red badges should disappear

**Google Sheets nodes:**
- [ ] Click each Sheets node
- [ ] Select "Credential" → pick your Google Sheets credential from Step 5
- [ ] Select `Agency Outreach Demo` spreadsheet
- [ ] Select the correct sheet (Leads, Outreach Queue, etc.)
- [ ] Verify column mappings match the sheet headers

**Environment variable references:**
- [ ] For nodes using `{{ $env.GOOGLE_SHEETS_ID }}`, this will resolve from your environment variable
- [ ] If you didn't set environment variables in Step 6, manually paste the Sheet ID into each node

---

## Phase 4: Test the Workflows (30 min)

### Step 9 — Test Lead Sourcing Workflow
- [ ] Open the "Lead Sourcing" workflow
- [ ] Click **Save** (top right)
- [ ] Click **Activate** (toggle at top)
- [ ] Click the **Manual Trigger** node
- [ ] Click **Execute Workflow** (or press Ctrl+Enter)
- [ ] Watch the execution in the canvas
- [ ] Open the execution log to see node-by-node output

**Expected outcome:**
- Workflow should run ~5 sample brands through the pipeline
- Go to your Google Sheet → **Leads** tab
- You should see 5 new rows with Status = `NEW`, Qualified = `TRUE`
- Rows should have all 15 columns filled (Lead ID, Email, Company, Job Title, etc.)

**If it fails:**
- Check that the Google Sheets credential is authorized
- Verify the `Leads` tab exists in your sheet with correct headers
- Check the execution log for specific error messages

### Step 10 — Test Outreach from Leads Workflow
- [ ] Open the "Outreach from Leads" workflow
- [ ] Click **Save** and **Activate**
- [ ] Click the **Manual Trigger** node
- [ ] Click **Execute Workflow**
- [ ] Watch the execution (should process the 5 leads we just sourced)
- [ ] Open the execution log

**Expected outcome:**
- Go to your Google Sheet → **Leads** tab
- The 5 rows should now have Status = `INTERESTED` (from classification)
- Go to your email → Gmail inbox
- You should see 5 email alerts (one for each INTERESTED lead)

**If outreach workflow skips leads:**
- Check the "Code: Filter NEW Leads" node output
- Verify Status = `NEW` AND Qualified = `TRUE` in your Leads tab
- Ensure the exact column names match (case-sensitive)

### Step 11 — Optional: Test Original Demo B (Form Trigger)
- [ ] Open the "Demo B (Form Trigger)" workflow
- [ ] Click **Save** and **Activate**
- [ ] Click **Node 1 (Form Trigger)**
- [ ] Copy the form URL shown
- [ ] Open the URL in a new tab
- [ ] Fill in the form with a test brand:
  - **Brand Name:** `Monday Swimwear`
  - **Instagram Handle:** `mondayswimwear`
  - **Niche:** `Swimwear`
  - **Follower Count:** `100K–500K`
  - **Market:** `Global`
- [ ] Click **Submit**

**Expected outcome:**
- A new row appears in **Outreach Queue** tab (not Leads tab)
- Row includes DM + email generated by Claude
- After classification runs, Status updates to `INTERESTED`
- Email alert received in Gmail

### Step 12 — Troubleshoot if Needed

**If Claude API nodes fail (401 error):**
- Double-check Anthropic API key is correct
- Verify credential is selected in the HTTP Request node
- Check that the header is exactly `x-api-key` (case-sensitive)

**If Sheets nodes fail:**
- Re-authenticate Google Sheets credential
- Verify sheet names match exactly (Leads, Outreach Queue, etc.)
- Check column headers are in Row 1 and match the template

**If Leads tab shows many DISQUALIFIED rows:**
- This is expected! Rows need both email AND qualified=TRUE to proceed
- Check the "Disqualify Reason" column to see why each failed

**If classification/email alert doesn't fire:**
- Check that Status is correctly set in Sheets
- Verify the IF node is checking the right classification values

---

## Phase 5: Record Loom Video (7 min)

### Step 13 — Prepare for Recording
- [ ] Have these open in separate tabs/windows:
  - **n8n Canvas:** "Lead Sourcing" workflow
  - **n8n Canvas 2:** "Outreach from Leads" workflow (in a second window)
  - **Google Sheet:** With all three tabs visible (Leads, Outreach Queue, Pipeline)
  - **Gmail inbox:** To show email alerts
  - **Loom recorder:** https://loom.com

### Step 14 — Record the Full Pipeline (5-7 minutes)

Open Loom → Start recording → follow this script:

**[0:00–0:30] — Intro**
```
"I built a complete automated pipeline for your outreach system.
It handles everything from sourcing leads to sending personalized emails,
all integrated with n8n, Claude, and Google Sheets.
Let me show you how it works end-to-end."
```

**[0:30–1:15] — Lead Sourcing Workflow**
```
"First, the sourcing layer. This workflow pulls leads from Apollo.io
(or manual sources for demo), enriches missing emails via Hunter.io,
qualifies them based on industry and contact info,
and deduplicates against existing leads."
```
→ Show the Lead Sourcing workflow canvas
→ Click Manual Trigger and Execute Workflow
→ Watch nodes execute (Show → Merge → Qualify → Dedup → Append to Leads)

**[1:15–2:30] — Results in Leads Tab**
```
"The workflow just populated the Leads tab with 5 new brands.
Each one has a Lead ID, verified email, company name, job title, and source.
All of them passed qualification checks."
```
→ Switch to Google Sheet → **Leads** tab
→ Point out the 5 new rows with Status = `NEW`, Qualified = `TRUE`
→ Scroll through columns to show: Email, Company, Job Title, Industry, etc.

**[2:30–4:00] — Outreach Generation Workflow**
```
"Now the automation takes over. This second workflow reads the leads
we just sourced, generates personalized emails via Claude,
and automatically classifies incoming replies."
```
→ Switch to "Outreach from Leads" workflow canvas
→ Click Manual Trigger and Execute Workflow
→ Watch nodes: Filter NEW Leads → Build Prompt → Claude Generate → Parse → Classify

**[4:00–5:15] — Results in Outreach Queue + Classification**
```
"The leads now have status INTERESTED, FOLLOW_UP, or NOT_INTERESTED
based on the simulated reply. When a lead is INTERESTED,
an email alert fires automatically."
```
→ Switch to Google Sheet → **Leads** tab
→ Show Status column updated to classifications
→ Point to a few rows: "This one is INTERESTED, so an alert went out"

**[5:15–6:00] — Gmail Alert Demo**
```
"Check the inbox — here's the alert that fired.
The system caught that this brand was interested,
pulled all the context, and notified the sales team instantly."
```
→ Open Gmail
→ Show the alert email with subject "🎯 Interested Lead: [Company]"
→ Show the email body includes company name, contact email, and reason

**[6:00–6:30] — Closing**
```
"This is the core pipeline. In production, it runs on a schedule,
continuously sourcing and qualifying leads automatically.
The workflow can scale to hundreds of leads per day,
and the AI handles all the repetitive work.

This is what I'd build for you in the first 2–3 weeks."
```

### Step 15 — Finalize Recording
- [ ] Stop recording and let Loom upload
- [ ] Copy the shareable link
- [ ] Add it to your Upwork proposal:

```
I've built a complete working pipeline showing your exact use case:

→ Loom demo: {your loom link}

This 6-minute walkthrough shows the full automation:
sourcing leads → enriching data → generating personalized emails →
classifying replies → sending alerts.

It uses n8n, Claude, and Google Sheets—your exact stack.
The production version is ready to deploy in 2–3 weeks.
```

---

## Final Checklist

- [ ] n8n workflow imported and all credentials connected
- [ ] Test run executed successfully
- [ ] Google Sheet populated with sample data
- [ ] Classification shows as `INTERESTED` in the sheet
- [ ] Loom recorded and link obtained
- [ ] workflow.json file exists in `demo-b/`
- [ ] sheets-template.md exists (for reference)
- [ ] All files committed to git

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Node 3 returns 401 | Check Anthropic API key is correct; verify x-api-key header |
| Node 5 can't append | Google Sheets OAuth may have expired; re-authenticate credential |
| JSON parse error | Claude wrapped JSON in markdown; regex in Code nodes should strip it; check raw response |
| Form trigger has no URL | Activate the workflow first (toggle at top) |
| Sheets update doesn't find row | Brand Name must match exactly (case-sensitive); verify "Match on" is Column A |

---

## Questions or Blockers?

Refer to:
- `06-build-instructions.md` (lines 674–1048) — Detailed n8n configuration
- `04-demo-version-b.md` — Full spec and Loom script
- `02-solution-architecture.md` — Architecture context
