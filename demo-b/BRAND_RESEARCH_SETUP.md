# Brand Research Workflow — Setup Guide

This guide walks you through setting up the automated brand discovery workflow in n8n.

---

## Step 1: Get Free API Keys

### Tavily API Key
1. Go to https://tavily.com
2. Sign up for free account
3. Copy your API key from dashboard
4. Free tier: ~300 searches/month

### Firecrawl API Key
1. Go to https://www.firecrawl.dev
2. Sign up for free account
3. Copy your API key from dashboard
4. Free tier: 100 scrapes/month

---

## Step 2: Add "Search Queries" Tab to Google Sheet

In your Google Sheet (`1nfUM_i-r3Rvbu-AtNsz-vovhU_nW16EXH8fhvkyATMU`):

1. Click **+ icon** to add new sheet
2. Name it: `Search Queries`
3. Add headers:
   - Column A: `Query`
   - Column B: `Niche Hint`
   - Column C: `Status`

4. Add sample rows:
```
Query                                  | Niche Hint              | Status
"sustainable swimwear brands 2026"     | Sustainable Swimwear   | Active
"luxury resort wear brands instagram"  | Luxury Swimwear        | Active
"swimwear UGC creators brands"         | Swimwear               | Active
"surf and active swimwear brands"      | Surf & Active          | Active
```

---

## Step 3: Create n8n Workflow

### 3a: Open n8n and Create New Workflow

1. Go to your n8n instance
2. Click **+ New** → **Workflow**
3. Name it: `Brand Research Automation`

### 3b: Add Cron Trigger

1. Click **Add trigger** → Search for `Cron`
2. Select **Cron**
3. Configure:
   - **Cron Expression:** `0 8 * * *` (daily at 8am UTC)
   - **Timezone:** Asia/Jakarta (or your timezone)

### 3c: Add Manual Trigger

The workflow should also be manually triggerable. Add another trigger:

1. Click the **+** icon on the Cron node
2. Select **Add second trigger option**
3. Search for `Manual Trigger` (or `Manual`)
4. Add it

This creates an OR relationship — the workflow runs on schedule OR when manually triggered.

### 3d: Add "Read Search Queries" Node

1. Click **+** to add a node after triggers
2. Search: `Google Sheets`
3. Select **Google Sheets** → **Read**
4. Configure:
   - **Authentication:** Connect your Google account (same one with the swimwear sheet)
   - **Document ID:** `1nfUM_i-r3Rvbu-AtNsz-vovhU_nW16EXH8fhvkyATMU`
   - **Sheet Name:** `Search Queries`
   - **Add Filter:** `Status = "Active"` (only active queries)

### 3e: Add Loop Node

1. Click **+** to add Loop
2. **Loop over:** `{{ $('Read Search Queries').item.json }}`
3. This processes each query one by one

---

## Step 4: Inside the Loop — Tavily Search

### 4a: Add Tavily HTTP Request

1. Click **+** inside the loop
2. Select **HTTP Request**
3. Configure:
```
Method: POST
URL: https://api.tavily.com/search

Auth: None (API key in body)

Headers:
  Content-Type: application/json

Body (JSON):
{
  "api_key": "YOUR_TAVILY_API_KEY",
  "query": "{{ $('Loop').item.json.Query }}",
  "max_results": 10,
  "exclude_domains": ["reddit.com", "facebook.com", "pinterest.com"]
}
```

4. Click **Test** to verify API key works

---

## Step 5: Inside Tavily Results — Firecrawl Loop

### 5a: Add Firecrawl Loop

1. After Tavily response, add another **Loop** node
2. **Loop over:** `{{ $('HTTP Request - Tavily').item.json.results }}`

This loops through each URL returned by Tavily.

### 5b: Add Firecrawl HTTP Request (inside this loop)

1. Click **+** inside Firecrawl loop
2. Select **HTTP Request**
3. Configure:
```
Method: POST
URL: https://api.firecrawl.dev/v1/scrape

Headers:
  Authorization: Bearer YOUR_FIRECRAWL_API_KEY
  Content-Type: application/json

Body (JSON):
{
  "url": "{{ $('Loop1').item.json.url }}",
  "formats": ["markdown"],
  "extract": {
    "schema": {
      "type": "object",
      "properties": {
        "brands": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Brand name"
              },
              "instagram_handle": {
                "type": "string",
                "description": "Instagram handle without @"
              },
              "website": {
                "type": "string",
                "description": "Brand website URL"
              },
              "description": {
                "type": "string",
                "description": "What the brand sells, their niche"
              }
            }
          }
        }
      }
    }
  }
}
```

4. Click **Test** to verify it returns brand data

---

## Step 6: Parse & Flatten Brands

After all Firecrawl results, add a **Code** node to flatten:

```javascript
const allBrands = [];

// Collect all brands from all Firecrawl responses
$input.all().forEach(item => {
  if (item.json?.data?.extract?.brands) {
    item.json.data.extract.brands.forEach(brand => {
      if (brand.name && brand.name.length > 2) {
        allBrands.push({
          brand_name: brand.name.trim(),
          instagram_handle: brand.instagram_handle?.replace('@', '')?.trim() || '',
          website: brand.website || '',
          niche: extractNiche(brand.description),
          market: 'Global',
          follower_count: 'Unknown',
          source: 'auto-research'
        });
      }
    });
  }
});

// Remove duplicates by brand name
const unique = [...new Map(allBrands.map(b => [b.brand_name?.toLowerCase(), b])).values()];

function extractNiche(desc) {
  if (!desc) return 'Swimwear';
  const lower = desc.toLowerCase();
  if (lower.includes('sustainable')) return 'Sustainable Swimwear';
  if (lower.includes('luxury')) return 'Luxury Swimwear';
  if (lower.includes('resort')) return 'Resort Wear';
  if (lower.includes('surf') || lower.includes('active')) return 'Surf & Active';
  return 'Swimwear';
}

return unique;
```

