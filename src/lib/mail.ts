export async function sendMail(to: string, subject: string, text: string) {
  const key = import.meta.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Colorado Elopement Guide <hello@send.coloradoelopementguide.com>',
        to: [to], reply_to: 'bynumenterprisesbe@gmail.com', subject, text
      })
    });
    return r.ok;
  } catch { return false; }
}
