/**
 * <BUSINESS> — website enquiry backend
 * ------------------------------------
 * TEMPLATE. Swap the CONFIG and PALETTE blocks, swap the field list in
 * buildHtml_/saveRow_/buildPlain_ for the form's real fields, keep everything
 * else. The layout is the house style.
 *
 * Writes each submission to the bound Google Sheet and sends one branded
 * notification email.
 *
 * The site sends a GET with URL params (Apps Script 302-redirects POSTs and
 * turns them into GETs, which loses e.postData). doPost is kept for a JSON body
 * in case the front end ever changes.
 */

/* ================= CONFIG ================= */

// Your own inbox while building and testing. Only change to the client's
// address after sign-off, then redeploy a new version.
var NOTIFY_TO   = 'you@youremail.com';
var SENDER_NAME = '<Business> Website';
var BRAND       = '<Business>';
// The leads sheet, linked at the foot of every notification. Empty hides it.
var SHEET_URL   = '';
// Leave empty when the script is bound to the sheet. Set when standalone.
var SHEET_ID    = '';

/* ================= PALETTE =================
   Light by default. Pull `brand` and `brandDark` from the site's styles.css
   or the project's context.md.
   `brandDark` only needs to be dark enough for white button text to pass
   contrast; if the brand colour is already dark enough, use it for both.

   DARK TOGGLE: only when the client is genuinely dark-branded AND the user
   asks for it. Swap the whole C block below for this set, and in buildHtml_
   flip the two color-scheme declarations from "light dark" to "dark light":
     page:'#0A0A0A', card:'#161616', panel:'#1F1F1F', line:'#2A2A2A',
     brand:<bright brand colour>, brandDark:<base brand colour>,
     ink:'#FFFFFF', body:'#C9CBCE', muted:'#8A8D92', onBrand:'#FFFFFF'
   Everything else (rounded card, Helvetica labels, structure) stays identical. */

var C = {
  page:      '#F4F4F2', // soft tint behind the card
  card:      '#FFFFFF', // the card itself
  panel:     '#F7F7F5', // the message panel
  line:      '#E6E5E1', // hairlines
  brand:     '#0055FE', // accent: header rule, eyebrow, primary button
  brandDark: '#0044CC', // button background (darker if brand colour is light)
  ink:       '#14161A', // headings and values
  body:      '#3C4046', // message copy
  muted:     '#7A7F87', // labels, footer
  onBrand:   '#FFFFFF'  // text on the primary button
};

// Rounded corners on the card, panels, and buttons. Outlook-on-Windows squares
// them off — that is a non-event, nothing load-bearing sits on the radius.
var RADIUS = '16px'; // the card
var RPILL  = '8px';  // panels and buttons

// One typeface throughout. Web fonts do not load in email.
var SANS = 'Helvetica,Arial,sans-serif';

/* ================= ENTRY POINTS ================= */

function doGet(e) {
  var d = readParams_(e);
  if (!d.name && !d.email && !d.message) {
    return json_({ ok: true, service: BRAND + ' enquiry endpoint' });
  }
  return handle_(d);
}

function doPost(e) {
  var d = readParams_(e);
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      for (var k in body) if (body[k]) d[k] = body[k];
    } catch (err) { /* not JSON, params already read */ }
  }
  return handle_(d);
}

function handle_(d) {
  var sheetErr = '';
  // Independent on purpose: a failed sheet write must never cost the lead.
  try { saveRow_(d); } catch (err) { sheetErr = String(err); }
  try {
    sendEmail_(d);
  } catch (err) {
    return json_({ ok: false, error: String(err), sheetError: sheetErr });
  }
  return json_({ ok: true, sheetError: sheetErr });
}

// EDIT: one line per field the form actually sends.
function readParams_(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  return {
    name:    p.name    || '',
    company: p.company || '',
    email:   p.email   || '',
    phone:   p.phone   || '',
    type:    p.type    || '',
    message: p.message || '',
    page:    p.page    || ''
  };
}

/* ================= SHEET =================
   Single form -> first sheet, as below.
   MULTIPLE sources into one spreadsheet (e.g. a contact form plus a lead-
   capture page): route each to its own tab rather than one mixed sheet.
   Pick the tab by a `kind` param the front end sends, then:
     var sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
   Give each tab its own header row so it stays clean. */

function saveRow_(d) {
  var ss = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: bind the script or set SHEET_ID.');
  var sheet = ss.getSheets()[0];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Received', 'Name', 'Company', 'Email', 'Phone', 'Enquiry', 'Message', 'Page']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    d.name || '', d.company || '', d.email || '', d.phone || '',
    d.type || '', d.message || '', d.page || ''
  ]);
}

