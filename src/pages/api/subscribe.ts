export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';
import { sendMail } from '../../lib/mail';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect('/thanks?e=invalid', 303);
  try {
    await fetch(`${SB_URL}/rest/v1/p2_subscribers`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email, source: 'site' })
    });
  } catch { /* noop */ }
  await sendMail(email, 'Your Colorado Elopement Planning Checklist',
`Hi,

Here's the checklist, as promised:
https://coloradoelopementguide.com/checklist

It covers the marriage license (Colorado lets you self-solemnize -- no officiant required), permits for Rocky Mountain National Park and other public lands, what to book first, and the questions worth asking every vendor.

When you're ready to find your people, every Colorado elopement vendor we know of is here, organized by region:
https://coloradoelopementguide.com/vendors

Happy planning,
Colorado Elopement Guide
Bynum Enterprises LLC, 306 Lost Creek Trl, Greenville, TX 75402
Don't want occasional planning notes? Reply "unsubscribe" and we won't email again.`);
  const key = import.meta.env.KIT_API_KEY;
  if (key) {
    try {
      await fetch('https://api.kit.com/v4/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
        body: JSON.stringify({ email_address: email })
      });
    } catch { /* noop */ }
  }
  return redirect('/thanks', 303);
};
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
