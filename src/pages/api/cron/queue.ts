export const prerender = false;
import type { APIRoute } from 'astro';
import { json, authSecret, cronAuthorized } from '../../../lib/cron';
import { runQueueStage } from '../../../lib/welcome-queue';

// Lightweight queue drain: new listing Maps lookups, welcome emails for claims confirmed by the cloud tasks, and one
// deploy hook for pending requests. Triggered every 15 minutes by the Supabase pg_cron job p2-queue-tick, which only
// calls this route when a queue has pending rows (cheaper than a fixed Vercel cron; the team is on Pro). The daily cron runs
// the same stage as a backup. ?dry=1 touches nothing.
export const GET: APIRoute = async ({ request }) => {
  if (!cronAuthorized(request)) return json({ error: 'unauthorized' }, 401);
  const secret = authSecret();
  if (!secret) return json({ error: 'CEG_AUTH_SECRET missing' }, 500);
  const dry = new URL(request.url).searchParams.get('dry') === '1';
  const started = Date.now();
  const res = await runQueueStage(secret, { dry, started, budgetMs: 240_000 });
  const summary = { ran_at: new Date().toISOString(), dry, ...res, ms: Date.now() - started };
  console.log('CRON queue', JSON.stringify(summary));
  return json(summary);
};
export const POST = GET;
