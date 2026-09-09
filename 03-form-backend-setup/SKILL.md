---
name: form-backend-setup
description: Step 3 of 3 in the website build system. Builds the Google Apps Script backend and branded notification email for a client website's contact form. Trigger when the user asks to wire up a form, set up a contact form backend, add form notifications, "hook the form up", or build the Apps Script for a site's enquiry form.
---

# Form Backend Setup — Step 3 of 3

This is part of a three-skill website build system:

1. **Client Info Gathering** — gather all client info, set up the project folder
2. **Website Build Rules** — build the site in one shot with all standards baked in
3. **Form Backend Setup** (this skill) — wire up the contact form with branded email notifications

This skill builds a complete contact form backend: a Google Apps Script web app that writes each submission to a Google Sheet and sends one branded notification email, plus the front-end wiring that connects the wizard form from Skill 02 to the endpoint.

The email is the deliverable the client sees every week. It must look like their brand, be scannable in two seconds, and survive Gmail, Apple Mail, and Outlook without repainting.

---

## Non-negotiables

1. **Notifications go to your own inbox first.** Set `NOTIFY_TO` to your own email address for the entire build and test cycle. Only switch it to the client's address after you have seen it land correctly. Say this out loud when handing over the code, every time. Never ship a first version pointed at the client.
2. **Always render a visual preview before handing anything over.** Run `scripts/preview.js` and show the screenshots in chat. Never describe the email design instead of showing it.
3. **Light theme by default.** White card, brand colour as accent only. A dark email is a deliberate one-off for a dark-branded client, and only when the user asks for it. The palette block in `reference/template.gs` includes a documented DARK TOGGLE.
4. **Never invent the brand colours.** Read them from the site's `styles.css` or the project's `context.md`.
5. **Test the awkward inputs** before saying it works. The preview script covers all the edge cases — run it.

---

## Step 1 — Intake

Check if there is a project folder from Skill 01. If `context.md` exists, read it for brand colours, business name, phone, and email.

Ask only for what you cannot read off the project:

- **Which site / project folder.** Then read `styles.css` for brand tokens and the contact page for the actual field names.
- **The leads sheet link.** The Google Sheet the script writes to. Its URL goes in the email footer as a small text link ("View the full leads database"). If no sheet exists yet, continue — leave `SHEET_URL` empty and the link hides itself.
- **Where notifications land after sign-off.** The client's address — written into the handover notes as the one-line change. Ship with your own address in `NOTIFY_TO`.
- **The two primary actions.** Usually Call then Email. Some businesses have no phone — confirm. The first button is the solid (primary) one.
- **Anything unusual in the form** — multi-select service chips, a budget field, a preferred contact time. These change the row layout.

---

## Step 2 — Read the form, do not assume it

Open the contact page and the JS that submits it. Write down the exact `name` attributes on each field and which are `required`. Every form is different.

The email must handle every optional field gracefully:
- An empty field drops its whole row — no orphan label left behind
- If every field is empty the email is still valid and sends
- A junk value (`n/a`, `-`, `asdf` in a phone field) renders as text but never produces a dead call button
- Long values wrap cleanly — they never break the layout

---

## Step 3 — Write the script

Start from `reference/template.gs`. It is the house style: a rounded white card, brand colour on the header rule and primary button, bold tracked uppercase labels, one message panel, two action buttons, footer with the leads-sheet link.

Swap in: brand tokens, business name, real field list, real button labels. Keep the structure. The layout is the house style — not a starting point to redesign per client. What changes per client is colour, name, fields, labels.

The look, in plain terms: a **rounded white card** on a soft tinted page, a header block with a thin brand-colour rule up top, the business name eyebrow and "New enquiry", a clean label/value table, the message in its own rounded tinted panel, then rounded pill action buttons. Generous padding. All Helvetica. Nothing decorative.

For a dark-branded client: keep the same structure, swap the palette using the DARK TOGGLE block in `template.gs`. Only do this when the client is genuinely dark-branded and the user asks for it.

Read `reference/gotchas.md` before writing a single line of email HTML.

---

## Step 4 — Verify

```bash
node /path/to/03-form-backend-setup/scripts/preview.js <path-to-Code.gs> <output-dir>
```

The script evals the `.gs`, renders the email for a full submission plus eight edge cases (email only, phone only, junk phone, no message, completely empty, hostile input, overflow, with-company), screenshots each with headless Chrome, and builds a comparison grid.

It also fails loudly on:
- Raw `<script` in the output (escaping broken)
- Unescaped double quotes inside `style="..."` attributes (style closed early)
- Unescaped quotes inside `href="..."` attributes

Check the screenshots yourself. Then send the main screenshot and the edge grid to the user. Fix anything that looks off and re-render before handing over.

Sanity list before handover:
- Reads correctly at 600px and on a 375px phone
- Looks identical in a light and a dark mail client
- The primary action button is unmistakably the primary
- No orphan labels, no empty bands on the sparse edge cases

---

## Step 5 — Wire up the front end

In the site's form JS, find the `ENDPOINT` constant (left as a placeholder by Skill 02) and update it to the deployed Apps Script `/exec` URL.

The form should already be submitting as a GET with URL params (to work around the Apps Script POST redirect). Confirm the field `name` attributes in the HTML match what the script reads in `readParams_`.

---

## Step 6 — Hand over

Give the user, in chat:

1. **The full `.gs` in a code block**, ready to paste into the Apps Script editor. Not a file path — they are pasting it by hand.
2. **The deploy steps**, in this exact order:
   - Open the leads Sheet > Extensions > Apps Script
   - Replace everything in `Code.gs` with the pasted file
   - Set `NOTIFY_TO` to your own email address
   - Deploy > New deployment > Web app > Execute as **Me**, Access **Anyone**
   - Copy the `/exec` URL into the `ENDPOINT` constant in the site's form JS
   - Redeploying later: Deploy > Manage deployments > edit the existing deployment > **New version**. Editing the script alone does nothing to the live URL — this is the one that catches everyone.
3. **The one-line change for go-live:** `NOTIFY_TO` to the client's address, then a new version.
4. **Known limits**, stated plainly: the site fires `no-cors`, so the browser cannot read the response and the success message shows whether or not the send actually worked.

Save the `.gs` and a short README into the site's `apps-script/` folder.
