// Google Search Console import (S8). Service account JSON in env GSC_SA_JSON, property in GSC_SITE
// (default sc-domain:coloradoelopementguide.com). No SDK: a RS256 JWT signed with node crypto, swapped for an
// access token, then the Search Analytics query endpoint. The weekly cron stores rows via ceg_gsc_upsert.
import { createSign } from 'node:crypto';
import { fetchWithTimeout } from './cron';

export const GSC_DEFAULT_SITE = 'sc-domain:coloradoelopementguide.com';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export type GscRow = { date: string; dimension: 'page' | 'query'; key: string; clicks: number; impressions: number; ctr: number; position: number };

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export function gscEnv(): { sa: { client_email: string; private_key: string; token_uri?: string } | null; site: string; error?: string } {
  const raw = process.env.GSC_SA_JSON ?? import.meta.env.GSC_SA_JSON;
  const site = (process.env.GSC_SITE ?? import.meta.env.GSC_SITE) || GSC_DEFAULT_SITE;
  if (!raw) return { sa: null, site };
  try {
    const sa = JSON.parse(raw);
    if (!sa?.client_email || !sa?.private_key) return { sa: null, site, error: 'GSC_SA_JSON lacks client_email or private_key' };
    return { sa, site };
  } catch { return { sa: null, site, error: 'GSC_SA_JSON is not valid JSON' }; }
}

export async function gscAccessToken(sa: { client_email: string; private_key: string; token_uri?: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = b64url(signer.sign(sa.private_key.replace(/\\n/g, '\n')));
  const r = await fetchWithTimeout(tokenUri, 15_000, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${sig}` }).toString()
  });
  const body: any = await r.json().catch(() => ({}));
  if (!r.ok || !body.access_token) throw new Error(`gsc token ${r.status} ${String(body.error_description || body.error || '').slice(0, 120)}`);
  return String(body.access_token);
}

// Search Console data lags about two days, so "last 7 days" ends the day before yesterday.
export function gscWindow(now = new Date()): { start: string; end: string } {
  const d = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString().slice(0, 10);
  return { start: d(9), end: d(3) };
}

async function query(token: string, site: string, body: Record<string, unknown>): Promise<any[]> {
  const r = await fetchWithTimeout(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, 30_000, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`gsc query ${r.status} ${String(data?.error?.message || '').slice(0, 160)}`);
  return Array.isArray(data.rows) ? data.rows : [];
}

export async function gscFetchWeek(token: string, site: string, win = gscWindow()): Promise<GscRow[]> {
  const out: GscRow[] = [];
  const pages = await query(token, site, { startDate: win.start, endDate: win.end, dimensions: ['date', 'page'], rowLimit: 5000, dataState: 'final' });
  for (const r of pages) out.push({ date: r.keys[0], dimension: 'page', key: String(r.keys[1]).slice(0, 500), clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? 0 });
  // Top 50 queries for the week, stored on the window's end date (one row per query per import).
  const queries = await query(token, site, { startDate: win.start, endDate: win.end, dimensions: ['query'], rowLimit: 50, dataState: 'final' });
  for (const r of queries) out.push({ date: win.end, dimension: 'query', key: String(r.keys[0]).slice(0, 500), clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? 0 });
  return out;
}
