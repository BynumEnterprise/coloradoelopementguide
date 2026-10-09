export const MAIL_FROM = 'Colorado Elopement Guide <hello@send.coloradoelopementguide.com>';
export const MAIL_REPLY_TO = 'bynumenterprisesbe@gmail.com';
export const OWNER_EMAIL = 'bynumenterprisesbe@gmail.com';

export type MailResult = { ok: boolean; status: number; id?: string; error?: string };

// Full-detail sender used by the cron jobs (they need the HTTP status and the Resend id).
export async function sendMailResult(to: string, subject: string, text: string, html?: string): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  if (!key) { console.error('MAIL: no RESEND_API_KEY in env'); return { ok: false, status: 0, error: 'no RESEND_API_KEY' }; }
  try {
    const payload: Record<string, unknown> = { from: MAIL_FROM, to: [to], reply_to: MAIL_REPLY_TO, subject, text };
    if (html) payload.html = html;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await r.text();
    if (!r.ok) { console.error('MAIL: resend error', r.status, body); return { ok: false, status: r.status, error: body.slice(0, 300) }; }
    let id: string | undefined;
    try { id = JSON.parse(body)?.id; } catch { /* noop */ }
    return { ok: true, status: r.status, id };
  } catch (e) { console.error('MAIL: exception', e); return { ok: false, status: 0, error: String(e) }; }
}

// Original signature, kept for every existing caller.
export async function sendMail(to: string, subject: string, text: string, html?: string) {
  return (await sendMailResult(to, subject, text, html)).ok;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Plain text to a minimal HTML part: blank-line paragraphs become <p>, single newlines become <br>,
// and every URL becomes an anchor (bare URLs in a plain text only mail get rewritten by Gmail).
export function textToHtml(text: string): string {
  const paras = text.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  const body = paras.map(p => {
    const lines = p.split('\n').map(line => {
      const parts: string[] = [];
      let last = 0;
      const re = /https?:\/\/[^\s<>"')\]]+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line))) {
        parts.push(esc(line.slice(last, m.index)));
        const url = m[0];
        parts.push(`<a href="${esc(url)}">${esc(url.replace(/^https?:\/\//, ''))}</a>`);
        last = m.index + url.length;
      }
      parts.push(esc(line.slice(last)));
      return parts.join('');
    });
    return `<p>${lines.join('<br>')}</p>`;
  }).join('\n');
  return `<!doctype html><html><body style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#222;max-width:640px">\n${body}\n</body></html>`;
}
