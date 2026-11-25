// Email the tool sends itself (docs/decisions/0012-free-launch-and-email.md):
// an ask with its private link, a confirmation when someone accepts, a
// reminder the day before, and a note to coordinators when a task starting
// soon isn't full. Nothing else: no newsletters, no chasing.
//
// Every email gets a row in `emails`. Bodies are never stored, because they
// hold private links. Email goes through Resend when RESEND_API_KEY is set,
// and otherwise through Amazon SES (API v2), signed with aws4fetch.

import type { Env } from './env';
import type { Task } from '../shared/types';
import { DAY, HOUR, LINK_LIFETIME } from '../shared/rules';
import { loadOrg, loadTask } from './db';
import { describeWhen } from './engine';
import { AwsClient } from 'aws4fetch';
import { hashToken, newId, newToken } from './util';

/** Most emails one organization can send in 24 hours. Asks past this fall back to copied links. */
export const ORG_DAILY_LIMIT = 300;
/** Reminders go out this long before a task starts. */
export const REMINDER_BEFORE = DAY;
/** Coordinators hear about a task that isn't full this long before it starts. */
export const UNFILLED_BEFORE = 48 * HOUR;

export type MailKind = 'ask' | 'confirm' | 'reminder' | 'unfilled';
export type MailStatus = 'sent' | 'failed' | 'off' | 'limit';

export interface Outgoing {
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  replyTo?: string | null;
  volunteerId?: string;
  memberId?: string;
  taskId?: string;
  askId?: string;
  spotId?: string;
}

export function mailEnabled(env: Env): boolean {
  return !!(env.EMAIL_FROM && (env.RESEND_API_KEY || (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY)));
}

export function sesEndpoint(env: Env): string {
  return `https://email.${env.AWS_REGION || 'us-west-2'}.amazonaws.com/v2/email/outbound-emails`;
}

export interface Message {
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string | null;
}

/** Sends one email. Returns whether the provider accepted it. */
export async function sendEmail(env: Env, m: Message): Promise<boolean> {
  return (await sendEmails(env, [m]))[0];
}

/** Sends emails through the provider that has keys set. One result for each. */
export async function sendEmails(env: Env, messages: Message[]): Promise<boolean[]> {
  const results: boolean[] = [];
  if (env.RESEND_API_KEY) {
    // Resend takes up to 100 emails in one request.
    for (let start = 0; start < messages.length; start += 100) {
      const chunk = messages.slice(start, start + 100);
      const ok = await resendBatch(env, chunk);
      results.push(...chunk.map(() => ok));
    }
    return results;
  }
  // SES takes one email per request. Send 10 at a time.
  for (let start = 0; start < messages.length; start += 10) {
    results.push(...(await Promise.all(messages.slice(start, start + 10).map((m) => sesSend(env, m)))));
  }
  return results;
}

async function resendBatch(env: Env, messages: Message[]): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(messages.map((m) => ({ from: m.from, to: [m.to], subject: m.subject, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }))),
    });
    if (!res.ok) console.error('email refused', res.status);
    return res.ok;
  } catch (err) {
    console.error('email failed', err instanceof Error ? err.message : err);
    return false;
  }
}

async function sesSend(env: Env, m: Message): Promise<boolean> {
  try {
    const aws = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      region: env.AWS_REGION || 'us-west-2',
      service: 'ses',
    });
    const res = await aws.fetch(sesEndpoint(env), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        FromEmailAddress: m.from,
        Destination: { ToAddresses: [m.to] },
        ...(m.replyTo ? { ReplyToAddresses: [m.replyTo] } : {}),
        Content: { Simple: { Subject: { Data: m.subject, Charset: 'UTF-8' }, Body: { Text: { Data: m.text, Charset: 'UTF-8' } } } },
      }),
    });
    if (!res.ok) console.error('email refused', res.status);
    return res.ok;
  } catch (err) {
    console.error('email failed', err instanceof Error ? err.message : err);
    return false;
  }
}

