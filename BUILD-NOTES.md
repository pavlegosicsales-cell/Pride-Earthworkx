# Pride Earthworx site — build notes

Built 2026-09-09 with Skill 02 (website-build-rules), using the B-Steel repo
(`pavlegosicsales-cell/B-Steel`) as the design source, as asked.

## Where the design came from

The B-Steel repo turned out to be plain HTML/CSS/JS with a full, well documented
teardown of the **Konstra** Framer template already in it. Nothing had to be
guessed and there was no need to go back to the original Framer template.

Carried over unchanged:

- `css/tokens.css` — the whole type scale, spacing, radii, easing curves and
  entrance timings, all measured off Konstra
- `css/styles.css` — every section component
- `css/stranice.css` — inner page components
- `js/main.js` — reveals, hero intro, word split, sticky card stack, count up,
  card flip, works slider, process rail, FAQ, lightbox, preloader
- `js/wizard.js` — the multi step enquiry form

Changed on purpose, all commented in place with `PRIDE:`:

1. **Palette.** Swapped the warm sand palette for Pride's black and teal,
   sampled off the supplied logo (`#01ABB2`) and the Instagram logo card
   (`#5FE3E0`). Every pair is contrast checked in `tokens.css`.
2. **Hero field inverted.** Konstra and B-Steel run a pale sky at the top so the
   heading can be dark. Pride is a black brand and the photos are bright dirt
   under bright sky, so the gradient ramp is dark and the type is light. The
   ramp also runs longer (78% instead of 46%) because the original stops left
   the lead paragraph at 2.9:1 over midday blue.
3. **Primary button.** Was black; black on a black field disappears. Now the
   teal fill under black text, 10.1:1, and it is the only filled CTA colour.
4. **Logo handling.** B-Steel flattened its chrome badge to pure black or white
   with a CSS filter. That would throw away Pride's teal flash, so the mark
   ships as two files (`logo.png`, `logo-light.png`) that cross fade on the
   header state. The text wordmark is now screen reader only, because the
   supplied logo already contains "PRIDE EARTHWORX".

## Sections

Every section I wanted had a counterpart in the B-Steel build, so nothing was
dropped or invented:

| Pride section | B-Steel / Konstra component |
| --- | --- |
| Hero | `.hero` |
| Who we are | `.about` scroll fill statement |
| Services | `.svcs` sticky stacking cards |
| How we work | `.proces` rail |
| Track record | `.metrics` flip cards |
| Work | `.works` grid + lightbox |
| Common questions | `.faq` |
| Contact strip | `.contact` |
| Contact page | `.kontakt` + `.glass` + `.wizard` + `.next` |
| Privacy | `.ahero` + `.legal` |

Dropped from B-Steel because they do not apply: the SR/EN language switcher, the
footer globe (Serbia specific, needed an external data file), and the
testimonials block.

**No testimonials or star ratings anywhere.** Pride has zero reviews on record
right now. Do not add a ratings block until there are real ones.

## Things you need to know

1. **The form endpoint was live and pointing at B-Steel.** `wizard.js` shipped
   with a working Google Apps Script `/exec` URL in it. Left alone, every Pride
   enquiry would have landed in the other client's inbox and spreadsheet. It is
   now `''`. Run Skill 03 to generate Pride's own and paste it in.
2. **Image resolution.** All 165 job photos came off Instagram's grid, which
   serves 640px wide thumbnails. That is fine for the gallery and the service
   cards, but the hero upscales on a wide desktop and looks soft. Ask the client
   for the originals off their phone.
3. **The brand is Pride Earthwor*x*.** The desktop folder says "Earthworkx".
   The site uses the correct spelling throughout.

## TODO before this goes live

Marked with `TODO` comments in the files:

- Real service area. ACT only, or national, as the Instagram suggests?
- Whether they supply plant, operators, or both (FAQ 2)
- Whether they want residential enquiries at all (FAQ 5)
- The "12 civil contractors" figure — counted off Instagram tags, needs
  confirming, and check they are happy to be associated with those names
- ABN for the privacy page footer
- Real phone or office hours (Facebook just says "Always open")
- Project names, locations and years for the work gallery
- The live domain, for the canonical tags and the OG image URLs

## Running it

```bash
python -m http.server 5178
```
