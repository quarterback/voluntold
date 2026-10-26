# Agent Action Record: Codename Volly, with a description and an OpenGraph card

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Naming the tool Volly and giving it link metadata
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "lastly, this thing needs a codename idk what it'll ultimatley be called but make sure it has meta description and an opengraph card even though it'll be updated. I think for now it's just called Volly with a custom typeface". Then: "the subtitle or description of the tool 'Volunteers *activated*'". Then: "do not write a slop descripton".
**Success defined in advance as:** The page is titled Volly, carries a description and an OpenGraph card, and the card uses the owner's own type.
**Authority granted to the agent:** Name it, write the metadata, make the card, deploy.
**Out of scope:** A final name, a domain, a logo beyond the wordmark, a favicon.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read `index.html`. It was titled "Volunteers" with no description and no OpenGraph tags.
2. Built the card as an HTML page rendered to PNG at 1200 by 630, using the font files already in `public/fonts/`: PP Object Sans Heavy for the wordmark, PP Neue Montreal for the footer.
3. First draft carried a line of the agent's own writing: "Ask the right volunteers. They answer from a link on their phone." The owner replaced it with "Volunteers activated" mid run, and then said not to write a slop description.
4. Set "activated" in PP Object Sans HeavySlanted in tangerine, next to "Volunteers" in white. The slanted cut was already in the repository and unused.
5. Cut the description back to "Volunteers activated." in all four places: the meta description, `og:description`, `twitter:description`, and nothing added around it.
6. Wrote `index.html`: title, description, `og:site_name`, `og:type`, `og:title`, `og:description`, `og:url`, `og:image` with type, width, height and alt text, and the four `twitter:` tags with `summary_large_image`.
7. Changed the sign-in wordmark from "Volunteers" to "Volly" and set it in the display face at 2rem.
8. Saved the card's source as `scripts/og-card.html` and a one command generator as `scripts/make-og.mjs`, so the card can be remade when the name changes.
9. Ran the interface copy lint (597 strings, 1440 words, unchanged), type checked the web app, built and deployed. Version `9f51bd84-504c-4788-9952-a00a8e3c4110`.
10. Confirmed live: every tag is served, `/og.png` returns 200 as `image/png`, and the page title reads Volly in a browser at phone and desktop width.
**What it produced or changed:** `index.html`, `src/web/pages/Login.tsx`, `public/og.png`, `scripts/og-card.html`, `scripts/make-og.mjs`, this record.
**Where actual behavior differed from the instruction:** The agent wrote a marketing line that was not asked for, and the owner cut it. Noted in section 3.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** The codename Volly. The subtitle "Volunteers activated", with activated emphasized. No slop description.
**Decisions the agent made alone, for owner review:**
- Writing a descriptive sentence for the card and the meta description before being told the subtitle. It was the kind of copy this repository exists to keep out, and the owner had to say so. The correction is recorded here rather than smoothed over.
- Emphasizing "activated" with the HeavySlanted cut in tangerine, reading the owner's asterisks as emphasis.
- One description everywhere. A longer meta description would read better to a search engine, but the owner asked for no slop, and two descriptions would mean writing the thing they rejected.
- Absolute addresses point at the demo, because OpenGraph needs absolute image URLs. A comment in `index.html` says they must change with the domain.
- The tagline is not on any screen. The sign-in page shows the wordmark alone. Putting "Volunteers activated" under it is a copy decision for the owner, not one to make quietly.
- No favicon. Not asked for, and it needs a mark rather than a wordmark.
**Left to the owner:** The real name. The domain, which invalidates the absolute addresses. Whether the tagline belongs on a screen. Whether a favicon is wanted.

## 4. Deviation: the gaps
- The card was not checked in a link preview. The tags are served and the image loads, but no crawler has rendered it. Facebook's and LinkedIn's debuggers cannot reach a `workers.dev` address the agent can post to, so this is unverified where it matters.
- `scripts/make-og.mjs` needs Playwright, which is not a dependency of this project. It works here because the machine has it. On another machine it prints an instruction and stops.
- Contrast on the card was not measured. White on the ink ground is far above the threshold, and the tangerine on ink is the same pairing the theme already documents at 6.5 to 1 the other way round, which is not the same measurement.
- The wordmark is type, not a logo. It will not hold up small, which is the favicon problem above.
- Per the owner's standing instruction, no test run and no docs check. The copy lint was run, as the owner asked earlier in this session.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** A link to the demo now unfurls with the wordmark, the subtitle and a readable card instead of a bare address. The page is titled Volly.
**Risk:** The addresses in `index.html` are the demo's. The moment the tool moves, the card breaks silently: a link preview falls back to no image, and nothing in the build catches it.
**Also:** Volly is a codename in the page title, the sign-in screen and the card. Changing it later means those three places plus the card image.

## 6. Change: what happens next
1. When a domain exists, change the three absolute addresses in `index.html` and run `node scripts/make-og.mjs` if the name changed.
2. Check the card in a real link preview once it sits on a public address.
3. Decide whether the tagline goes on the sign-in screen.
4. A favicon, if the tool is going to live in browser tabs.
