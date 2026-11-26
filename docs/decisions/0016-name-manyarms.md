# 0016. The product is called ManyArms

Date: 2026-11-26

Status: Accepted. The owner chose the name. The agent chose the spelling and the setup, for the owner to review.

## Context

"Volley" and "Volly" were working names. On November 26 the owner narrowed the choice to EightArms or ManyArms, on the .app domain, then chose: "Many Arms is easier to say and could be fun to brand with a wordmark". A web search that day found no software company or app using either name. It was not a trademark search.

## Decision

- **Owner:** the product is ManyArms, at manyarms.app.
- **Agent:** it is written as one word, ManyArms, to match the domain.
- **Agent:** the wordmark is drawn from PP Object Sans Heavy with the same tracking as the old one. The favicon is the M on the dark ground.
- **Agent:** manyarms.app is the product with accounts. demo.manyarms.app is the demo in the browser. vloora.com/manyarms is Vloora's product page. The old demo address, volleydemo.vloora.com, keeps working.
- **Agent:** the name lives in `src/shared/brand.ts`. A future rename changes it there, plus the wordmark outlines and the favicon.

## Consequences

- The owner buys the domain, adds it to Cloudflare and deploys, following docs/launch/deploy.md.
- The repository keeps its name, voluntold.
- A trademark search should happen before launch spending.
