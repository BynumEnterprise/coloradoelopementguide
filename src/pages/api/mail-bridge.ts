// Gmail bridge: a Google Apps Script in the owner's account posts new Stripe mail and vendor replies here.
// It runs in Google's cloud, so Featured flips and clear cut replies happen with nobody at a computer.
// Auth: body.secret must equal CEG_AUTH_SECRET. Returns { actions: [{thread_id, message_id, reply_text}] }
// which the script sends from the owner's Gmail, signed Ryan. Everything deterministic; nothing invented.
export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret, fireDeployHook } from '../../lib/cron';
import { naturalCheck, SITE_URL } from '../../lib/outreach';
import { sendMailResult, OWNER_EMAIL } from '../../lib/mail';

type Msg = { id: string; thread_id: string; from: string; subject: string; body: string; date: string; kind: 'stripe' | 'reply' };

const emailIn = (s: string) => (s.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []).map(x => x.toLowerCase());
const senderEmail = (from: string) => emailIn(from)[0] || '';

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const secret = authSecret();
  if (!secret || body?.secret !== secret) return json({ error: 'unauthorized' }, 401);
  const msgs: Msg[] = Array.isArray(body.messages) ? body.messages.slice(0, 40) : [];
  const actions: { thread_id: string; message_id: string; reply_text: string }[] = [];
  const notes: string[] = [];
  let deploy = false;

  for (const m of msgs) {
    try {
      if (await rpc<boolean>('ceg_cron_bridge_seen', { p_secret: secret, p_gmail_id: m.id })) continue;
      const text = `${m.subject}\n${m.body}`.slice(0, 6000);
      const lower = text.toLowerCase();
      let action = 'ignored';

      if (m.kind === 'stripe') {
        // Customer email is the first non stripe address in the receipt body; name is best effort.
        const custEmail = emailIn(m.body).find(e => !e.endsWith('stripe.com') && e !== OWNER_EMAIL) || '';
        const amount = (m.body.match(/\$\s?(\d+(?:\.\d{2})?)/) || [])[1] || '';
        const isCancel = /cancel|canceled|cancelled|failed|past due|unpaid/.test(lower);
        const isPaid = /payment|paid|receipt|subscription|invoice|new customer|succeeded/.test(lower);
        if (isCancel) {
          const r = await rpc<any>('ceg_cron_unset_featured', { p_secret: secret, p_email: custEmail, p_name: null });
          action = r ? `unfeatured vendor ${r}` : 'cancel notice, no vendor matched';
          if (r) deploy = true;
        } else if (isPaid && custEmail) {
          const until = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
          const r = await rpc<any>('ceg_cron_set_featured', { p_secret: secret, p_email: custEmail, p_name: null, p_until: until });
          action = r ? `featured vendor ${r} until ${until} ($${amount})` : `payment from ${custEmail} ($${amount}) not matched to a vendor`;
          if (r) deploy = true;
        }
        if (action !== 'ignored') notes.push(`${m.subject}: ${action}`);
      } else {
        const from = senderEmail(m.from);
        const v = from ? await rpc<any>('ceg_cron_vendor_by_email', { p_secret: secret, p_email: from }) : null;
        const wantsRemoval = /\b(remove|take (us|it|me) down|delete (our|my|the) listing|unlist|do not list)\b/.test(lower);
        const wantsUnsub = /\bunsubscribe\b|stop emailing|no more emails|take me off/.test(lower);
        const claimInterest = /\b(claim|interested|how do i|sign up|dashboard|featured|password|log ?in)\b/.test(lower);
        if (v && wantsRemoval) {
          await rpc('ceg_cron_set_status', { p_secret: secret, p_id: v.id, p_status: 'removed', p_outreach: 'removed_requested' });
          deploy = true;
          const reply = `Done. The ${v.name} listing is coming down today, and you will not hear from me again.\n\nRyan\nColorado Elopement Guide`;
          naturalCheck(reply, 'removal reply');
          actions.push({ thread_id: m.thread_id, message_id: m.id, reply_text: reply });
          action = `removed ${v.slug}, reply queued`;
        } else if (v && wantsUnsub) {
          await rpc('ceg_cron_set_status', { p_secret: secret, p_id: v.id, p_status: v.status, p_outreach: 'unsubscribed' });
          action = `unsubscribed ${v.slug}`;
        } else if (v && claimInterest && v.status === 'seeded') {
          const reply = `Hi,\n\nThanks for writing back. You can take over the ${v.name} listing here, it takes about a minute and there is no card involved:\n${SITE_URL}/vendor-dashboard?vendor=${v.slug}\n\nUse an email at your business domain and the account verifies on the spot. Once you are in you can fix any details, add photos, and see how many couples open your page and click through to your site, with bots filtered out.\n\nIf you have a question I did not cover, reply here and I will answer it.\n\nRyan\nColorado Elopement Guide`;
          naturalCheck(reply, 'claim reply');
          actions.push({ thread_id: m.thread_id, message_id: m.id, reply_text: reply });
          action = `claim interest ${v.slug}, reply queued`;
        } else {
          action = v ? `needs a human look (${v.slug})` : 'sender not a listed vendor';
          notes.push(`${m.from}: ${m.subject} :: ${m.body.replace(/\s+/g, ' ').slice(0, 240)}`);
        }
      }
      await rpc('ceg_cron_bridge_log', { p_secret: secret, p_gmail_id: m.id, p_kind: m.kind, p_sender: m.from, p_subject: m.subject, p_action: action });
    } catch (e) {
      notes.push(`error on ${m.id}: ${String(e).slice(0, 200)}`);
    }
  }

  if (deploy) await fireDeployHook();
  if (notes.length) {
    const text = `Mail bridge handled ${msgs.length} message(s).\n\n${notes.join('\n\n')}\n\nAnything marked needs a human look is waiting in your inbox.`;
    await sendMailResult(OWNER_EMAIL, `CEG mail bridge: ${notes.length} item(s)`, text).catch(() => null);
  }
  return json({ ok: true, processed: msgs.length, actions, notes: notes.length });
};
