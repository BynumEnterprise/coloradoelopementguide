export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret, cronAuthorized, fetchWithTimeout } from '../../../lib/cron';
import { sendMailResult, OWNER_EMAIL } from '../../../lib/mail';
import { buildAudit, type AuditData } from '../../../lib/audit';

// Sunday self audit (S10, Vercel cron 13:00 UTC Sunday). Ten PASS or FLAG checks over the week, computed by
// ceg_cron_self_audit (SECURITY DEFINER) and rendered by src/lib/audit.ts. Emails the owner, writes one
// fleet.decisions row and stamps p2_config.cron_audit_last_ran. ?dry=1 returns the report without sending or writing.
async function resendSends7d(): Promise<{ sends: number | null; error?: string }> {
  const key = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  if (!key) return { sends: null, error: 'no RESEND_API_KEY' };
  const since = Date.now() - 7 * 86_400_000;
  let sends = 0, after = '';
  try {
    // Same paging as the bounces stage in daily.ts: newest first, stop at the first page older than the window.
    for (let page = 0; page < 10; page++) {
      const r = await fetchWithTimeout(`https://api.resend.com/emails?limit=100${after ? `&after=${after}` : ''}`, 15_000, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) throw new Error(`resend list ${r.status}`);
      const body: any = await r.json();
      const rows: any[] = Array.isArray(body?.data) ? body.data : [];
      if (!rows.length) break;
      for (const m of rows) {
        if (!String(m.from || '').includes('coloradoelopementguide')) continue;
        if (Date.parse(m.created_at) < since) continue;
        sends++;
      }
      const last = rows[rows.length - 1];
      if (!body.has_more || !last || Date.parse(last.created_at) < since) break;
      after = last.id;
    }
    return { sends };
  } catch (e) { return { sends: null, error: String(e).slice(0, 120) }; }
}

export const GET: APIRoute = async ({ request }) => {
  if (!cronAuthorized(request)) return json({ error: 'unauthorized' }, 401);
  const secret = authSecret();
  if (!secret) return json({ error: 'CEG_AUTH_SECRET missing' }, 500);
  const url = new URL(request.url);
  const dry = url.searchParams.get('dry') === '1';
  const started = Date.now();
  const run: Record<string, unknown> = { ok: true, ran_at: new Date().toISOString(), dry };
  try {
    // Settled claims (vendor already has a verified account) are closed first, so nothing waits on a person.
    if (!dry) { try { await rpc('ceg_cron_close_settled_claims', { p_secret: secret }); } catch { /* noop */ } }
    const data = await rpc<AuditData>('ceg_cron_self_audit', { p_secret: secret });
    const rs = await resendSends7d();
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' });
    const { text, flags, lines } = buildAudit(data, { resend_sends_7d: rs.sends, resend_error: rs.error }, date);
    run.flags = flags; run.words = text.split(/\s+/).length; run.lines = lines;
    if (dry) run.preview = text;
    else {
      const res = await sendMailResult('transactional', OWNER_EMAIL, '[CEG] Sunday self audit', text);
      run.sent = res.ok; if (!res.ok) { run.send_error = res.error; run.ok = false; }
      try {
        run.decision_id = await rpc('ceg_cron_decision', {
          p_secret: secret,
          p_decision: `Sunday self audit ${date}: ${flags === 0 ? 'all 10 checks pass' : `${flags} of 10 flagged`}`,
          p_reasoning: lines.join(' | ').slice(0, 3900),
          p_expected: 'Flags get picked up by the next session; the audit runs again next Sunday.'
        });
      } catch (e) { run.decision_error = String(e).slice(0, 200); }
      try { await rpc('ceg_cron_config_set', { p_secret: secret, p_key: 'cron_audit_last_ran', p_value: String(run.ran_at) }); } catch { /* noop */ }
    }
  } catch (e) { run.error = String(e).slice(0, 300); run.ok = false; }
  run.ms = Date.now() - started;
  console.log('CRON audit', JSON.stringify({ ...run, preview: undefined }));
  return json(run);
};
