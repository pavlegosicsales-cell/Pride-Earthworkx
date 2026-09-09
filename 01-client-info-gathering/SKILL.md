---
name: client-info-gathering
description: Step 1 of 3 in the website build system. Gathers everything needed to build a client website — checks for Firecrawl, asks the right questions, scrapes their existing site, and writes a context.md into a project folder on the Desktop. Trigger when the user wants to start a new client site, set up a project, or says "new client", "gather info", or "starting a new website".
---

# Client Info Gathering — Step 1 of 3

This is part of a three-skill website build system:

1. **Client Info Gathering** (this skill) — gather all client info, set up the project folder
2. **Website Build Rules** — build the site in one shot with all design and copy standards baked in
3. **Form Backend Setup** — wire up the contact form with branded email notifications

This skill is conversational. It checks what tools are available, asks the right questions, scrapes the client's existing site where possible, and writes a clean `context.md` into a new project folder. Skills 02 and 03 read from that file.

---

## Step 1 — Check what's available

Before asking about the client, check the setup. Ask one or two things at a time — do not fire everything at once.

### Firecrawl
Ask: "Do you have the Firecrawl connector connected?"

If yes: great, use it to scrape their existing site and Facebook page.

If no, explain how to set it up (it's free):
- **Claude.ai:** Settings > Connectors > search "Firecrawl" > Connect
- **Claude Code:** add it to your MCP config under `mcpServers`
- Free tier covers basic scraping with no API key needed

Proceed either way. Without Firecrawl, you will ask the user to paste in the text from their existing site instead.

### File access
Ask: "Can I write files to your Desktop?" (Claude Code users: yes by default. Claude.ai users: not yet.)

If yes: you will create the project folder directly.
If no: output the context.md as a code block the user saves manually.

---

## Step 2 — Ask about the client

Ask only what you cannot get from scraping. Group questions naturally — one or two at a time — not a wall of a form.

The minimum before writing the context file:

- **Business name** — the trading or legal name
- **Existing website or Facebook URL** — to scrape (or null if they have neither)
- **Industry / trade** — what they actually do, in plain language
- **Services** — the full list; pull from their site if possible, confirm with the user
- **Location and service area** — suburb, city, or regions covered
- **Phone and email** — their real contact details
- **Social proof** — review count, star rating, years in business
- **Key differentiator** — the one thing that makes them stand out, in their own words if possible
- **Logo** — is there a file? Where is it?
- **Brand colours** — if known; otherwise pull from the site or ask for a screenshot
- **Photos** — job photos, product shots, team photos — where are they?
- **Target audience** — who they want to work with

If Firecrawl is available and you have a URL, scrape first and only ask about things the site does not answer.

---

## Step 3 — Scrape if Firecrawl is connected

With a URL and Firecrawl available:
- Scrape the homepage and contact page
- Pull: services, copy tone, colours, contact details, social proof, any location info
- Scrape their Facebook page too if they have one — check for reviews and recent posts
- Report what you found before asking follow-up questions, so the user can confirm or correct it

Without Firecrawl:
- Ask the user to paste in the text from their homepage and any other relevant page
- Ask for a screenshot or description of the site's colours if they have a current site

---

## Step 4 — Create the project folder

Once you have enough info, offer to create the folder:

> "I'll create a folder at `~/Desktop/[Business Name] Website/` with your context file and an images folder inside. Is that the right spot, or somewhere else?"

If they confirm, create:

```
~/Desktop/[Business Name] Website/
├── context.md
└── images/
    └── reference/
```

`images/reference/` is for any screenshots or reference images they drop in before the build. Mention this.

If they say no or file access is unavailable, output the `context.md` as a fenced code block they can save.

---

## Step 5 — Write context.md

Write to `~/Desktop/[Business Name] Website/context.md` using this structure:

```
# [Business Name] — Project Context

## Business
- Name: [full trading name]
- Trade / industry: [what they do]
- Location: [suburb, state]
- Service area: [regions or suburbs covered]
- Phone: [number]
- Email: [address]
- Website: [current URL, or "none"]

## Services
[Bullet list of all services, in their own words where possible]

## Brand
- Primary colour: [hex — from site or confirmed by user; "TBC" if unknown]
- Accent colour: [hex or "TBC"]
- Fonts: [if known, or "TBC — pull from site during build"]
- Logo: [file path, or "not yet received"]
- Tone: [2–3 words: e.g. "direct, friendly, trade" or "premium, calm, professional"]

## Social Proof
- Reviews: [N] reviews, [X.X] stars ([Google / Facebook / other])
- Years in business: [N]
- Key differentiator: [their one-liner, in their words]

## Images
- Job / product photos: [path or "user to provide"]
- Team / headshots: [path or "none"]
- Reference images folder: images/reference/

## Target Audience
[Who they want to work with — plain language]

## Site-Specific Rules
[Anything the user flagged: hard requirements (licence number in footer, phone in header) or hard bans (no stock photos, no price claims)]
```

Fill every field. If something is genuinely unknown after asking, write "TBC" — do not leave fields blank.

---

## Step 6 — Hand off to Skill 02

Once the folder and context.md are in place:

> "All set. Project folder is at `~/Desktop/[Business Name] Website/`. Drop any reference images into `images/reference/` and then use the **Website Build Rules** skill (Skill 02) to build the site. It will read your context.md automatically."

Answer any questions before they move on.
