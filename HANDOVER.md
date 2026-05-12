# Handover Document: Demo B Upwork Proposal

**Date:** 2026-05-12  
**Project:** Swimwear Influencer Agency Outreach Demo (Demo B)  
**Owner:** Jason Khanani  
**Status:** In Setup (Step 7 of 15)

---

## Objectives

Build a working n8n + Google Sheets + Claude AI demo that:
- Mirrors the agency's exact tech stack (n8n, Claude, Sheets)
- Generates personalized swimwear brand outreach (DM + email)
- Classifies incoming replies automatically
- Proves competency for Upwork Marketing & Sales Agent role proposal
- Can be presented as a Loom video + live workflow in the proposal

---

## Current State: Progress Snapshot

### ✅ Completed

1. **Planning & Design**
   - Reviewed all documentation (specs, architecture, build instructions)
   - Decided to skip Demo A (React app), focus on Demo B (n8n workflow)
   - Designed 9-node workflow architecture

2. **Artifacts Created** (committed & pushed to GitHub)
   - `demo-b/workflow.json` — complete, importable n8n workflow (9 nodes)
   - `demo-b/sheets-template.md` — Google Sheets structure + column definitions
   - `demo-b/setup-checklist.md` — step-by-step setup + Loom script

3. **Setup Checklist Progress**
   - [x] Phase 1: Created n8n account, Anthropic API key, Google Sheet
   - [x] Phase 2: Set up Anthropic and Google Sheets credentials in n8n
   - [x] Phase 3, Step 6: Downloaded and imported workflow.json into n8n
   - [ ] Phase 3, Step 7: **CURRENT** — Replace placeholder credential IDs in nodes

### ⏳ In Progress

- **Step 7: Credential Mapping**
  - Need to wire up Anthropic credential to Claude API nodes (3 & 7)
  - Need to wire up Google Sheets credential to Sheets nodes (5 & 9)
  - Verify all red error badges disappear

### ❌ Not Yet Started

- Phase 4: Test the workflow (Steps 8–12)
- Phase 5: Record Loom walkthrough (Steps 13–15)

---

## Next Steps (Ordered)

### Immediate (Today)

**Step 7 — Credential Mapping** (~5 min)
1. In n8n canvas, click **Node 3 (Claude API — Generate)**
2. Under "Authentication" dropdown → select your `Anthropic` credential
3. Repeat for **Node 7 (Claude API — Classify)**
4. Click **Node 5 (Sheets: Append Row)**
   - Select Google Sheets credential
   - Spreadsheet: `Agency Outreach Demo`
   - Sheet: `Outreach Queue`
5. Repeat for **Node 9 (Sheets: Update Row)**
6. **Save** the workflow (top right)

**Step 8 — Activate & Test** (~10 min)
1. Click **Activate** toggle (top of canvas)
2. Click **Node 1 (Form Trigger)** → copy the form URL
3. Open the URL in a new tab
4. Fill in sample brand: Monday Swimwear, mondayswimwear, Swimwear, 100K–500K, Global
5. Click Submit
6. Watch the execution in n8n (Executions tab)

**Step 9 — Verify in Google Sheets** (~2 min)
1. Open your Google Sheet
2. Check **Outreach Queue** tab → new row should appear
3. Check columns: DM, Email Subject, Email Body populated
4. Check **Classification** column → should show `INTERESTED`

### Short Term (This Week)

**Phase 5 — Record Loom** (~45 min)
1. Open loom.com → New Recording
2. Have open: n8n canvas, form URL, Google Sheet, Telegram (optional)
3. Follow the script in `demo-b/setup-checklist.md` (lines 190–220)
4. Record 4 minutes following the talking points
5. Upload and get shareable link

**Add to Proposal**
```
I built a working demo of how I'd structure your outreach system:

→ Loom walkthrough: {your loom link}

It mirrors your exact stack: n8n + Claude + Google Sheets. 
The real system would take 2 weeks to fully build out.
```

### Optional (Nice-to-Have)

- **Demo A** (React + Netlify Functions) — shareable live URL
  - See `06-build-instructions.md` for complete code
  - Takes 2–3 hours to build
  - Only if you want maximum polish

---

## Potential Issues & Mitigation

### Issue 1: Node 3 or 7 Returns 401 Error (Anthropic API)

**Symptom:** Red error badge on Claude API nodes, execution log shows `401 Unauthorized`

**Causes:**
- Anthropic API key is incorrect/expired
- `x-api-key` header name is wrong (case-sensitive)
- Credential is not selected in the node

**Fix:**
1. Double-check your Anthropic API key in console.anthropic.com
2. Verify credential header is exactly `x-api-key` (lowercase)
3. Re-select the Anthropic credential in the node
4. Test again

---

### Issue 2: Node 5 (Sheets Append) Fails

**Symptom:** Red error on Sheets node, execution log shows auth error or "sheet not found"

**Causes:**
- Google Sheets OAuth2 expired or not authorized
- Spreadsheet or sheet name doesn't match
- Column headers don't exist in Row 1

**Fix:**
1. In n8n Credentials, re-authenticate Google Sheets (disconnect + reconnect)
2. Verify spreadsheet is named exactly `Agency Outreach Demo`
3. Verify sheet tab is named exactly `Outreach Queue`
4. Verify Row 1 has all 10 column headers from `sheets-template.md`
5. Test again

