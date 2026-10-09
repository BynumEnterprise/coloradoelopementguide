// Shared helpers for the Vercel cron endpoints and the Stripe webhook.
import { SB_URL, SB_KEY } from './supabase';

export const SITE = 'https://coloradoelopementguide.com';
export const DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_CF46WLPLbBDSSSbCJjqIirkFxSSw/luIn2nQKtt';
export const IMAGE_INGEST = 'https://yucgsuzveabsgntlmste.supabase.co/functions/v1/p2-image-ingest';

export const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const authSecret = () => process.env.CEG_AUTH_SECRET ?? import.meta.env.CEG_AUTH_SECRET ?? '';

// Vercel sends `Authorization: Bearer <CRON_SECRET>` to cron routes when CRON_SECRET is set.
export function cronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? import.meta.env.CRON_SECRET;
  if (!expected) return false;
  const got = request.headers.get('authorization') || '';
  return got === `Bearer ${expected}`;
}

// Calls a public RPC through PostgREST with the publishable key. Secret-gated functions take the
// shared secret as p_secret inside args.
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`rpc ${fn} ${r.status}: ${body.slice(0, 300)}`);
  if (!body) return null as T;
  return JSON.parse(body) as T;
}

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function fetchWithTimeout(url: string, ms: number, init: RequestInit = {}): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); }
  finally { clearTimeout(t); }
}

export async function fireDeployHook(): Promise<boolean> {
  try { const r = await fetchWithTimeout(DEPLOY_HOOK, 10000, { method: 'POST' }); return r.ok; }
  catch (e) { console.error('deploy hook failed', e); return false; }
}

export async function ingestImage(slug: string, sourceUrl: string): Promise<string | null> {
  try {
    const r = await fetchWithTimeout(IMAGE_INGEST, 25000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: authSecret(), slug, source_url: sourceUrl })
    });
    const data: any = await r.json().catch(() => null);
    return r.ok && data?.ok && data?.url ? String(data.url) : null;
  } catch (e) { console.error('image ingest failed', slug, e); return null; }
}

// Runs tasks with bounded concurrency; every result is settled, nothing throws.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try { out[i] = { status: 'fulfilled', value: await fn(items[i], i) }; }
      catch (reason) { out[i] = { status: 'rejected', reason }; }
    }
  });
  await Promise.all(workers);
  return out;
}
