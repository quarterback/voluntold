# 0001. Start after a volunteer is approved

Date: 2026-10-24

Status: Accepted, decided by the owner on 2026-10-23

## Context

The October 21 PRDs treat intake as the front door. Anyone with an open opportunity link can create a volunteer record, and the release story begins with an organizer inviting people and collecting their intake.

On October 23 the owner set the scope differently. Finding people, screening them and checking who they are is a separate job, and organizations already handle it in their own way. Intake and management are solved by the tools organizations already have. What fails is activation: getting people the organization has already approved onto work, seeing who is active, seeing what active people are doing, and tracking that over time.

The evidence points the same way. England's NHS Volunteer Responders program had about 750,000 sign ups, and 600,000 people were ready after vetting. Only about 75,000 tasks were logged in its first month ([Gulf Times, April 2020](https://www.gulf-times.com/story/662306/virus-crisis-volunteers-frustrated-at-lack-of-tasks)). In a 2022 survey, 9% of its respondents had never received a task alert or a shift within their travel distance ([NHS England](https://www.england.nhs.uk/long-read/nhs-volunteer-responders-volunteer-survey-and-engagement-meeting-results/)).

## Decision

The product starts once a person is approved. Recruiting, screening, references and background checks stay outside it.

People enter as approved volunteers, by import or by a private invitation from the organization. A person who answers a shared opportunity link arrives as `new`, and gets no offers until a coordinator approves them. The tool records the approval and does not do the vetting.

The product's main job is activation: every approved person gets a first ask soon, and gets asked again before they drift away.

## Consequences

The release story changes. It starts with approved people already in the system, and ends with them working, instead of starting with a public intake.

A shared link still works for distribution inside an organization's own channels. It produces people to approve, not volunteers who can be offered work straight away.

Bulk import moves from "after launch" into the first release, because most organizations already hold a list of approved people.

## Alternatives considered

Keep open intake as the front door, as the October 21 PRDs had it. That builds a recruiting tool, which the owner ruled out.

Drop shared opportunity links entirely. They are how many groups reach their own members in Slack, Discord and email, so they stay, behind an approval step.
