# Spec: the demo

**Status:** confirmed by the owner on October 29, 2026, with his answers to the three questions folded in. It replaces the five-stop card built the same day.

## What the demo is for

The demo is for people who already run volunteer organizations. It shows them how Volley activates volunteers, feature by feature, so they can tell us whether it fits what they need. The demo exists to validate or negate our assumptions, so it's comprehensive: every feature, what it does, and how it's meant to work.

The demo isn't for someone trying to use the tool for real. If an organization wants that, we spin up their own instance. Nobody is guided into playing with an empty tool, because without sample data it makes no sense.

## How it starts

1. The product page's "Try the demo" button leads to sign-in (the code shows on screen).
2. Before any screen, the person picks a sample organization:
   - a food pantry (the current sample)
   - a nonprofit membership organization
   - an all-volunteer community radio station
   - a youth-focused nonprofit
   - a disaster response company that mobilizes volunteers for surges
   - an events staffing company that does the same

   The last two aren't nonprofits.
3. Each sample is a full organization: people with fields, tags, tiers and availability; needs; tasks in every state; asks and answers; an import on record; teams; and settings. The person can switch samples at any time.

## How it guides

A guide stays alongside the real screens through the whole demo. It has two modes, and the person can switch at any time:

- **Guided.** The stops in a fixed order, with Next and Back, from the first screen to the end.
- **Explore.** The person goes where they like. The guide lists every stop as a menu they can jump to, and the first time they open a section it explains that section once, so they get a first-reference introduction and can then play.

Each stop:

- names the feature and opens its screen
- says what it does and how it's intended to work, in a few plain sentences
- points at the controls that matter on that screen
- ends with the question we want answered about their organization

The stops, grouped as the navigation is:

| Group | Stops |
| --- | --- |
| Today | the to-do list, this week's work, capacity |
| Needs | a need and its assignments, supplies, Offer |
| Tasks | the task list and its states, the task builder (requirements, timing, place, people), the three ways to ask, batches, private links, who fits and why not, the next group, spots and no-shows |
| People | fields the organization defines, tags, tiers, availability, filters and saved lists, a person's record and history, pausing and unsubscribing |
| First offers | the offers to people never asked, and approving them |
| Import | bringing in a file, mapping columns, duplicates, rows set aside. Shown as a feature; the demo doesn't ask the person to import their own list |
| Settings | fields, teams and leads, members and roles, the weekly ask limit, AT Protocol posting, export |
| What volunteers see | the volunteer's page from a link, opened from the guide. Framed for the coordinator: what's shown, what's withheld, what they'd want added or removed |

The person can do things at every stop (publish, ask, answer as a volunteer, import a sample file). Everything they do stays in their copy of the sample.

## How it ends

The last stop says: this is yours to play with now. Send feedback to Vloora at hello@vloora.com, and we'd like to do a walkthrough with you. The guide can be reopened from the app at any time.

## Later

Research friction in how organizations activate volunteers, through the paths people describe online, to find the consistent problems and shape both the tool and the messaging. Not now. For now the sample data gets better and the person chooses the set.

## Decisions the owner made on October 29

1. Two surge examples: disaster response and events staffing.
2. Both a fixed order with Next and a menu to jump from.
3. The volunteer's page stays exactly as a volunteer sees it, with the guide alongside. No marks on the page.
