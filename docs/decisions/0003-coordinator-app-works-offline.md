# 0003. The coordinator's app works when the internet is down

Date: 2026-10-24

Status: Accepted in principle by the owner on 2026-10-23. The mechanism below is proposed.

## Context

The owner set two requirements on October 23. When the tool is needed, it has to work, so a mode that works without the web is key. And organizations should run it within their own context.

The architecture in `ARCHITECTURE.md` is a hosted web app on Cloudflare Workers and D1. As written, the coordinator's screens need a live connection.

Volunteer work often happens where connections fail: a church basement, a loading dock, an outdoor event, a storm response.

## Decision

The coordinator's app is a progressive web app (a website that installs to the home screen and runs without a connection). It keeps a copy of the organization's records on the device, in IndexedDB through Dexie.

Offline, a coordinator can open every screen, read the roster and today's work, approve drafts, and add or edit work. Each action goes into an outbox on the device with its own ID. When the device reconnects, the outbox replays in order. The server applies each action through the same rules as an online action.

If an action no longer fits, the server rejects it, and the rejection appears on Today with the reason. For example, a coordinator may approve an offer to a volunteer who paused while the coordinator was offline.

The server stays the system of record. Volunteers answer from their own phones through links, and those need a connection.

## Consequences

Two coordinators working offline can make conflicting choices. The server applies them in the order they arrive, and the later one comes back as a rejection to review. Nothing merges silently.

Safari deletes a site's stored data after 7 days without interaction, but exempts a site added to the home screen ([WebKit](https://webkit.org/tracking-prevention/)). Coordinators install the app to the home screen. The server copy means a lost device loses only unsynced actions.

Offers approved offline go out when the device reconnects. A coordinator who has to reach someone right away with no data can use the app to open the phone's own texting app with the message filled in, one person at a time. This works for people whose numbers are kept on the device: those who hold or were offered work in the next 7 days.

## Alternatives considered

A fully local app with no server, as in the owner's default stack. It cannot send email or text messages, serve volunteer links, or keep two coordinators in step.

A sync engine such as Dexie Cloud ([pricing](https://dexie.org/pricing)). It adds a second system of record beside D1. The outbox keeps one record and reuses the state rules the server already enforces. This can be reconsidered if the outbox proves too limited.
