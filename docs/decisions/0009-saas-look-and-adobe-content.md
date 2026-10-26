# 0009. A SaaS look, and Adobe's content standards for the interface

Date: 2026-10-25

Status: Accepted, decided by the owner on 2026-10-25. The agent chose the specific values below, for the owner to review.

Changed by [0011](0011-product-model-and-direction.md) on 2026-10-25: the look is under review in [the next version spec](../specs/next-version.md).

## Context

The owner said the design should look more like SaaS software such as Stripe, or a consumer app such as Tock or OpenTable. The interface text should keep to a content guide like Adobe's.

The interface used Material 3 color roles generated from a seed ([0004](0004-material-3-for-the-interface.md)), through MUI ([0007](0007-pilot-scope.md)). That gave tinted surfaces, floating labels and pill buttons, which read as an Android app rather than as SaaS.

## Decision

- **Components:** MUI stays.
- **Look:** the Material 3 look is replaced by a custom theme in `src/web/theme.ts`:
  - neutral gray background, white surfaces, thin borders, small shadows
  - Inter type
  - labels above fields
  - 6 to 10 px corners
  - one accent: the seed's hue, darkened to #0E7C74 for 4.5:1 contrast on white
  - matching dark tokens
- **Coordinators:** a sidebar on desktop, and a top bar with bottom tabs on phones. Tables for tasks and people. Stat tiles and a to-do list on Today.
- **Volunteers:** a consumer-style page: a date block, icon rows for time, place and who to find, and large answer buttons. The public task page matches it.
- **Interface text:** follows Adobe Spectrum's content standards, and Adobe's button guidance for confirmations. `EDITORIAL.md` records the rules and the local exceptions.
- **Confirmations:** the browser's own confirm boxes are replaced by dialogs whose buttons name the action.

## Consequences

Two rules differ between the interface and the docs. The interface uses "%" and "12pm" (Adobe). The docs use "percent" and full dates (Vloora). `EDITORIAL.md` says which applies where.

This changes [0004](0004-material-3-for-the-interface.md). `@material/material-color-utilities` is no longer used.
