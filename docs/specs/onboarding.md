# Spec: onboarding as a feedback conversation

**Status:** design proposal, written October 26, 2026. Needs the owner's review before any of it is built.

## What this is for

The tool has one job right now: find out whether organizations have the problem it was built for, and where their current tooling leaves gaps. Onboarding is how we ask.

So onboarding here is not setup, and not activation. It is a guided walk through screens that already work, filled with data that is already there, used as the frame for a conversation about the organization's own situation.

**Done when:** after a session, we can write down in the organization's own words where their volunteer work backs up, what they already use, and what they would want a tool to do instead. If we only learn that they liked the screens, the session failed.

## What it is not

- **Not import.** Getting a spreadsheet to parse correctly is its own hard problem, and a first session is the worst place to meet it. A failed import teaches the visitor that the tool is fragile and teaches us nothing about their work. Import stays out until the conversation work is done.
- **Not a setup wizard.** Nobody configures an organization they have not decided to use.
- **Not a feature tour.** A tour that shows everything is a pitch. See the next section.

## What the research says

The sources are mostly vendor blogs and practitioner writing, not controlled studies. Treat them as craft knowledge rather than evidence, and the volunteer sector numbers as unverified unless stated otherwise.

**Show working software, not an empty workspace.** An empty first screen asks the visitor to do the work of imagining. The pattern that comes up repeatedly is to prefill a workspace with sample data and defer any setup until the product has shown what it does. Pipedrive's pipeline demo with sample deals and Mixpanel's prefilled demo environment are the examples usually named ([Appcues](https://www.appcues.com/blog/saas-user-onboarding), [UXMagic](https://uxmagic.ai/blog/saas-onboarding-flow)).

**Ask about their work before showing yours.** Sales demo practice and product discovery practice agree on the order: ask how they handle the process today, confirm the problem back to them, and only then show the parts that bear on what they said. Showing first produces politeness ([Reprise](https://www.reprise.com/resources/blog/discovery-call), [CustomerThink](https://customerthink.com/?p=59386)).

**Talk about the past, not the future.** Rob Fitzpatrick's rule is that the conversation should be about their life, not your idea, and that asking what someone would do is worth less than asking what they did last time. Once you describe what you are building, people stop reporting and start being kind. Compliments are not data ([The Mom Test](https://www.simonandschuster.com/books/The-Mom-Test/Rob-Fitzpatrick/9798893312577)).

**What the sector reports as the sore spots.** Points of Light reports that about half of critical volunteer openings go unfilled each year, and ties much of it to organizations lacking the resources to invest in recruiting and retention ([Points of Light](https://www.pointsoflight.org/wp-content/uploads/2025/04/Points-of-Light-From-Nice-to-Necessary-Unleashing-the-Impact-of-Volunteering-Through-Transformative-Investment.pdf)). Sector writing also reports a move toward shorter, task shaped commitments ([SignUpGenius](https://www.signupgenius.com/blog/state-of-volunteering-2025)) and hours per volunteer falling even as more people volunteer ([Volgistics](https://www.volgistics.com/blog/volunteer-statistics-and-trends-for-2026-essential-data-for-nonprofits/)).

A figure circulating in vendor blogs breaks coordinator time into scheduling 28 percent, communication 24, hour tracking 18, onboarding 16 and reporting 14, attributed to Better Impact's 2025 report. The original report was not findable, only blogs citing it, so this design does not rest on it. It is a useful hypothesis to test in the sessions, not a fact to repeat to visitors.

## The shape of a session

Three parts, about 30 minutes.

**Before any screen, 10 minutes.** Their situation, in their words. No product on screen.

**The walk, 15 minutes.** Five stops, each tied to something they said. Skip any stop they did not raise.

**After, 5 minutes.** What was missing, and what they do next.

The order matters more than the content. If the screens come first, the rest of the session is them reacting to our framing instead of describing theirs.

## The questions, before anything is shown

Ask about the last time, not the usual case. The last time has details; the usual case has opinions.

1. Think about the last thing you needed volunteers for. Walk me through what happened from deciding you needed people to someone showing up.
2. How many people did you need, and how many did you ask to get them?
3. Where did the names come from?
4. Who did not get asked, and why not?
5. What did you use to keep track? Ask to see it if they offer.
6. What part of that took longest?
7. When someone says yes and then does not come, how do you find out?
8. What happened the last time you tried to fix this?

Questions to avoid, because the answers mean nothing: Would you use a tool that does this? Does this look useful? How much would you pay? What features would you want?

If they compliment a screen, write down the compliment and ask what they would have used it for last month. If there is no last month, the compliment is not a signal.

## The five stops

Each stop uses a screen that exists, in the sample organization. The sample organization already carries 26 volunteers with tiers, availability and tags, needs, tasks, offers and a tag ready to be merged.

| Stop | Screen | What it shows | Ask |
|---|---|---|---|
| 1 | Today | The work that needs attention now, with how many people are holding each spot | Is this the list you would start your day with? What is on yours that is not here? |
| 2 | People | The volunteers an organization already has, with tags, tiers and availability | How close is this to what you know about your people? What do you keep that is not here? |
| 3 | Task, with the group to ask next | Who fits, who goes first, and who has waited longest | How do you decide who to ask? Who gets asked too often? |
| 4 | The volunteer page on a phone | What the volunteer sees, with no account | How do your volunteers hear from you now, and what do they have to do to answer? |
| 5 | Tags | Grouping the tool proposed, including one waiting to be merged | What would you group your people by? |

Stop 4 is the one to protect if time runs short. The claim the tool rests on is that volunteers answer from a link on a phone without an account, and that is the claim most worth testing against someone who knows their volunteers.

## What gets recorded

Nothing useful survives in memory. Each session produces one file in `docs/research/sessions/`, written the same day:

- the organization, its size, who was in the room, the date
- their answers to the eight questions, in their words, quoted
- what they already use, named
- where they said the work backs up
- which stops landed and which drew a blank
- what they asked for that does not exist
- what we changed our mind about

After five sessions, one summary across them: what every organization said, what only one said, and which of the next version's build order items any of them actually asked for.

## What to build now, and what not to

**Build now: almost nothing.** The sample organization, the screens and the phone view already exist. For the first handful of conversations, a written script and a notes file do the job better than code, because the follow up question is where the learning is and software cannot ask it.

What is worth doing:

1. **A clean demo organization.** One sample organization on the demo, not several, and none predating the current schema. The demo currently carries four, two of which show screens with missing fields. A visitor who lands on one of those judges the product on it.
2. **A facilitator script,** one page, from the sections above, so the session does not drift into a pitch.
3. **The session notes template** in `docs/research/sessions/`.

**Later, if sessions prove the demo is worth self serving:** the same five stops as in-product prompts, with answers captured in the app, and a short "what did you come here to fix" question before the first screen. This is only worth building once we know the five stops are the right five, and the sessions are what tell us that.

**Not now:** import, a setup wizard, progress bars, checklists, tooltips over every control.

## Risks

- **The demo signs anyone in as anyone.** It runs with `DEV_MODE = "1"`, so sign-in codes appear on screen. That is fine for a demo and unsafe for anything else. No real volunteer data goes in it.
- **Sample data is a halfway house.** A visitor cannot tell whether the tool fits their people from a sample pantry. Expect "it depends on our data" and treat it as a real answer, not an objection to handle.
- **A guided walk is still a pitch if we talk too much.** The order and the eight questions are the guard. The measure is simple: in a good session the visitor talks more than we do.
- **Five sessions is not a sample.** The summary across sessions says what these organizations said, not what organizations want.

## Open questions for the owner

1. Who runs these sessions, and how many before we decide anything?
2. What kind of organization do we want in the first five, and do we want them to differ from each other or to look alike?
3. Is a recording and a transcript acceptable, or notes only?
4. Does the facilitator show the demo on their own screen, or send the visitor the link and watch?
5. If a session says the tool solves a problem the organization does not have, what do we do with that?
