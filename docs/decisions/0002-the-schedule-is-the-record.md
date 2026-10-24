# 0002. The schedule is the record of the work

Date: 2026-10-24

Status: Accepted, decided by the owner on 2026-10-23

## Context

The October 21 state model has a volunteer mark work `submitted`, with optional hours, and an organizer `confirmed` it. Many volunteer tools work the same way. Galaxy Digital, for example, gives organizations a button to confirm hours.

The owner rejected this. None of the organizations he volunteers with vet hours, and the confirm step is friction for coordinators who have no time for it. Logging hours after the fact is also a burden on volunteers. At one organization he volunteers with, hours go in through a hidden form: the volunteer has to remember the hours, find the form, pick the date and enter them. He named that as a reason not to volunteer.

## Decision

The product does not verify hours, and it has no timesheet.

A contribution becomes `done` on its own:

- for coverage work, when its time window ends
- for outcome work, when its due date passes

A volunteer can mark outcome work done earlier, but nothing asks them to. A coordinator can mark a contribution `missed` afterward to correct the record. Nothing prompts them to.

Hours come from the schedule: the coverage window, or the estimate on outcome work. For organizations that require hours, the roles release lets a volunteer add unscheduled hours with a one line note, and no one approves it.

## Consequences

The states `in_progress`, `submitted` and `confirmed` leave the model. `MOBILIZATION-PRD.md` holds the new tables.

Records are only as accurate as the schedule. A no show stays `done` unless a coordinator corrects it. The owner accepts that, because verification cost more than it returned.

A coordinator's work after an event drops to nothing in the normal case.

## Alternatives considered

Keep `submitted` and `confirmed` as optional steps. Optional steps that every screen shows still read as required, and the record would split between confirmed and unconfirmed work for no reason anyone acts on.

Ask volunteers by message whether they did the work. That is the chasing the product exists to remove.