---

### Issue 3: Node 4 (Parse Response) Returns JSON Error

**Symptom:** "Cannot parse JSON" error in execution log

**Causes:**
- Claude wrapped response in markdown fences (` ```json ``` `)
- Response is malformed or truncated

**Fix:**
1. Check the raw Claude response in Node 3 execution
2. The Code node in Node 4 has regex to strip markdown fences automatically
3. If still failing, the prompt may need tweaking (Claude might be ignoring "ONLY valid JSON" instruction)
4. Copy the raw response and test with `JSON.parse()` locally to debug

---

### Issue 4: Form Trigger Has No URL

**Symptom:** Node 1 doesn't show a form URL when clicked

**Causes:**
- Workflow is not activated
- Node 1 is not properly configured

**Fix:**
1. Click **Activate** toggle at top of canvas (should turn blue)
2. Re-click Node 1 → form URL should appear below the node

---

### Issue 5: Sheets Update (Node 9) Can't Find Row

**Symptom:** Execution shows "row not found" or status doesn't update

**Causes:**
- "Match on" column is not set to Column A (Brand Name)
- Brand Name in the Set node output doesn't exactly match the row

**Fix:**
1. Click Node 9 (Sheets: Update Row)
2. Verify "Key" or "Match on" is set to `brand_name`
3. Check that Brand Name value is passed through from earlier nodes
4. Verify the row exists in the sheet before updating

---

### Issue 6: Loom Won't Record Properly

**Symptom:** Recording stops, playback is choppy, audio cuts out

**Causes:**
- Browser tab inactive during recording
- Internet connection unstable
- Loom browser extension needs refresh

**Fix:**
1. Keep Loom tab active during recording
2. Test internet speed before recording
3. Refresh loom.com and try again
4. Use Loom desktop app instead of browser if available

---

### Issue 7: Can't Access Google Sheet During Demo

**Symptom:** Sheet is loading slowly or "You need permission" error

**Causes:**
- Sheet is not shared with your account
- Network latency during Loom recording

**Fix:**
1. Verify you own the sheet or have edit access
2. Test sheet access before recording
3. Have sheet open in a separate window before starting Loom

---

## Architecture Reference

**9-Node Workflow:**
```
[1] Form Trigger
    ↓ user fills: brand_name, instagram_handle, niche, follower_count, market
[2] Code: Build Claude prompts
    ↓ creates systemPrompt + userPrompt
[3] HTTP → Anthropic API (Sonnet)
    ↓ generates { dm, email_subject, email_body }
[4] Code: Parse response
    ↓ strips markdown, validates JSON, attaches metadata
[5] Google Sheets: Append row
    ↓ writes to Outreach Queue, Status = "Pending Review"
[6] Set: Simulate incoming reply
    ↓ hardcoded demo reply: "Hey! We'd love to learn more..."
[7] HTTP → Anthropic API (Haiku)
    ↓ classifies reply → { classification, reason }
[8] Code: Parse classification
    ↓ extracts classification value
[9] Google Sheets: Update row
    ↓ matches on Brand Name, updates Status + Classification columns
```

**Data Flow:**
- Input: Brand details via form
- Processing: Claude generates + classifies
- Output: Google Sheet with generated messages + classification
- Demo: Loom video showing the flow with live sheet updates

---

## Files & References

| File | Purpose | Status |
|------|---------|--------|
| `demo-b/workflow.json` | Importable n8n workflow | ✅ Ready |
| `demo-b/sheets-template.md` | Sheets structure + formulas | ✅ Reference |
| `demo-b/setup-checklist.md` | Step-by-step setup guide | ✅ In use |
| `06-build-instructions.md` | Detailed node configuration | ✅ Reference |
| `04-demo-version-b.md` | Loom script + spec | ✅ Reference |
| `02-solution-architecture.md` | Production system architecture | ✅ Reference |

---

## Success Criteria (Verification Checklist)

- [ ] Workflow imports without errors
- [ ] All 9 nodes show on canvas
- [ ] Credentials wired up (no red badges)
- [ ] Test run with "Monday Swimwear" completes successfully
- [ ] New row appears in Google Sheets with DM + email
- [ ] Classification updates to "INTERESTED" automatically
- [ ] Loom recorded (4 min) following the script
- [ ] Loom link shareable and plays back cleanly
- [ ] Proposal message updated with Loom link
- [ ] All files committed to GitHub

---

## Contact & Support

If blocked:
1. Check the **Potential Issues** section above
2. Refer to `setup-checklist.md` troubleshooting (lines 265–285)
3. Review the node configuration in `06-build-instructions.md` (lines 674–1048)
4. Check raw execution logs in n8n for exact error messages

---

## Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| Setup | Accounts + credentials | 45 min | ✅ Done |
| Setup | Import + credential mapping | 15 min | ⏳ In progress |
| Test | Activate + test workflow | 20 min | ❌ Pending |
| Demo | Loom recording | 45 min | ❌ Pending |
| **Total** | | **2 hours** | **30% done** |

---

**Last Updated:** 2026-05-12 10:32 UTC  
**Next Review:** After Step 9 completes
