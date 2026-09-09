#!/usr/bin/env node
/**
 * Render an Apps Script notification email to PNGs, without deploying anything.
 *
 *   node preview.js <path-to-Code.gs> <output-dir> [--mobile]
 *
 * Evals the .gs (the HTML builder is plain JS, the Google globals are never
 * touched by buildHtml_), renders a full submission plus five awkward ones,
 * screenshots each with headless Chrome and builds a comparison grid.
 *
 * Writes:
 *   main.png       the full submission, desktop width
 *   mobile.png     the full submission at 375px
 *   edge-grid.png  the five degraded cases side by side
 *   case-*.html    every rendered case, openable in a browser
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const gsPath = process.argv[2];
const outDir = process.argv[3];
if (!gsPath || !outDir) {
  console.error('usage: preview.js <path-to-Code.gs> <output-dir>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

// Stub the Google globals so a stray reference at load time cannot throw.
const SpreadsheetApp = {}, MailApp = {}, ContentService = {}, Utilities = {};
eval(fs.readFileSync(gsPath, 'utf8'));

if (typeof buildHtml_ !== 'function') {
  console.error('No buildHtml_ found in ' + gsPath);
  process.exit(1);
}

// Generic samples. Field names not present in the script are simply ignored,
// so this works for any form shape.
const full = {
  name: 'Jane Doe', company: 'Acme Athletic', email: 'jane@acmeathletic.com',
  phone: '+61 400 111 222', type: 'New website, Ongoing support',
  service: 'New website', sector: 'Retail', stage: 'Ready to start',
  suburb: 'Toowoomba', budget: '$5k - $10k',
  message: "We're launching in March and need the site live before then.\n\nHappy to work to your process. What do you need from us to start?",
  page: '/contact.html'
};

const cases = {
  full,
  'email-only': { name: 'Sam', email: 'sam@example.com', type: 'General', page: '/contact.html' },
  'phone-only': { name: 'Bo Li', phone: '0400 111 222', message: 'Call me this arvo.' },
  'junk-phone': { name: 'Kim', email: 'k@example.com', phone: 'n/a', message: 'Quick question about pricing.' },
  'no-message': { name: 'Pat Reilly', company: 'Reilly Co', email: 'p@example.com', phone: '0400111222', type: 'Quote' },
  'empty': {},
  'hostile': {
    name: '"><script>alert(1)</script> & co', company: 'A & B <b>',
    email: 'x"y@z.com', phone: '++1 (973) 897-4986 ext 2',
    message: '<img src=x onerror=alert(1)> & "quotes"', type: 'Other & more'
  },
  'overflow': {
    name: 'Alexandria Wentworth-Fitzgerald III',
    company: 'A Very Long Production Company Name Pty Ltd',
    email: 'alexandria.wentworth.fitzgerald@a-very-long-domain-example.com',
    phone: '+61 400 000 000', message: 'Lorem ipsum dolor sit amet. '.repeat(45)
  }
};

let failures = 0;
const written = {};

for (const key of Object.keys(cases)) {
  let html;
  try {
    html = buildHtml_(cases[key]);
  } catch (err) {
    console.log('FAIL  ' + key + ' threw: ' + err.message);
    failures++;
    continue;
  }

  // Safety checks that have caught real bugs.
  if (/<script[\s>]/i.test(html)) {
    console.log('FAIL  ' + key + ': raw <script> tag in output, escaping is broken');
    failures++;
  }
  if (/style="[^"]*"[A-Za-z]/.test(html)) {
    console.log('FAIL  ' + key + ': a style attribute is closing early, check for double quotes in a font stack');
    failures++;
  }
  if (/href="[^"]*"[A-Za-z]/.test(html)) {
    console.log('FAIL  ' + key + ': an href is closing early, escape the URL');
    failures++;
  }

  const file = path.join(outDir, 'case-' + key + '.html');
  fs.writeFileSync(file, html);
  written[key] = file;
  console.log('ok    ' + key.padEnd(12) + (html.length / 1024).toFixed(1) + 'kb');
}

function shoot(url, out, w, h, scale) {
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=' + (scale || 1.5),
    '--window-size=' + w + ',' + h,
    '--screenshot=' + out, url
  ], { stdio: 'ignore' });
}

if (written.full) {
  shoot('file://' + written.full, path.join(outDir, 'main.png'), 680, 980);
  // Headless Chrome refuses to make a window narrower than 500px, so a
  // --window-size=375 shot is a 500px layout cropped to 375 and every mobile
  // media query lies. Render inside a 375px iframe instead: the iframe is its
  // own viewport, so the query fires for real.
  const phone = path.join(outDir, 'phone.html');
  fs.writeFileSync(phone,
    '<body style="margin:0;background:#999">' +
    '<iframe src="case-full.html" style="width:375px;height:1000px;border:0;display:block"></iframe>' +
    '</body>');
  shoot('file://' + phone, path.join(outDir, 'mobile.png'), 375, 1000, 2);
}

const edge = ['email-only', 'phone-only', 'junk-phone', 'no-message', 'empty', 'overflow']
  .filter(k => written[k]);
if (edge.length) {
  const grid = path.join(outDir, 'grid.html');
  fs.writeFileSync(grid,
    '<body style="margin:0;background:#888;display:flex;flex-wrap:wrap">' +
    edge.map(k => '<iframe src="case-' + k + '.html" style="width:50%;height:660px;border:0"></iframe>').join('') +
    '</body>');
  shoot('file://' + grid, path.join(outDir, 'edge-grid.png'), 1360, 1990, 1);
}

console.log('');
console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
console.log('screenshots in ' + outDir);
process.exit(failures ? 1 : 0);
