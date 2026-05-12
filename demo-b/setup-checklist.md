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

### Step 2 — Anthropic API Key
- [ ] Go to https://console.anthropic.com
- [ ] Navigate to "API Keys"
- [ ] Click "Create Key"
- [ ] Copy the key somewhere safe (you'll paste it into n8n)
- **Note:** This key should never be shared or committed to git

### Step 3 — Google Sheet Setup
- [ ] Go to https://sheets.google.com
- [ ] Click "New spreadsheet"
- [ ] Name it: `Agency Outreach Demo`
- [ ] Rename the first sheet tab to: `Outreach Queue`
- [ ] Add a second sheet tab called: `Pipeline`
- [ ] Copy the sheet headers from `sheets-template.md` into both tabs (headers in Row 1)

**Outreach Queue headers:**
```
A: Brand Name | B: Handle | C: Niche | D: DM | E: Email Subject | 
F: Email Body | G: Status | H: Generated At | I: Reply | J: Classification
```

**Pipeline headers:**
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

---

## Phase 3: Import Workflow (10 min)

### Step 6 — Download and Import workflow.json
- [ ] You should now have `demo-b/workflow.json` (Claude built this)
- [ ] In n8n, click **Workflows** → **Import from file**
- [ ] Select `workflow.json`
- [ ] The 9 nodes should appear on the canvas
- **Note:** Some nodes may show red error badges initially (missing credential IDs)

### Step 7 — Replace Placeholder Credential IDs
The workflow.json has placeholder strings for credential IDs:
- `YOUR_ANTHROPIC_CREDENTIAL_ID`
- `YOUR_SHEETS_CREDENTIAL_ID`
- `YOUR_SHEET_ID`

For each node that needs a credential:

**Node 3 (HTTP Request — Claude API):**
- [ ] Click the node
- [ ] Under "Authentication" → select your `Anthropic` credential from Step 4
- [ ] Confirm it updates (red badge should disappear)

**Node 7 (HTTP Request — Claude API for classification):**
- [ ] Click the node
- [ ] Under "Authentication" → select your `Anthropic` credential

**Node 5 (Google Sheets — Append Row):**
- [ ] Click the node
- [ ] Select "Credential" → pick your Google Sheets credential from Step 5
- [ ] In the "Spreadsheet" dropdown, find and select `Agency Outreach Demo` (the sheet you created)
- [ ] In the "Sheet" dropdown, select `Outreach Queue`
- [ ] Map the output columns (should auto-detect from the sheet headers)

**Node 9 (Google Sheets — Update Row):**
- [ ] Click the node
- [ ] Select your Google Sheets credential
- [ ] Select `Agency Outreach Demo` spreadsheet
- [ ] Select `Outreach Queue` sheet
- [ ] Set "Match on" → `Brand Name` (Column A)
- [ ] Map the update fields: Status, Reply, Classification

---

## Phase 4: Test the Workflow (20 min)

### Step 8 — Save and Activate
- [ ] Click **Save** (top right)
- [ ] Click **Activate** (toggle at top to enable the workflow)

### Step 9 — Trigger the Form
- [ ] In the canvas, click **Node 1 (Form Trigger)**
- [ ] Copy the form URL shown
- [ ] Open the URL in a new tab
- [ ] Fill in the form:
  - **Brand Name:** `Monday Swimwear`
  - **Instagram Handle:** `mondayswimwear` (optional @ symbol)
  - **Niche:** `Swimwear`
  - **Follower Count:** `100K–500K`
  - **Market:** `Global`
- [ ] Click **Submit**

### Step 10 — Watch the Execution
- [ ] Back in n8n, the workflow should execute
- [ ] Click the workflow name → **Executions** at the bottom
- [ ] Click the latest execution to see node-by-node output
- [ ] Check for any red error indicators

### Step 11 — Verify in Google Sheets
- [ ] Go to your Google Sheet
- [ ] Open the **Outreach Queue** tab
- [ ] A new row should have appeared with:
  - Brand Name: `Monday Swimwear`
  - Handle: `mondayswimwear`
  - DM: full text from Claude
  - Email Subject & Body: from Claude
  - Status: `Pending Review`
  - Generated At: timestamp
  - Reply: "Hey! We'd love to learn more..."
  - Classification: `INTERESTED` (after Node 9 runs)

### Step 12 — Troubleshoot if needed

**If Node 3 (Claude API) fails with 401 error:**
- Double-check the Anthropic API key is correct
- Verify credential is selected in the HTTP Request node
- Check that the header is exactly `x-api-key` (case-sensitive)

**If Node 5 (Sheets append) fails:**
- Verify the Google Sheets credential is connected and authorized
- Check that the spreadsheet and sheet names match exactly
- Make sure columns A–J headers are in Row 1

**If Node 9 (Sheets update) can't find the row:**
- Verify the "Match on" column is set to Column A (Brand Name)
- Check that the Brand Name in the Set node output matches exactly

**If JSON parse errors in Node 4 or Node 8:**
- Claude may have wrapped JSON in markdown fences (` ```json ``` `)
- The Code nodes have regex to strip these automatically
- Check the raw Claude response in the execution log to debug

---

## Phase 5: Record Loom (30 min)

### Step 13 — Prepare for Recording
- [ ] Have these open in separate tabs/windows:
  - n8n workflow (canvas view)
  - n8n form URL (to trigger)
  - Google Sheet (Outreach Queue tab)
  - Loom recorder (https://loom.com)

### Step 14 — Record Using This Script

Open Loom → Start recording → follow this 4-minute script (from `04-demo-version-b.md`):

**[0:00–0:30] — Intro**
> "Hey — I wanted to show you a working prototype of how I'd build your outreach system. This is n8n connected to Claude and Google Sheets. Let me walk you through it."

**[0:30–1:30] — Trigger the workflow**
> Open the n8n form. Fill in a real swimwear brand (e.g., "Monday Swimwear"). Hit submit. Show the workflow executing node by node in the canvas.

**[1:30–2:30] — Show Google Sheets output**
> Cut to the Google Sheet. Show the DM and email that just appeared. Read a line or two out loud. Point out the personalization: "Claude pulled in their niche and wrote something that doesn't sound like a template."

**[2:30–3:30] — Reply triage**
> "Now here's the part that saves the most time. When a brand replies, the system reads it and classifies it automatically." Show the simulated reply hitting the sheet and the Classification column updating to `INTERESTED`.

**[3:30–4:00] — Close**
> "This is a stripped-down version of what I'd build for you in the first two weeks. Happy to walk through it on a call."

### Step 15 — Finalize Recording
- [ ] Upload the Loom
- [ ] Copy the shareable link
- [ ] Add it to your proposal message alongside this text:

```
I built a working demo of how I'd structure your outreach system:

→ Loom walkthrough: {your loom link}
→ Workflow setup: (instructions in the repo)

It mirrors your exact stack: n8n + Claude + Google Sheets. 
The real system would take 2 weeks to fully build out.
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
