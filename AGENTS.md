<!-- plain-language-default:start -->
## Write in plain language

Before every user-facing response, follow `.agents/skills/plain-language-default/SKILL.md` as the default writing standard. Answer directly; use familiar words, active voice, and clear paragraphs. Do not repeat the user's input or add filler, invented jargon, or ornamental formatting. Preserve technical accuracy, sources, and user-requested formats. Quietly apply the checks in the skill before sending.
<!-- plain-language-default:end -->

## Records and checks

Start with `docs/SPEC.md`. At the end of each meaningful agent run, write a ClosedTab Agent Action Record in `docs/aar-<slug>.md` using `.agents/skills/closedtab/SKILL.md`. Before opening a pull request, run `npm run check` and `npm run check:docs`. `check:docs` runs prosekeep with the settings in `.editorial.json` and `closedtab check` on every record. Follow `.agents/skills/prosekeep/SKILL.md` when editing docs.
