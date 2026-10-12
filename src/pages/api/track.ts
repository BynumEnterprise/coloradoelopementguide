export const prerender = false;
import type { APIRoute } from 'astro';
import { rpc, authSecret } from '../../lib/cron';

// First party, cookieless site analytics. The inline tracker in Base.astro beacons here on every page load
// (k: 'pv') and on key clicks and conversions (k: 'ev'). Privacy: no cookies, no IP or user agent stored.
// We send sha256(ip|ua) to ceg_track, which salts it again with a random salt that rotates daily, so a
// visitor_hash cannot be linked across days or reversed. Bots are rejected here and again in the client.

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|bingpreview|prerender|pagespeed|gtmetrix|pingdom|uptime|monitor|python|curl|wget|httpclient|java\/|go-http|okhttp|axios|node-fetch|undici|phantom|selenium|puppeteer|playwright|scrapy|whatsapp|telegram|discord|skype|slack|embedly|quora link|vkshare|ahrefs|semrush|mj12|dataforseo|bytespider|gptbot|claude|perplexity|chatgpt|ccbot|yandex|baidu|petal|seznam|archive/i;
const EVENTS = new Set(['vendor_website_click', 'vendor_phone_click', 'inquiry_submitted', 'planner_signup', 'vendor_signup', 'claim_started', 'featured_checkout_click', 'newsletter_signup']);
const OWN_HOST = /(^|\.)coloradoelopementguide\.com$/;

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const str = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);

function cleanPath(p: string): string {
  let s = str(p, 300).split(/[?#]/)[0] || '/';
  if (!s.startsWith('/')) s = '/' + s;
  // Never store sign in tokens that live in the path.
  s = s.replace(/^\/(lt|vd)\/[^/]+/, '/$1/:token');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s.slice(0, 200) || '/';
}

function device(ua: string): string {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini|IEMobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function browser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung';
  if (/Instagram/.test(ua)) return 'Instagram';
  if (/FBAN|FBAV/.test(ua)) return 'Facebook';
  if (/Pinterest/.test(ua)) return 'Pinterest';
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

function refHost(r: string): string | null {
  try {
    const h = new URL(r).hostname.toLowerCase().replace(/^www\./, '');
    return h || null;
  } catch { return null; }
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ua = request.headers.get('user-agent') || '';
  if (!ua || ua.length < 20 || BOT_RE.test(ua)) return ok({ ok: false, reason: 'bot' }, 403);
  const origin = request.headers.get('origin') || '';
  if (origin) {
    const h = refHost(origin) || '';
    if (!OWN_HOST.test(h) && !/\.vercel\.app$/.test(h) && h !== 'localhost') return ok({ ok: false, reason: 'origin' }, 403);
  }

  let body: Record<string, unknown> = {};
  try { body = JSON.parse((await request.text()).slice(0, 4000) || '{}'); } catch { return ok({ ok: false, reason: 'body' }, 400); }
  const kind = body.k === 'ev' ? 'ev' : body.k === 'pv' ? 'pv' : '';
  if (!kind) return ok({ ok: false, reason: 'kind' }, 400);
  const event = str(body.e, 40);
  if (kind === 'ev' && !EVENTS.has(event)) return ok({ ok: false, reason: 'event' }, 400);

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || (() => { try { return clientAddress; } catch { return ''; } })() || '';
  const prehash = await sha256Hex(`${ip}|${ua}`);
  // Signals that a real browser would normally send. Missing ones mark the row as a likely bot (kept, never reported).
  const suspect = !request.headers.get('accept-language') || body.wd === true;

  let host = refHost(str(body.r, 500));
  if (host && OWN_HOST.test(host)) host = 'coloradoelopementguide.com';
  const utm = (body.u && typeof body.u === 'object') ? body.u as Record<string, unknown> : {};

  try {
    const res: any = await rpc('ceg_track', {
      p_secret: authSecret(),
      p_kind: kind,
      p_prehash: prehash,
      p_path: cleanPath(str(body.p, 300)),
      p_referrer_host: kind === 'pv' ? host : null,
      p_utm_source: kind === 'pv' ? (str(utm.s, 80).toLowerCase() || null) : null,
      p_utm_medium: kind === 'pv' ? (str(utm.m, 80).toLowerCase() || null) : null,
      p_utm_campaign: kind === 'pv' ? (str(utm.c, 120) || null) : null,
      p_device: device(ua),
      p_browser: browser(ua),
      p_country: (request.headers.get('x-vercel-ip-country') || '').slice(0, 2) || null,
      p_session: str(body.s, 40).replace(/[^a-zA-Z0-9-]/g, '') || null,
      p_is_bot: suspect,
      p_event: kind === 'ev' ? event : null,
      p_target: kind === 'ev' ? (str(body.t, 200) || null) : null
    });
    return ok(res && typeof res === 'object' ? res : { ok: true });
  } catch (e) {
    console.error('track failed', String(e).slice(0, 200));
    return ok({ ok: false, reason: 'server' }, 500);
  }
};

export const GET: APIRoute = () => ok({ ok: false, reason: 'method' }, 405);
