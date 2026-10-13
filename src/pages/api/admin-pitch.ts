export const prerender = false;
import type { APIRoute } from 'astro';
import { json } from '../../lib/cron';
import { SB_URL, SB_KEY } from '../../lib/supabase';
import { renderPitch, sendPitch, type PitchPrep } from '../../lib/pitch-mail';

// Owner only. POST { token, vendor_id, action: 'preview' | 'send' }.
// preview: the personal Featured pitch built from the vendor's live numbers (same text Send uses).
// send: re checks the guards in ceg_admin_pitch (claimed, verified, not unsubscribed, no email in 3 days,
// fewer than 5 pitches), records a p2_vendor_drip step and a p2_pitch_log row, then sends through Resend.
async function call(args: Record<string, unknown>): Promise<{ status: number; data: any }> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/ceg_admin_pitch`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const body = await r.text();
  let data: any = null;
  try { data = body ? JSON.parse(body) : null; } catch { data = { error: body.slice(0, 200) }; }
  return { status: r.status, data };
}

export const POST: APIRoute = async ({ request }) => {
  let b: any = {};
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Bad request.' }, 400); }
  const token = String(b.token || '').slice(0, 200);
  const id = Number(b.vendor_id);
  const action = b.action === 'send' ? 'send' : 'preview';
  if (!token || !Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Admin token and vendor id are required.' }, 400);

  const prep = await call({ p_token: token, p_id: id, p_action: 'prepare' });
  if (prep.status === 401 || prep.status === 403 || prep.data?.code === '42501') return json({ ok: false, error: 'Admin session is not valid. Sign in again.' }, 401);
  if (prep.status !== 200 || !prep.data) return json({ ok: false, error: 'Could not load this vendor.' }, 502);
  if (prep.data.error) return json({ ok: false, error: prep.data.error }, 404);
  const p = prep.data as PitchPrep & { last_mail: any; pitches_sent: number };

  let pitch;
  try { pitch = renderPitch(p); }
  catch (e) { return json({ ok: false, error: `The pitch failed the voice check: ${String((e as Error).message || e)}` }, 422); }

  if (action === 'preview') {
    return json({ ok: true, blocked: p.blocked, to: pitch.to, subject: pitch.subject, text: pitch.text,
      numbers: p.numbers, slots: p.slots, founding: p.founding, last_mail: p.last_mail, pitches_sent: p.pitches_sent });
  }

  if (p.blocked) return json({ ok: false, blocked: true, error: p.blocked }, 409);
  if (!pitch.to) return json({ ok: false, error: 'No account email on file.' }, 409);

  const mark = await call({ p_token: token, p_id: id, p_action: 'mark', p_to: pitch.to, p_subject: pitch.subject, p_body: pitch.text });
  if (mark.status !== 200 || !mark.data?.ok) return json({ ok: false, blocked: !!mark.data?.blocked, error: mark.data?.error || 'Could not record the pitch.' }, 409);
  const logId = mark.data.log_id;

  const sent = await sendPitch(pitch);
  if (!sent.ok) {
    await call({ p_token: token, p_id: id, p_action: 'failed', p_log_id: logId, p_error: `${sent.status} ${sent.error || ''}` });
    return json({ ok: false, error: `Resend refused the email (${sent.status}). Nothing was recorded as sent.` }, 502);
  }
  await call({ p_token: token, p_id: id, p_action: 'sent', p_log_id: logId, p_resend_id: sent.id || null });
  return json({ ok: true, sent: true, to: pitch.to, resend_id: sent.id || null, step: mark.data.step });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