/** "Riverside Pantry <asks@example.org>", using the address from EMAIL_FROM. */
export function fromHeader(env: Env, name: string): string {
  const from = env.EMAIL_FROM ?? '';
  const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  const clean = name.replace(/[\r\n"<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return clean ? `"${clean}" <${address}>` : address;
}

/**
 * Sends a set of emails for one organization and records each one. Sample
 * organizations never send: their people are made up.
 */
export async function deliver(env: Env, orgId: string, mails: Outgoing[], now: number): Promise<MailStatus[]> {
  if (mails.length === 0) return [];
  const db = env.DB;
  const org = await loadOrg(db, orgId);
  const statuses: MailStatus[] = mails.map(() => 'off');
  if (org && org.sample !== 1 && mailEnabled(env)) {
    const used = await db
      .prepare("SELECT COUNT(*) AS n FROM emails WHERE org_id = ? AND status = 'sent' AND created_at > ?")
      .bind(orgId, now - DAY)
      .first<{ n: number }>();
    const room = Math.max(0, ORG_DAILY_LIMIT - (used?.n ?? 0));
    const sending = mails.slice(0, room);
    for (let i = room; i < mails.length; i++) statuses[i] = 'limit';
    const from = fromHeader(env, String(org.name));
    const results = await sendEmails(env, sending.map((m) => ({ from, to: m.to, subject: m.subject, text: m.text, replyTo: m.replyTo })));
    results.forEach((ok, i) => {
      statuses[i] = ok ? 'sent' : 'failed';
    });
  }
  await db.batch(
    mails.map((m, i) =>
      db
        .prepare(
          `INSERT INTO emails (id, org_id, kind, to_email, volunteer_id, member_id, task_id, ask_id, spot_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(newId(), orgId, m.kind, m.to, m.volunteerId ?? null, m.memberId ?? null, m.taskId ?? null, m.askId ?? null, m.spotId ?? null, statuses[i], now),
    ),
  );
  return statuses;
}

/** The email address of a member, for replies and for notes about tasks. */
export async function memberEmail(db: D1Database, memberId: string | null): Promise<string | null> {
  if (!memberId) return null;
  const row = await db.prepare('SELECT u.email FROM members m JOIN users u ON u.id = m.user_id WHERE m.id = ?').bind(memberId).first<{ email: string }>();
  return row?.email ?? null;
}

/** The member who wrote a task. */
export async function creatorOf(db: D1Database, taskId: string): Promise<string | null> {
  const row = await db.prepare('SELECT created_by FROM tasks WHERE id = ?').bind(taskId).first<{ created_by: string | null }>();
  return row?.created_by ?? null;
}

/** Another private link to the same ask, for a confirmation or a reminder. */
export async function extraLink(env: Env, orgId: string, askId: string, volunteerId: string, now: number): Promise<string> {
  const token = newToken();
  await env.DB.prepare('INSERT INTO ask_links (token_hash, org_id, ask_id, volunteer_id, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await hashToken(env, token), orgId, askId, volunteerId, now + LINK_LIFETIME)
    .run();
  return `${env.APP_URL}/v/${token}`;
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

function lines(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((p) => p !== false && p !== null && p !== undefined).join('\n');
}

const FOOTER = (orgName: string) =>
  lines('', '--', `${orgName} has you on its volunteer list.`, 'To stop these emails, open your link and choose Unsubscribe.');

function place(task: Task, withAddress: boolean): string | null {
  const where = [task.placePublic, withAddress ? task.placePrivate : ''].filter(Boolean).join(', ');
  return where ? `Where: ${where}` : task.remote ? 'Where: remote' : null;
}

export function askEmail(name: string, task: Task, orgName: string, link: string, timeZone: string): Pick<Outgoing, 'subject' | 'text'> {
  const when = describeWhen(task, timeZone);
  const about = task.description.trim();
  return {
    subject: `Can you help with ${task.title}?`,
    text: lines(
      `Hi ${firstName(name)},`,
      '',
      `Can you help ${orgName} with "${task.title}"${when ? ` ${when}` : ''}?`,
      about && '',
      about && (about.length > 600 ? `${about.slice(0, 600)}…` : about),
      '',
      place(task, false),
      task.bring && `Bring: ${task.bring}`,
      '',
      `Accept or decline: ${link}`,
      '',
      'This link is only for you.',
      FOOTER(orgName),
    ),
  };
}

function spotDetails(task: Task, link: string) {
  return lines(
    place(task, true),
    task.contact && `Ask for: ${task.contact}`,
    task.bring && `Bring: ${task.bring}`,
    '',
    `If your plans change, cancel your spot so someone else can take it: ${link}`,
  );
}

export function confirmEmail(name: string, task: Task, orgName: string, link: string, timeZone: string): Pick<Outgoing, 'subject' | 'text'> {
  const when = describeWhen(task, timeZone);
  return {
    subject: `You're confirmed: ${task.title}`,
    text: lines(
      `Thanks, ${firstName(name)}.`,
      '',
      `You're confirmed for "${task.title}"${when ? ` ${when}` : ''}.`,
      '',
      spotDetails(task, link),
      FOOTER(orgName),
    ),
  };
}

export function reminderEmail(name: string, task: Task, orgName: string, link: string, timeZone: string): Pick<Outgoing, 'subject' | 'text'> {
  const when = describeWhen(task, timeZone);
  return {
    subject: `Reminder: ${task.title}${when ? ` ${when}` : ''}`,
    text: lines(
      `Hi ${firstName(name)},`,
      '',
      `A reminder that you're helping ${orgName} with "${task.title}"${when ? ` ${when}` : ''}.`,
      '',
      spotDetails(task, link),
      FOOTER(orgName),
    ),
  };
}

export function unfilledEmail(task: Task, holding: number, orgName: string, link: string, timeZone: string): Pick<Outgoing, 'subject' | 'text'> {
  const open = task.peopleNeeded - holding;
  const when = describeWhen(task, timeZone);
  return {
    subject: `${task.title} still needs ${open === 1 ? '1 person' : `${open} people`}`,
    text: lines(
      `"${task.title}" is ${when ? `${when}` : 'coming up'}.`,
      `${holding} of ${task.peopleNeeded} spots are filled.`,
      '',
      `Ask more people: ${link}`,
      '',
      '--',
      `Sent to coordinators at ${orgName}.`,
    ),
  };
}

/** After someone accepts, send them a confirmation with a link to cancel. */
export async function sendConfirmation(env: Env, orgId: string, askId: string, now: number): Promise<void> {
  try {
    const db = env.DB;
    const row = await db
      .prepare(
        `SELECT a.task_id, a.volunteer_id, v.name, v.email, s.id AS spot_id FROM asks a
         JOIN volunteers v ON v.id = a.volunteer_id
         JOIN spots s ON s.ask_id = a.id AND s.status = 'holding'
         WHERE a.id = ? AND a.org_id = ?`,
      )
      .bind(askId, orgId)
      .first<{ task_id: string; volunteer_id: string; name: string; email: string | null; spot_id: string }>();
    if (!row?.email) return;
    const [org, task] = await Promise.all([loadOrg(db, orgId), loadTask(db, orgId, row.task_id)]);
    if (!org || !task) return;
    const link = await extraLink(env, orgId, askId, row.volunteer_id, now);
    const reply = await memberEmail(db, await creatorOf(db, task.id));
    await deliver(env, orgId, [{
      kind: 'confirm', to: row.email, replyTo: reply, volunteerId: row.volunteer_id, taskId: task.id, askId, spotId: row.spot_id,
      ...confirmEmail(row.name, task, String(org.name), link, String(org.time_zone)),
    }], now);
  } catch (err) {
    // A confirmation that fails must not undo the yes.
    console.error('confirmation failed', err instanceof Error ? err.message : err);
  }
}

/**
 * Reminders the day before, and notes to coordinators about tasks starting
 * within 48 hours that aren't full. Each goes out once. Runs from the cron
 * trigger.
 */
export async function sendDueEmails(env: Env, now: number): Promise<void> {
  const db = env.DB;
  const reminders = await db
    .prepare(
      `SELECT s.id AS spot_id, s.org_id, s.ask_id, s.volunteer_id, v.name, v.email, t.id AS task_id FROM spots s
       JOIN tasks t ON t.id = s.task_id
       JOIN volunteers v ON v.id = s.volunteer_id
       WHERE s.status = 'holding' AND s.reminded_at IS NULL AND t.timing = 'at_time' AND t.status IN ('open', 'filled')
         AND t.starts_at > ? AND t.starts_at <= ?
       LIMIT 500`,
    )
    .bind(now, now + REMINDER_BEFORE)
    .all<{ spot_id: string; org_id: string; ask_id: string | null; volunteer_id: string; name: string; email: string | null; task_id: string }>();

  const byOrg = new Map<string, typeof reminders.results>();
  for (const r of reminders.results) byOrg.set(r.org_id, [...(byOrg.get(r.org_id) ?? []), r]);
  for (const [orgId, rows] of byOrg) {
    const org = await loadOrg(db, orgId);
    if (!org) continue;
    const mails: Outgoing[] = [];
    const tasks = new Map<string, Task | null>();
    for (const r of rows) {
      if (!tasks.has(r.task_id)) tasks.set(r.task_id, await loadTask(db, orgId, r.task_id));
      const task = tasks.get(r.task_id);
      // A person who accepted within the last day already has a confirmation.
      const spot = await db.prepare('SELECT created_at FROM spots WHERE id = ?').bind(r.spot_id).first<{ created_at: number }>();
      if (!task || !r.email || !r.ask_id || (spot && task.startsAt !== null && spot.created_at > task.startsAt - REMINDER_BEFORE)) continue;
      const link = await extraLink(env, orgId, r.ask_id, r.volunteer_id, now);
      mails.push({
        kind: 'reminder', to: r.email, replyTo: await memberEmail(db, await creatorOf(db, task.id)), volunteerId: r.volunteer_id, taskId: task.id, askId: r.ask_id, spotId: r.spot_id,
        ...reminderEmail(r.name, task, String(org.name), link, String(org.time_zone)),
      });
    }
    await db.batch(rows.map((r) => db.prepare('UPDATE spots SET reminded_at = ? WHERE id = ?').bind(now, r.spot_id)));
    await deliver(env, orgId, mails, now);
  }

  const unfilled = await db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM spots s WHERE s.task_id = t.id AND s.status = 'holding') AS holding FROM tasks t
       WHERE t.status = 'open' AND t.timing = 'at_time' AND t.unfilled_noted_at IS NULL
         AND t.starts_at > ? AND t.starts_at <= ?
       LIMIT 200`,
    )
    .bind(now, now + UNFILLED_BEFORE)
    .all<Record<string, unknown> & { org_id: string; id: string; holding: number; people_needed: number; created_by: string | null }>();
  for (const t of unfilled.results) {
    await db.prepare('UPDATE tasks SET unfilled_noted_at = ? WHERE id = ?').bind(now, t.id).run();
    if (t.holding >= t.people_needed) continue;
    const [org, task] = await Promise.all([loadOrg(db, t.org_id), loadTask(db, t.org_id, t.id)]);
    if (!org || !task) continue;
    const to = await coordinatorsFor(db, t.org_id, t.created_by);
    const link = `${env.APP_URL}/o/${t.org_id}/tasks/${t.id}`;
    const content = unfilledEmail(task, t.holding, String(org.name), link, String(org.time_zone));
    await deliver(env, t.org_id, to.map((m) => ({ kind: 'unfilled', to: m.email, memberId: m.id, taskId: t.id, ...content })), now);
  }
}

/** The member who wrote the task, or the admins if that member is gone. */
async function coordinatorsFor(db: D1Database, orgId: string, createdBy: string | null): Promise<{ id: string; email: string }[]> {
  if (createdBy) {
    const one = await db
      .prepare('SELECT m.id, u.email FROM members m JOIN users u ON u.id = m.user_id WHERE m.id = ? AND m.org_id = ?')
      .bind(createdBy, orgId)
      .first<{ id: string; email: string }>();
    if (one) return [one];
  }
  const admins = await db
    .prepare("SELECT m.id, u.email FROM members m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND m.role = 'admin'")
    .bind(orgId)
    .all<{ id: string; email: string }>();
  return admins.results;
}
