// Google Search Console import (S8). Property in GSC_SITE (default sc-domain:coloradoelopementguide.com).
// Auth, in order of preference:
//   1. Keyless Workload Identity Federation (live path, 2026-11-09). Vercel OIDC federation (team issuer) gives every
//      function a short lived JWT in the x-vercel-oidc-token request header (VERCEL_OIDC_TOKEN env as a fallback).
//      We swap it at Google STS for a federated token, then impersonate the read only service account in GSC_SA_EMAIL
//      via IAM Credentials generateAccessToken. Needs GSC_WIF_AUDIENCE
//      (//iam.googleapis.com/projects/<NUM>/locations/global/workloadIdentityPools/<pool>/providers/<provider>)
//      and GSC_SA_EMAIL. No key material is stored anywhere.
//   2. Legacy service account JSON key in GSC_SA_JSON (unused; kept as a fallback branch only).
// No SDK either way. The weekly cron stores rows via ceg_gsc_upsert.
import { createSign } from 'node:crypto';
import { fetchWithTimeout } from './cron';

export const GSC_DEFAULT_SITE = 'sc-domain:coloradoelopementguide.com';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export type GscRow = { date: string; dimension: 'page' | 'query'; key: string; clicks: number; impressions: number; ctr: number; position: number };

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

const envVar = (k: string): string | undefined => (process.env[k] ?? (import.meta.env as any)?.[k]) || undefined;

export type GscWif = { audience: string; saEmail: string };

// Federation settings, or null when not configured.
export function gscWifEnv(): GscWif | null {
  const audience = envVar('GSC_WIF_AUDIENCE'), saEmail = envVar('GSC_SA_EMAIL');
  return audience && saEmail ? { audience: audience.trim(), saEmail: saEmail.trim() } : null;
}

// The Vercel OIDC token: request header first (runtime), then the env var (build time, local dev with vercel env pull).
export function vercelOidcToken(request?: Request | null): string | null {
  const h = request?.headers?.get('x-vercel-oidc-token');
  return (h && h.trim()) || envVar('VERCEL_OIDC_TOKEN')?.trim() || null;
}

export const STS_URL = 'https://sts.googleapis.com/v1/token';
export const STS_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

// Request builders are exported so they can be unit tested without the network.
export function stsRequest(audience: string, subjectToken: string): { url: string; init: RequestInit } {
  return {
    url: STS_URL,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        audience,
        scope: STS_SCOPE,
        requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        subject_token: subjectToken
      }).toString()
    }
  };
}

export function impersonateRequest(saEmail: string, federatedToken: string): { url: string; init: RequestInit } {
  return {
    url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(saEmail)}:generateAccessToken`,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${federatedToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: [SCOPE], lifetime: '3600s' })
    }
  };
}

export async function gscFederatedToken(wif: GscWif, oidcToken: string, f: typeof fetch = fetch): Promise<string> {
  const timed = (url: string, init: RequestInit) => (f === fetch ? fetchWithTimeout(url, 15_000, init) : f(url, init));
  const a = stsRequest(wif.audience, oidcToken);
  const r1 = await timed(a.url, a.init);
  const b1: any = await r1.json().catch(() => ({}));
  if (!r1.ok || !b1.access_token) throw new Error(`gsc sts ${r1.status} ${String(b1.error_description || b1.error || '').slice(0, 160)}`);
  const b = impersonateRequest(wif.saEmail, String(b1.access_token));
  const r2 = await timed(b.url, b.init);
  const b2: any = await r2.json().catch(() => ({}));
  if (!r2.ok || !b2.accessToken) throw new Error(`gsc impersonate ${r2.status} ${String(b2?.error?.message || '').slice(0, 160)}`);
  return String(b2.accessToken);
}

// One entry point for the cron: picks federation when configured, else the legacy key, else reports skipped.
export async function gscAuth(request?: Request | null): Promise<{ token: string; mode: 'wif' | 'key'; site: string } | { skipped: string; site: string }> {
  const site = envVar('GSC_SITE') || GSC_DEFAULT_SITE;
  const wif = gscWifEnv();
  if (wif) {
    const oidc = vercelOidcToken(request);
    if (!oidc) return { skipped: 'GSC_WIF_AUDIENCE set but no Vercel OIDC token (enable OIDC federation on the project)', site };
    return { token: await gscFederatedToken(wif, oidc), mode: 'wif', site };
  }
  const env = gscEnv();
  if (env.sa) return { token: await gscAccessToken(env.sa), mode: 'key', site };
  return { skipped: env.error ? `GSC_SA_JSON invalid: ${env.error}` : 'no GSC_WIF_AUDIENCE/GSC_SA_EMAIL', site };
}

// True when some auth path is configured (used by the digest only stage, which makes no Google call).
export const gscConfigured = (): boolean => !!gscWifEnv() || !!gscEnv().sa;

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
