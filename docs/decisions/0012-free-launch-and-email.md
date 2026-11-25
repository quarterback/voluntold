# 0012. A free public launch, with email asks

Date: 2026-11-25

Status: Accepted for the items marked "owner", decided by the owner on 2026-11-25. Items marked "agent" are proposals for the owner to review.

Changes [0007](0007-pilot-scope.md): the tool sends email, and anyone can sign up. A closed pilot with 3 to 5 organizations is no longer the plan.

Changes [0011](0011-product-model-and-direction.md): asks go out by email, as well as inside the app.

## Context

On November 25 the owner chose this tool as the product to launch publicly, on Product Hunt and in the Portland startup community. The owner reviewed a plan that split the product into a free core and paid automation, with adoption targets by month. The owner kept the free product and the launch, and dropped the targets and the paid tier.

The owner's goal is not funding. It is a product with many users that the owner built and launched, so the owner is known as a startup founder and not only for government and 18F work. The owner knows the people this tool serves and can bring in organizations through partnerships, which is why a free product works.

## Decision

- **Owner:** the product is free. It costs little to run, so there is no paid tier, no trial, no card and no pricing page. The launch makes no promise about whether it stays free.
- **Owner:** no adoption targets.
- **Owner:** the product gets a new name before launch. "Volly" and "Volley" are working names only. There is no domain yet.
- **Owner:** the launch is public. Anyone can sign up from day one, and Portland is where the owner recruits organizations in person.
- **Owner:** organizations should be able to coordinate volunteers without copying links into another app. Before launch the tool sends four kinds of email:
  - an ask to one volunteer, with their private link
  - a confirmation when they accept, and a reminder before the task
  - accept or decline through the private link, as now
  - a note to coordinators when a task is still not full
- **Owner:** newsletters, bulk campaigns, text messages and in-app chat stay out.
- **Agent:** what the product must have before launch, from a quick look at the code on November 25, not an audit:

  | Needed | State |
  |---|---|
  | Accounts and saved data in production | Built in the server version. The public demo is the browser version, so production is not deployed. |
  | Spreadsheet import | Built |
  | Email asks and private links | Links are built. Email is sent only for sign-in codes. |
  | Sign up and create an organization without help | Partly built. Not tested as a flow a stranger finishes alone. |
  | Usage counts | Not built |

- **Agent:** send email through Resend, which the sign-in code already uses. Budget for the paid plan early, because the free plan stops at 100 emails a day. Prices were not checked on November 25.

## Not changed

- The tool still never chases. No reactivation emails, no "are you still available?" messages, and no screens about people who drifted away. See [0011](0011-product-model-and-direction.md) and the spec.
- The model features (tasks from notes, tags) stay in the free product.

## Consequences

- Email was built on November 25. The spec's section "Sending asks" describes it.
- Every email to a volunteer says how to unsubscribe. The sending domain waits on the new name.
- One organization can send 300 emails in 24 hours, to stop abuse and keep costs low.
