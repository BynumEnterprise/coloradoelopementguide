export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';
import { sendMail } from '../../lib/mail';

const j = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Sends the vendor a "your listing is claimed, here is your dashboard" email with a
// one tap login link. Called by the daily reply-review task after a claim is confirmed.
// Secret gated: caller must present the same CEG_AUTH_SECRET the site uses.
export const POST: APIRoute = async ({ request }) => {
  const secretEnv = process.env.CEG_AUTH_SECRET ?? import.meta.env.CEG_AUTH_SECRET;
  let body: any = {};
  try { body = await request.json(); } catch { /* noop */ }
  const vendorId = Number(body.vendor_id);
  const secret = String(body.secret || '');
  const emailOverride = body.email ? String(body.email) : null;

  if (!secretEnv || secret !== secretEnv) return j({ error: 'unauthorized' }, 401);
  if (!vendorId) return j({ error: 'vendor_id required' }, 400);

  // Provision (idempotent) a verified vendor login and get its token.
  const pr = await fetch(`${SB_URL}/rest/v1/rpc/ceg_vendor_provision`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_vendor_id: vendorId, p_email: emailOverride, p_secret: secret })
  });
  if (!pr.ok) { console.error('vendor-welcome provision failed', pr.status, await pr.text()); return j({ error: 'provision failed' }, 502); }
  const prov = await pr.json();
  if (!prov || prov.error) return j({ error: prov?.error || 'provision failed' }, 400);

  const name: string = prov.name || 'there';
  const to: string = prov.email;
  const link = `https://coloradoelopementguide.com/vd/${prov.token}`;

  const subject = `Your ${name} dashboard is ready`;

  const text =
`Hi ${name},

Good news. Your listing on Colorado Elopement Guide is claimed and live, and your free vendor dashboard is ready.

Here is what you can do inside it:

See your real numbers. How many couples viewed your page, clicked through to your website, and tapped your phone number. Every count is bot filtered, so you only see real people, never inflated totals.

Keep your listing accurate. Update your description, phone, and website any time. Your changes go live on the site within a few minutes.

Get seen first when you want to. Featured placement puts you at the top of your category and region pages, always clearly labeled. It is 40 dollars a month, cancel any time, and your first month is 1 dollar with code FIRSTMONTH1.

Open your dashboard here. This link signs you straight in:
${link}

Once you are in, set a password so you can sign in from any device later.

Questions? Just reply to this email.

Ryan
Colorado Elopement Guide`;

  const html =
`<!doctype html><html><body style="margin:0;background:#f2ede3;font-family:Georgia,'Times New Roman',serif;color:#1f1d1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 22px;">
    <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a6a4f;margin:0 0 14px;">Colorado Elopement Guide</p>
    <h1 style="font-size:26px;line-height:1.25;margin:0 0 16px;font-weight:600;">Your listing is claimed. <span style="font-style:italic;color:#2f4a3f;">Your dashboard is ready.</span></h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 22px;color:#3a3733;">Hi ${esc(name)}, your listing is live and your free vendor dashboard is waiting. Here is what it does for you.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="padding:14px 0;border-top:1px solid #e2d9c8;">
        <strong style="font-size:16px;">See your real numbers</strong>
        <div style="font-size:14px;line-height:1.6;color:#4a4640;margin-top:4px;">How many couples viewed your page, clicked through to your website, and tapped your phone number. Bot filtered, so it is only real people, never inflated.</div>
      </td></tr>
      <tr><td style="padding:14px 0;border-top:1px solid #e2d9c8;">
        <strong style="font-size:16px;">Keep your listing accurate</strong>
        <div style="font-size:14px;line-height:1.6;color:#4a4640;margin-top:4px;">Update your description, phone, and website whenever you like. Changes go live within a few minutes.</div>
      </td></tr>
      <tr><td style="padding:14px 0;border-top:1px solid #e2d9c8;border-bottom:1px solid #e2d9c8;">
        <strong style="font-size:16px;">Get seen first when you want to</strong>
        <div style="font-size:14px;line-height:1.6;color:#4a4640;margin-top:4px;">Featured placement puts you at the top of your category and region pages, always labeled. 40 dollars a month, cancel any time, and your first month is 1 dollar with code <strong>FIRSTMONTH1</strong>.</div>
      </td></tr>
    </table>

    <div style="text-align:center;margin:30px 0 10px;">
      <a href="${link}" style="display:inline-block;background:#1f1d1a;color:#f7f3ea;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:15px 34px;border-radius:999px;">Open My Dashboard</a>
    </div>
    <p style="font-size:13px;line-height:1.6;color:#6b665e;text-align:center;margin:0 0 26px;">This link signs you in. Once inside, set a password so you can return from any device.</p>

    <p style="font-size:15px;line-height:1.6;color:#3a3733;margin:0;">Questions? Just reply to this email.</p>
    <p style="font-size:15px;line-height:1.6;color:#3a3733;margin:16px 0 0;">Ryan<br/>Colorado Elopement Guide</p>
  </div>
</body></html>`;

  const ok = await sendMail(to, subject, text, html);
  return j({ ok, sent_to: to, vendor: name });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
