export const prerender = false;
import type { APIRoute } from 'astro';
import { unsubRoutes } from '../../lib/unsub-handler';

// Unsubscribe from all Colorado Elopement Guide email: /api/unsubscribe?e=<email>&t=<signed> (the link and List-Unsubscribe
// header in every lifecycle and marketing email) or the legacy /api/unsubscribe?t=<token>. GET only shows a confirm page with
// one button (scanners open every link, so a GET never unsubscribes); the button POSTs and unsubscribes; a POST with
// List-Unsubscribe=One-Click (RFC 8058, Gmail and Yahoo) unsubscribes immediately. See src/lib/unsub-handler.ts.
const r = unsubRoutes('/api/unsubscribe', 'ceg_nurture_unsub');
export const GET: APIRoute = ({ url }) => r.GET({ url });
export const POST: APIRoute = ({ url, request }) => r.POST({ url, request });
