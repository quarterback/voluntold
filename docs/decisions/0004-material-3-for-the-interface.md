# 0004. Material 3 for the interface

Date: 2026-10-24

Status: Accepted, decided by the owner on 2026-10-23

Changed by [0009](0009-saas-look-and-adobe-content.md) on 2026-10-25: a custom SaaS theme replaces the Material 3 look. MUI stays.

Changed by [0007](0007-pilot-scope.md) on 2026-10-24: the pilot uses MUI, an existing Material component library, themed from the same seed color, instead of hand-built components.

## Context

The first screen drafts used the Vloora design system's colors and type. The owner rejected them. This product should not use Vloora's colors, and it needs a real, established design system rather than a house style.

He chose Material 3 from four options: Material 3, the GOV.UK Design System, the U.S. Web Design System and GitHub Primer. Material 3 is built for apps used mostly on phones, which is how coordinators and volunteers will use this one.

Google's Material Web components entered maintenance mode on June 10, 2024. The team said no new features or components are planned ([announcement](https://github.com/material-components/material-web/discussions/5642)).

## Decision

The interface follows Material 3: its layout, components, type scale and color roles.

- Color roles come from Google's `@material/material-color-utilities` (`SchemeVibrant`, seed `#00B8A9`). Generate the light and dark schemes from the same seed, and do not edit the hex values by hand.
- Type is Roboto on the Material 3 type scale. Icons are Material Symbols.
- Components are built in React to Material 3's specifications. Accessible behavior comes from React Aria. Material Web components are not used, because of their maintenance status.

The screens drawn so far use: the small top app bar, the navigation bar with four destinations (Today, Work, People, Intake), one, two and three line lists, filter chips, switches, outlined text fields, the extended floating action button, the banner, and the full screen dialog.

## Consequences

Every color in the code is a Material 3 role token, never a raw hex value. Dark mode comes from the same seed.

Building components ourselves costs time that a component library would save. React Aria covers the hardest part, which is accessible behavior.

## Alternatives considered

The Vloora design system. Rejected by the owner.

MUI. Its default theme is Material Design 2, and fitting it to Material 3 means fighting the library.

GOV.UK Design System and USWDS. Strong on plain wording, but they read as government websites.