---

## Step 7: Deduplication Against Existing Brands

### 7a: Read Existing Outreach Queue

1. Add **Google Sheets** → **Read**
2. Configure:
   - **Document ID:** `1nfUM_i-r3Rvbu-AtNsz-vovhU_nW16EXH8fhvkyATMU`
   - **Sheet Name:** `Outreach Queue`

### 7b: Filter Out Duplicates

1. Add another **Code** node:

```javascript
const existing = new Set();

// Get all existing brand names from Outreach Queue
$('Sheets: Get Existing Brands').all().forEach(row => {
  const name = row.json['Brand Name']?.toLowerCase();
  if (name) existing.add(name);
});

// Filter new brands — keep only those NOT in existing
const newBrands = $input.all().filter(item => {
  const brandName = item.json.brand_name?.toLowerCase();
  return brandName && !existing.has(brandName);
});

return newBrands;
```

---

## Step 8: Generate Outreach Copy

### 8a: Add Loop (for each new brand)

```
Loop over: {{ $('Filter Duplicates').item.json }}
```

### 8b: Build Prompt (Code node inside loop)

```javascript
const brand = $('Loop').item.json;

const systemPrompt = `You are an outreach specialist for a premium swimwear influencer agency.
Your job is to write personalized, warm outreach messages to swimwear brands
inviting them to collaborate with our curated roster of UGC creators and influencers.

Rules:
- Never sound salesy or templated
- Reference the brand's niche and vibe naturally
- Be direct about the value proposition: real creators, real content, real results
- DM max 150 words, Email max 200 words + subject line
- Output ONLY valid JSON, no preamble, no markdown fences
- Sign off as Jason`;

const userPrompt = `Brand: ${brand.brand_name}
Instagram: @${brand.instagram_handle || 'unknown'}
Niche: ${brand.niche}
Followers: Unknown
Market: ${brand.market}

Write a personalized Instagram DM and cold email for this brand.

Output format:
{
  "dm": "...",
  "email_subject": "...",
  "email_body": "..."
}`;

return {
  systemPrompt,
  userPrompt,
  brand_name: brand.brand_name,
  instagram_handle: brand.instagram_handle,
  niche: brand.niche,
  market: brand.market
};
```

### 8c: Claude Generation

1. Add **Anthropic** node
2. Configure:
   - **Model:** `claude-haiku-4-5-20251001`
   - **System Prompt:** `{{ $json.systemPrompt }}`
   - **Message:** `{{ $json.userPrompt }}`

### 8d: Parse Response

```javascript
const raw = $input.first().json.content[0].text;
const clean = raw.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(clean);

const brand = $('Build Prompt').first().json;

return {
  brand_name: brand.brand_name,
  handle: brand.instagram_handle,
  niche: brand.niche,
  market: brand.market,
  dm: parsed.dm,
  email_subject: parsed.email_subject,
  email_body: parsed.email_body,
  status: 'Pending Review',
  generated_at: new Date().toISOString()
};
```

---

## Step 9: Append to Outreach Queue

1. Add **Google Sheets** → **Append**
2. Configure:
   - **Document ID:** `1nfUM_i-r3Rvbu-AtNsz-vovhU_nW16EXH8fhvkyATMU`
   - **Sheet Name:** `Outreach Queue`
   - **Columns:**
     - Brand Name: `{{ $json.brand_name }}`
     - Handle: `{{ $json.handle }}`
     - Niche: `{{ $json.niche }}`
     - DM: `{{ $json.dm }}`
     - Email Subject: `{{ $json.email_subject }}`
     - Email Body: `{{ $json.email_body }}`
     - Status: `{{ $json.status }}`
     - Generated At: `{{ $json.generated_at }}`

---

## Step 10: Test the Workflow

1. Click **Test** in n8n
2. Check execution:
   - ✅ Tavily returns URLs for each query
   - ✅ Firecrawl scrapes brands from those URLs
   - ✅ Deduplication works (no duplicates appended)
   - ✅ Claude generates outreach copy
   - ✅ Rows appended to Outreach Queue with Status = "Pending Review"

3. Open your Google Sheet — new brands should appear!

---

## Step 11: Set Schedule & Save

1. Click **Activate** to turn on the workflow
2. Cron will run daily at 8am Bali time
3. You can also click **Execute Workflow** anytime to run manually

---

## Troubleshooting

**Tavily returns 0 results:** Check query syntax, try broader terms like "swimwear brands"
**Firecrawl returns empty brands:** The page might not have structured brand data; that's OK, continue
**Claude JSON parse fails:** Usually markdown fences. The code strips them, but check raw response in n8n
**Duplicates appearing anyway:** Check dedup filter logic matches Brand Names exactly (case-insensitive)

---

## Free Tier Usage

- Each run: 4 queries × ~10 URLs = ~40 Firecrawl scrapes
- Discovers: 20-30 new brands per run (after dedup)
- Free tier: 100 Firecrawl scrapes/month = ~2 full runs/month
- For daily runs, upgrade Firecrawl to Starter ($16/mo)
