export const prerender = false;
import type { APIRoute } from 'astro';
import { sendMail } from '../../lib/mail';
export const POST: APIRoute = async ({ request }) => {
  try {
    const b = await request.json();
    const email = String(b.email||'').slice(0,200), vendor = String(b.vendor||'').slice(0,200);
    if (email && vendor) await sendMail('bynumenterprisesbe@gmail.com', `[CEG] Vendor account: ${vendor} (${b.verified?'auto verified':'PENDING REVIEW'})`,
`New vendor account.\nVendor: ${vendor}\nEmail: ${email}\nVerified: ${b.verified}\n\nPending ones are reviewed by the daily reply task or manually.`);
  } catch { /* noop */ }
  return new Response('ok');
};
