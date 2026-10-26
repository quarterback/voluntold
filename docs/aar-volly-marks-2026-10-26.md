# Agent Action Record: The Volly wordmark and favicon, and cutting the Vloora line

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Generating the wordmark and favicon, and removing the Vloora credit from the card
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "i did ask for a wordmark and a favicon generated", then "get rid of a vloora product as well", then "i'll add it later but it's not relevant right now".
**Success defined in advance as:** A wordmark and a favicon exist as real assets, made from the owner's typeface, and the card no longer credits Vloora.
**Authority granted to the agent:** Generate the marks, change the card, deploy.
**Out of scope:** A drawn logo, a final name, a web app manifest.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. The agent had skipped the favicon in the previous run and said so in that record, treating it as not asked for. The owner corrected that. Both were in the original instruction.
2. Installed `fonttools` and `brotli` so the outlines could be pulled from `PPObjectSans-Heavy.woff2` rather than screenshotting type. This matters: a PNG of text is not a mark, and would not scale or recolour.
3. Extracted the glyph outlines for "Volly" and for "V", flipped them into SVG space, and applied the same tracking the screens use.
4. Wrote `public/wordmark.svg`: the five letters as one path, filled with `currentColor` so it takes the colour around it. Tight viewBox, no font needed to render it.
5. Wrote `public/favicon.svg`: the V in lime on an ink rounded square, the glyph set to 330 of 512 so it still reads small.
6. Wrote `scripts/make-icons.mjs` to render the favicon to 16, 32, 180 and 512 pixel PNGs. The first attempt navigated to the SVG file directly and failed, because a browser renders a bare SVG as an image document with no head to style. Fixed by wrapping the markup in a page.
7. Removed the Vloora line from `scripts/og-card.html`, dropped the styles it used, and centred what was left. Rebuilt `public/og.png`.
8. Added a `Wordmark` component in `src/web/Wordmark.tsx` holding the same outlines, and used it on the sign-in screen in place of the text. The mark now draws immediately instead of waiting on the font.
9. Linked the icons in `index.html`: SVG first, then 32 and 16 pixel PNGs, then the Apple touch icon.
10. Ran the copy lint (597 strings, unchanged), type checked the web app, built, deployed. Version `0151e3d9-c2a7-4807-b426-ebd83a41aa0e`.
11. Confirmed live: all seven assets return 200 with the right content types, the page has no Vloora text, and the sign-in screen draws the vector wordmark at phone and desktop width. Looked at the 16 pixel favicon at size: the V reads.
**What it produced or changed:** `public/wordmark.svg`, `public/favicon.svg`, four icon PNGs, a rebuilt `public/og.png`, `src/web/Wordmark.tsx`, `src/web/pages/Login.tsx`, `index.html`, `scripts/og-card.html`, `scripts/make-icons.mjs`, this record.
**Where actual behavior differed from the instruction:** None this run. The deviation was the previous run's, recorded above.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** Volly as the codename. A wordmark and a favicon. No Vloora credit for now.
**Decisions the agent made alone, for owner review:**
- Real outlines over rendered text. It cost an install and a script, and it means the marks scale, recolour and need no font.
- The favicon is the V alone on an ink square, not the whole word. "Volly" at 16 pixels is a smudge.
- Lime on ink for the icon, matching the card, rather than the ink on lilac the app uses. An icon sits on someone else's background and needs its own ground.
- The rounded corner radius is 104 of 512, which is close to the squircle phones expect. No platform specific masking was done.
- The sign-in screen now draws the vector mark rather than text set in the font. Visually the same, but it cannot flash unstyled.
- Kept `og:image` and the rest of the absolute addresses pointing at the demo, unchanged from the last run and still needing attention when the domain changes.
- No web app manifest, so the 512 pixel icon is currently unreferenced. It exists because installing to a home screen is in the next version spec, section 9.
**Left to the owner:** Whether the icon should be a drawn mark rather than a letter. Whether to add a manifest now. The real name, which means regenerating all of this.

## 4. Deviation: the gaps
- The icon was checked at 512 and 16 pixels by eye in this session, not on a device, not against a dark browser chrome, and not as an installed home screen icon.
- Contrast of lime on ink was not measured here. The theme documents ink on lime at 14.3 to 1, which is the same pair inverted and so not the same number, though both are far above the threshold.
- `icon-512.png` is generated and served but nothing links to it.
- No ICO file. Modern browsers take the PNG and SVG links; a very old one would fall back to a missing `/favicon.ico`.
- The card still has not been seen in a real link preview, carried over from the previous run.
- `scripts/make-icons.mjs` and `scripts/make-og.mjs` both need Playwright, which is not a dependency of this project.
- Per the owner's standing instruction, no test run and no docs check. The copy lint was run.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** The tool has a wordmark and an icon drawn from its own typeface, in the repository as source, regenerable by two commands. The card credits nobody.
**Risk:** Everything here is tied to the codename. A rename means new outlines, new icons, a new card and a change to `Wordmark.tsx`. That is about two commands and one file, which is the reason the sources were committed rather than only the output.
**Also:** Two python packages were installed into this container to do the extraction. They are not in the project, and the generated SVGs do not need them. Only regenerating from a different name or typeface would.

## 6. Change: what happens next
1. Look at the icon on a phone home screen and in a browser tab before it matters.
2. Add a web app manifest when the installable app in section 9 is built, and point it at `icon-512.png`.
3. On a real domain: change the absolute addresses in `index.html`, then `node scripts/make-og.mjs`.
4. On a rename: rerun the outline extraction, `node scripts/make-icons.mjs`, `node scripts/make-og.mjs`, and update `src/web/Wordmark.tsx`.
