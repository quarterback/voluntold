# Agent Action Record: Owner's npm packages

**Review date:** 2026-10-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, main session
**Task or period under review:** Installing the owner's three npm packages in `quarterback/voluntold` and using them on the docs
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given:** "Install my npm packages too. All 3 of them"
**How the agent read it:** Find the three packages the owner publishes on npm, add them to this project, and use them on this PR's docs.
**Success defined in advance as:** The packages are in `package.json`, they run, and the docs pass them.
**Authority granted to the agent:** Change this repository on `claude/volunteer-product-spec-946b8g` and push.
**Out of scope at first:** Running the packages' project setup, which adds agent instructions to the repository. The owner then said "Install my packages and run them!", and the setup was run (steps 6 and 7).

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Found the packages by `npm search maintainer:ronbronson`: `closedtab` 0.5.0, `plain-language-default` 0.1.0 and `prosekeep` 0.3.0. `closedtab` is also named in the vloora CLAUDE.md.
2. Checked that none of them runs install scripts, then added all three as dev dependencies.
3. Ran `closedtab check` on every record (all 6/6). Ran `plain-language-default check` on the new docs, and split five long sentences it found in decisions 0006 to 0008. Ran `prosekeep check --profile vloora`. It flagged 12 em dashes in the headings of the two October 21 records, and the headings were changed to colons to match the newer records.
4. Added `scripts/check-docs.mjs` and `npm run check:docs` (prosekeep and closedtab), and a CI step that runs it.
5. Ran `prosekeep init --help` expecting help text. The command ignored `--help` and created `.editorial.json` and `EDITORIAL.md`. Both files were deleted before anything was committed.

6. After the owner's go-ahead: installed all three globally, then ran `plain-language-default install` and `prosekeep init --profile vloora` and `prosekeep skill` for `.claude/skills` and `.agents/skills`. Copied the closedtab skill from `quarterback/vloora`, because the npm package ships none. Added a "Records and checks" section to the new `CLAUDE.md` and `AGENTS.md`. Pointed `check:docs` at `.editorial.json`.
7. Ran all three: closedtab scored every record 6/6, and `prosekeep check` and `prosekeep audit` found no problems in 32 files. `plain-language-default check` flagged 33 items in the new docs. All but seven came from a heading or list item being read together with the next line. Two of the seven were real long sentences in `SPEC.md`, and they were split.

**What it produced or changed:** `CLAUDE.md`, `AGENTS.md`, `.editorial.json`, `EDITORIAL.md` (a blank template), skills in `.claude/skills`, `.agents/skills` and `.cursor`, two sentences in `SPEC.md`, `package.json`, `package-lock.json`, `scripts/check-docs.mjs`, `.github/workflows/check.yml`, `README.md`, decisions 0006 to 0008 (sentence splits), heading punctuation in the two October 21 records, and this record.
**Where actual behavior differed from the instruction:** None known.
**Stayed within granted authority?** Yes. The accidental `prosekeep init` was undone before commit.

## 3. Judgment: human in the loop
**Decisions the owner made:** Install all three packages.
**Decisions the agent made alone, for owner review:**
- Install them as dev dependencies of this project, not globally.
- Leave `plain-language-default` out of CI. Its sentence check counts a Markdown heading and the line after it as one sentence, so most of its flags on these docs were false.
- Hold the project setup until the owner said to run it, because it writes agent instruction files.
- Change punctuation in the headings of two older records so the style check passes on every file.

**Left to the owner:** Filling in `EDITORIAL.md`, which prosekeep leaves as a template for the owner.

## 4. Deviation: the gaps
- `package.json` allows patch releases (`^0.5.0` and so on). The lockfile holds today's versions, and CI installs from the lockfile.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** `npm run check:docs` passes. prosekeep found no problems in 27 files, and every record scores 6/6.
**Risk:** CI now fails if a record scores below 6/6, or if a new doc breaks a prosekeep rule.

## 6. Change: what happens next
1. The owner fills in `EDITORIAL.md`: readers, voice, and which documents need which sections.
2. Next run: check a command's real behavior in its source before running it with `--help`.
