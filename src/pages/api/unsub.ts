export const prerender = false;
import type { APIRoute } from 'astro';
import { performUnsub, unsubPage, oneClickResponse } from '../../lib/unsub-handler';

// Unsubscribe from all Colorado Elopement Guide email. /api/unsub?e=<email>&t=<signed>, the link and the
// List-Unsubscribe header in every lifecycle and marketing email, or the legacy /api/unsub?t=<vendor user token>.
// GET (the link) and POST (RFC 8058 one click from Gmail and Yahoo) both unsubscribe. See src/lib/unsub-handler.ts.
export const GET: APIRoute = async ({ url }) => unsubPage(await performUnsub(url, 'ceg_unsub', 'link'));
export const POST: APIRoute = async ({ url }) => oneClickResponse(await performUnsub(url, 'ceg_unsub', 'one_click'));
