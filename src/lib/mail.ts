export async function sendMail(to: string, subject: string, text: string, html?: string) {
  const key = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  if (!key) { console.error('MAIL: no RESEND_API_KEY in env'); return false; }
  try {
    const payload: Record<string, unknown> = {
      from: 'Colorado Elopement Guide <hello@send.coloradoelopementguide.com>',
      to: [to], reply_to: 'bynumenterprisesbe@gmail.com', subject, text
    };
    if (html) payload.html = html;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) console.error('MAIL: resend error', r.status, await r.text());
    return r.ok;
  } catch (e) { console.error('MAIL: exception', e); return false; }
}