/* ================= EMAIL ================= */

function sendEmail_(d) {
  MailApp.sendEmail(NOTIFY_TO, buildSubject_(d), buildPlain_(d), {
    name: SENDER_NAME,
    htmlBody: buildHtml_(d),
    replyTo: d.email || undefined   // reply goes straight to the enquirer
  });
}

function buildSubject_(d) {
  var who  = d.name || 'New contact';
  var tail = d.company ? ' (' + d.company + ')' : '';
  return 'New ' + BRAND + ' enquiry: ' + who + tail;
}

function buildPlain_(d) {
  return [
    'NEW ' + BRAND.toUpperCase() + ' ENQUIRY',
    '',
    'Name:     ' + (d.name || ''),
    'Company:  ' + (d.company || ''),
    'Email:    ' + (d.email || ''),
    'Phone:    ' + (d.phone || ''),
    'Enquiry:  ' + (d.type || ''),
    '',
    'MESSAGE',
    (d.message || '(none given)'),
    '',
    'Sent from the ' + BRAND + ' website contact form' + (d.page ? ' (' + d.page + ')' : '') + '.'
  ].join('\n');
}

/**
 * Rules baked in here, all deliberate. See reference/gotchas.md.
 *  - tables and inline styles only — no flex/grid, no web fonts, no images
 *  - !important on every colour + bgcolor on every block (Gmail dark mode,
 *    Outlook.com dark mode cannot repaint)
 *  - color-scheme meta stops Apple Mail auto-inverting
 *  - nothing load-bearing on border-radius (Outlook squares it off harmlessly)
 *  - buttons are padded table cells, not styled links
 */
