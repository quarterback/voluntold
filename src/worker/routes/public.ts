// The public page for a posted task. It shows only what the AT Protocol
// record holds: never a volunteer's name, a private address, or who was asked.

import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { loadFields, loadOrg, loadTask } from '../db';
import { describeWhen, holdingCount } from '../engine';
import { requirementText } from '../../shared/rules';
import { escapeHtml, page } from './volunteer';

export const publicRoutes = new Hono<AppBindings>();

publicRoutes.get('/:taskId', async (c) => {
  c.header('cache-control', 'public, max-age=60');
  const row = await c.env.DB.prepare('SELECT org_id FROM tasks WHERE id = ?').bind(c.req.param('taskId')).first<{ org_id: string }>();
  const task = row ? await loadTask(c.env.DB, row.org_id, c.req.param('taskId')) : null;
  if (!row || !task || !task.publish || task.status === 'draft') {
    return c.html(page('Not found', ''), 404);
  }
  const org = (await loadOrg(c.env.DB, row.org_id))!;
  const fields = await loadFields(c.env.DB, row.org_id);
  const { results: teams } = await c.env.DB.prepare('SELECT id, name FROM teams WHERE org_id = ?').bind(row.org_id).all<{ id: string; name: string }>();
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const left = Math.max(0, task.peopleNeeded - (await holdingCount(c.env.DB, task.id)));
  const status =
    task.status === 'canceled' ? 'Canceled' :
    task.status === 'done' ? 'Completed' :
    task.status === 'filled' || left === 0 ? 'Full' :
    `${left} of ${task.peopleNeeded} spots open`;
  const when = describeWhen(task, org.time_zone);
  const reqs = task.requirements.map((r) => `<li>${escapeHtml(requirementText(r, fields, (id) => teamName.get(id) ?? 'a team'))}</li>`).join('');
  const signup = org.signup_url ? `<a href="${escapeHtml(org.signup_url)}" rel="noopener">Sign up to volunteer</a>` : '';
  return c.html(
    page(
      task.title,
      `<p class="meta">${escapeHtml(org.name)}</p>
       ${when ? `<p class="row"><b>When</b> · ${escapeHtml(when.replace(/^on /, ''))}</p>` : ''}
       ${task.placePublic ? `<p class="row"><b>Where</b> · ${escapeHtml(task.placePublic)}</p>` : ''}
       ${task.description ? `<p>${escapeHtml(task.description).replace(/\n/g, '<br>')}</p>` : ''}
       ${reqs ? `<p class="row"><b>What it needs</b></p><ul>${reqs}</ul>` : ''}
       <span class="status">${escapeHtml(status)}</span>
       ${signup ? `<p class="foot">${signup}</p>` : ''}`,
      {
        description: [org.name, when?.replace(/^on /, ''), task.placePublic, status].filter(Boolean).join(' · '),
        url: `${c.env.APP_URL}/t/${task.id}`,
        image: `${c.env.APP_URL}/og.png`,
      },
    ),
  );
});
