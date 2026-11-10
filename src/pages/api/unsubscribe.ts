export const prerender = false;
import type { APIRoute } from 'astro';
import { performUnsub, unsubPage, oneClickResponse } from '../../lib/unsub-handler';

// Unsubscribe from all Colorado Elopement Guide email. Legacy couple link /api/unsubscribe?t=<p2_nurture.unsub_token>
// (in kit and nurture bodies already sent) and the signed ?e=&t= form. GET (the link in the email) and POST
// (RFC 8058 one click) both unsubscribe; the token is resolved to its email in the database and suppressed everywhere.
export const GET: APIRoute = async ({ url }) => unsubPage(await performUnsub(url, 'ceg_nurture_unsub', 'link'));
export const POST: APIRoute = async ({ url }) => oneClickResponse(await performUnsub(url, 'ceg_nurture_unsub', 'one_click'));