function buildHtml_(d) {
  var name  = d.name || 'Someone';
  var first = (String(name).split(' ')[0] || 'them').slice(0, 18);

  // A button only appears when the value is actually usable.
  var digits   = String(d.phone || '').replace(/[^\d+]/g, '');
  var callable = digits.replace(/\D/g, '').length >= 6;
  var tel      = 'tel:' + digits;
  var mailable = /.+@.+\..+/.test(String(d.email || ''));

  // EDIT: the rows for this form. [label, value, optional href]
  var rows = [
    ['Name',    d.name],
    ['Company', d.company],
    ['Email',   d.email, mailable ? 'mailto:' + esc_(d.email) : ''],
    ['Phone',   d.phone, callable ? tel : ''],
    ['Enquiry', d.type]
  ].filter(function (r) { return r[1]; }).map(function (r, i, all) {
    var border = (i === all.length - 1) ? '' : 'border-bottom:1px solid ' + C.line + ';';
    var value = r[2]
      ? '<a href="' + r[2] + '" style="color:' + C.ink + ' !important;text-decoration:none;' +
        'border-bottom:1px solid ' + C.line + ';">' + esc_(r[1]) + '</a>'
      : esc_(r[1]);
    return '<tr>' +
      '<td bgcolor="' + C.card + '" width="120" style="background-color:' + C.card + ' !important;' + border +
        'padding:15px 16px 15px 0;color:' + C.muted + ' !important;font:700 11px/1.35 ' + SANS + ';' +
        'letter-spacing:.13em;text-transform:uppercase;vertical-align:top;">' + r[0] + '</td>' +
      '<td bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' + border +
        'padding:13px 0;color:' + C.ink + ' !important;font:400 17px/1.45 ' + SANS + ';">' + value + '</td>' +
    '</tr>';
  }).join('');

  var panel =
    '<tr><td bgcolor="' + C.panel + '" style="background-color:' + C.panel + ' !important;' +
      'border-left:3px solid ' + C.brand + ';border-radius:' + RPILL + ';padding:20px 22px;">' +
      '<div style="color:' + C.muted + ' !important;font:700 11px/1.2 ' + SANS + ';letter-spacing:.13em;' +
        'text-transform:uppercase;padding-bottom:10px;">Message</div>' +
      '<div style="color:' + C.body + ' !important;font:400 16px/1.65 ' + SANS + ';white-space:pre-wrap;">' +
        esc_(d.message || 'No message written.') + '</div>' +
    '</td></tr>';

  // EDIT: the two actions. First one is solid. Usually Call then Email.
  var solid = function (href, label) {
    return '<td bgcolor="' + C.brandDark + '" style="background-color:' + C.brandDark + ' !important;' +
      'border-radius:' + RPILL + ';padding:15px 30px;">' +
      '<a href="' + href + '" style="color:' + C.onBrand + ' !important;text-decoration:none;' +
      'font:700 13px/1 ' + SANS + ';letter-spacing:.1em;text-transform:uppercase;">' + label + '</a></td>';
  };
  var ghost = function (href, label) {
    return '<td bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' +
      'border:1px solid ' + C.line + ';border-radius:' + RPILL + ';padding:14px 28px;">' +
      '<a href="' + href + '" style="color:' + C.ink + ' !important;text-decoration:none;' +
      'font:700 13px/1 ' + SANS + ';letter-spacing:.1em;text-transform:uppercase;">' + label + '</a></td>';
  };
  var mailHref = 'mailto:' + esc_(d.email) + '?subject=' +
    encodeURIComponent('Re: your enquiry with ' + BRAND);

  var buttons = '';
  if (callable && mailable) {
    buttons = solid(tel, 'Call ' + esc_(first)) +
      '<td width="10" style="width:10px;">&nbsp;</td>' + ghost(mailHref, 'Email');
  } else if (callable) {
    buttons = solid(tel, 'Call ' + esc_(first));
  } else if (mailable) {
    buttons = solid(mailHref, 'Email ' + esc_(first));
  }

  // No usable contact method: drop the row rather than leave an empty band.
  var actions = buttons
    ? '<tr><td class="pad" bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;padding:28px 40px 38px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' + buttons + '</tr></table>' +
      '</td></tr>'
    : '<tr><td bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;height:34px;font-size:0;line-height:0;">&nbsp;</td></tr>';

  return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="color-scheme" content="light dark">' +
'<meta name="supported-color-schemes" content="light dark">' +
'<style>:root{color-scheme:light dark;supported-color-schemes:light dark;}' +
'@media (max-width:600px){.pad{padding-left:24px !important;padding-right:24px !important;}' +
'.hd{font-size:26px !important;}}</style></head>' +
'<body style="margin:0;padding:0;background-color:' + C.page + ' !important;" bgcolor="' + C.page + '">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
  'bgcolor="' + C.page + '" style="background-color:' + C.page + ' !important;">' +
'<tr><td align="center" style="padding:32px 12px 44px;">' +

  '<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    'style="width:100%;max-width:600px;">' +

  '<tr><td style="padding:0;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    'bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' +
    'border:1px solid ' + C.line + ';border-radius:' + RADIUS + ';">' +

    '<tr><td class="pad" bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' +
      'border-top:4px solid ' + C.brand + ';border-radius:' + RADIUS + ' ' + RADIUS + ' 0 0;padding:34px 40px 28px;">' +
      '<div style="color:' + C.brand + ' !important;font:700 11px/1.2 ' + SANS + ';letter-spacing:.2em;' +
        'text-transform:uppercase;">' + esc_(BRAND) + '</div>' +
      '<div class="hd" style="color:' + C.ink + ' !important;font:700 32px/1.15 ' + SANS + ';' +
        'letter-spacing:-.01em;padding-top:14px;">New enquiry</div>' +
      '<div style="color:' + C.muted + ' !important;font:400 15px/1.5 ' + SANS + ';padding-top:10px;">' +
        esc_(name) + (d.company ? ' &middot; ' + esc_(d.company) : '') + '</div>' +
    '</td></tr>' +

    (rows ? '<tr><td class="pad" bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;padding:0 40px;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
        'bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' +
        'border-top:1px solid ' + C.line + ';">' + rows + '</table>' +
    '</td></tr>' : '') +

    '<tr><td class="pad" bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;padding:26px 40px 0;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + panel + '</table>' +
    '</td></tr>' +

    actions +

  '</table></td></tr>' +

    '<tr><td class="pad" bgcolor="' + C.page + '" style="background-color:' + C.page + ' !important;padding:20px 40px 0;">' +
      '<div style="color:' + C.muted + ' !important;font:700 11px/1.7 ' + SANS + ';letter-spacing:.12em;' +
        'text-transform:uppercase;">Website contact form' +
        (d.page ? ' &nbsp;&middot;&nbsp; ' + esc_(d.page) : '') + '</div>' +
      (SHEET_URL ? '<div style="padding-top:8px;"><a href="' + SHEET_URL + '" ' +
        'style="color:' + C.muted + ' !important;font:400 12px/1.7 ' + SANS + ';' +
        'text-decoration:underline;">View the full leads database</a></div>' : '') +
    '</td></tr>' +

  '</table>' +
  '<!--[if mso]></td></tr></table><![endif]-->' +
'</td></tr></table></body></html>';
}

/* ================= HELPERS ================= */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
