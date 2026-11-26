// Reports: counts first, then only the people in the group a coordinator
// picks. An organization with thousands of members never has to scan the
// whole roster to find who is due to renew.

import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { loadOrg } from '../db';
import { fail } from '../util';
import { DAY } from '../../shared/rules';
import { ENDING_SOON } from './roles';

export const reportRoutes = new Hono<AppBindings>();

/** Renewal groups that don't overlap, so the counts add up. */
export const RENEWAL_GROUPS = ['d30', 'd60', 'd90', 'expired'] as const;
type RenewalGroup = (typeof RENEWAL_GROUPS)[number];

function window(group: RenewalGroup, now: number): [number, number] {
  if (group === 'd30') return [now, now + 30 * DAY];
  if (group === 'd60') return [now + 30 * DAY, now + 60 * DAY];
  if (group === 'd90') return [now + 60 * DAY, now + 90 * DAY];
  return [now - 90 * DAY, now];
}

const RECENT = 90 * DAY;

reportRoutes.get('/reports', async (c) => {
  const orgId = c.get('actor').orgId;
  const now = c.get('now');
  const db = c.env.DB;
  const org = (await loadOrg(db, orgId))!;
  const one = async (sql: string, ...args: unknown[]) => (await db.prepare(sql).bind(...args).first<{ n: number }>())?.n ?? 0;

  const [people, categories, offered, accepted, tookPart, neverOffered, roles, vacant, endingSoon, applications] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM volunteers WHERE org_id = ?', orgId),
    db.prepare('SELECT member_category AS category, COUNT(*) AS n FROM volunteers WHERE org_id = ? GROUP BY member_category ORDER BY n DESC').bind(orgId).all<{ category: string | null; n: number }>(),
    one('SELECT COUNT(DISTINCT volunteer_id) AS n FROM asks WHERE org_id = ? AND created_at > ?', orgId, now - RECENT),
    one("SELECT COUNT(DISTINCT volunteer_id) AS n FROM asks WHERE org_id = ? AND status = 'yes' AND created_at > ?", orgId, now - RECENT),
    one("SELECT COUNT(DISTINCT volunteer_id) AS n FROM spots WHERE org_id = ? AND status = 'done' AND updated_at > ?", orgId, now - RECENT),
    one('SELECT COUNT(*) AS n FROM volunteers WHERE org_id = ? AND last_asked_at IS NULL', orgId),
    one('SELECT COUNT(*) AS n FROM roles WHERE org_id = ?', orgId),
    one('SELECT COUNT(*) AS n FROM roles r WHERE r.org_id = ? AND NOT EXISTS (SELECT 1 FROM role_terms t WHERE t.role_id = r.id AND t.ended_at IS NULL)', orgId),
    one('SELECT COUNT(*) AS n FROM role_terms WHERE org_id = ? AND ended_at IS NULL AND ends_at IS NOT NULL AND ends_at <= ?', orgId, now + ENDING_SOON),
    one("SELECT COUNT(*) AS n FROM applications WHERE org_id = ? AND status = 'pending'", orgId),
  ]);

  let renewals: Record<RenewalGroup, number> | null = null;
  if (org.track_renewals === 1) {
    const counts = await Promise.all(
      RENEWAL_GROUPS.map((g) => {
        const [from, to] = window(g, now);
        return one('SELECT COUNT(*) AS n FROM volunteers WHERE org_id = ? AND member_expires_at > ? AND member_expires_at <= ?', orgId, from, to);
      }),
    );
    renewals = Object.fromEntries(RENEWAL_GROUPS.map((g, i) => [g, counts[i]])) as Record<RenewalGroup, number>;
  }

  return c.json({
    people,
    categories: categories.results.map((r) => ({ category: r.category, count: r.n })),
    renewals,
    participation: { offered, accepted, tookPart, neverOffered },
    roles: { total: roles, vacant, endingSoon },
    applications,
  });
});

/** The people in one renewal group, soonest first. Add ?format=csv for a download. */
reportRoutes.get('/reports/renewals/:group', async (c) => {
  const orgId = c.get('actor').orgId;
  const group = c.req.param('group') as RenewalGroup;
  if (!RENEWAL_GROUPS.includes(group)) fail(404, 'Not found');
  const [from, to] = window(group, c.get('now'));
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, email, member_category, member_expires_at, dues_paid_at FROM volunteers
     WHERE org_id = ? AND member_expires_at > ? AND member_expires_at <= ? ORDER BY member_expires_at, name LIMIT 5000`,
  )
    .bind(orgId, from, to)
    .all<{ id: string; name: string; email: string | null; member_category: string | null; member_expires_at: number; dues_paid_at: number | null }>();

  if (c.req.query('format') === 'csv') {
    const day = (ms: number | null) => (ms === null ? '' : new Date(ms).toISOString().slice(0, 10));
    const cell = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      'name,email,category,expires,dues_paid',
      ...results.map((r) => [r.name, r.email, r.member_category, day(r.member_expires_at), day(r.dues_paid_at)].map(cell).join(',')),
    ];
    c.header('content-type', 'text/csv; charset=utf-8');
    c.header('content-disposition', `attachment; filename="renewals-${group}.csv"`);
    return c.body(lines.join('\n') + '\n');
  }
  return c.json({
    rows: results.map((r) => ({ id: r.id, name: r.name, email: r.email, category: r.member_category, expiresAt: r.member_expires_at, duesPaidAt: r.dues_paid_at })),
  });
});
