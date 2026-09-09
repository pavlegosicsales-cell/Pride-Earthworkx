# Gotchas

Every item here cost real debugging time. Read before writing the email HTML.

## Apps Script

**POST gets eaten.** Apps Script 302-redirects every POST to a session URL and
converts it to a GET on the way, which drops `e.postData`. Send from the site as
a GET with URL params and read `e.parameter`. Keep `doPost` implemented anyway
for a JSON body, in case the front end changes.

**`no-cors` blinds the front end.** The site cannot read the response, so the
success screen shows whether or not the send actually worked. State this in
handover. JSONP is the fix if it ever matters enough.

**Editing the script does not update the live URL.** Deploy > Manage deployments
> edit > New version. Every single time.

**The sheet write and the email must be independent.** Wrap the sheet write in
its own try/catch. If the script is not bound, the sheet is renamed, or quota is
hit, the notification still has to go out. Losing a lead because a sheet write
failed is the worst possible failure.

**Bound vs standalone.** `SpreadsheetApp.getActiveSpreadsheet()` returns null in
a standalone script. Keep a `SHEET_ID` constant as the fallback.

**Quota:** 100 recipients/day on a free Gmail account, 1500 on Workspace. Fine
for a contact form, worth knowing if they ever want autoresponders too.

## Email HTML

**Double quotes inside a `style="..."` attribute close it early.** This is the
one that silently killed half a stylesheet on a live client email: a font stack
written `font-family:"Courier New",...` inside an inline style ends the
attribute at the first quote and every declaration after it is dropped. Use
single quotes for font names: `'Courier New',Courier,monospace`.

**Dark mode will repaint the email unless you stop it.** Belt and braces, all
four:
- `!important` on every single colour declaration
- a `bgcolor="..."` attribute on every block that has a background
- `<meta name="color-scheme">` and `<meta name="supported-color-schemes">`
- a `:root{color-scheme:...}` rule in a `<style>` block

Gmail on Android/iOS and Outlook.com invert light designs. Apple Mail inverts
when no color-scheme is declared. The target is: identical in light and dark.

**Outlook on Windows renders with Word.** No flex, no grid, no `border-radius`,
no `background-image`, no web fonts, no CSS positioning. Design so squared-off
corners are a non-event rather than a broken layout.

**Buttons must be padded table cells,** `<td bgcolor>` with an `<a>` inside, not
a styled `<a>` with padding. A styled link loses its background in several
clients and becomes invisible text.

**Fonts:** Helvetica/Arial and Courier New only. No webfonts, they will not load.

**Width:** 600px table, `max-width:600px`, plus a media query dropping side
padding under 600px. Any wider and Outlook's reading pane clips it.

**Images:** avoid entirely. They are blocked by default, so a logo image means
most opens show a broken box where the branding should be. Set the brand with
type and colour instead.

**Escape everything.** Every value that lands in the HTML goes through `esc_()`,
including inside `href` attributes (`mailto:` especially, since an address with
a quote in it breaks the tag). Test with `"><script>alert(1)</script>`.

**Dead buttons.** Require 6+ digits before rendering a `tel:` button and a real
`user@host.tld` shape before rendering `mailto:`. People type "n/a".

**Clamp names used in button labels** to ~18 chars or a pasted paragraph in the
name field blows out the layout.

**Plain-text part is not optional.** Some clients and most watches show it. Keep
it a readable summary, not a dump.

**Subject line format:** `New <Business> enquiry: <Name> (<Company>)`. Business
name so it is obvious which site fired, name so it is triageable from the list
view, company drops off cleanly when absent.

**Reply-to** goes to the enquirer, so hitting reply in the notification starts
the actual reply. This is the single highest-value line in the file.

## Previewing

**Headless Chrome will not make a window narrower than 500px.** A
`--window-size=375` screenshot is a 500px layout cropped to 375, so every mobile
media query silently lies and the email looks broken when it is not. Render
inside a 375px `<iframe>` instead, which gets its own viewport.
`scripts/preview.js` already does this.

**Outlook needs a fixed-width table, phones need a fluid one.** Use an
`<!--[if mso]>` conditional 600px wrapper around a `width:100%;max-width:600px`
table. A bare `width="600"` will not reflow on a phone.

## Front end

**Field names must match** what the script reads, exactly. Check the actual
`name` attributes rather than trusting the last project's list.

**Lock the submit button** while the request is in flight, or a slow network
produces duplicate leads.

**Multi-selects** arrive as a joined string. Decide the separator and keep it
consistent between the sheet column and the email row.
