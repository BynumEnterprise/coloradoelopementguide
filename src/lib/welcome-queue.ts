// Queue stage shared by /api/cron/queue (every 15 minutes, triggered by pg_cron job p2-queue-tick only when work is
// pending) and the `queue` stage of /api/cron/daily (backup). It drains what the cloud Claude tasks queue through the
// connector only ceg_task_* functions, so no task ever needs a vault secret:
//   a. p2_listing_enrich: new listings from ceg_task_add_listing get one DataForSEO Maps lookup (rating, photo through
//      the image ingest), same matching as the weekly release refresh.
//   b. p2_welcome_queue: welcome email with the one tap dashboard link (ceg_task_confirm_claim), rendered and sent by
//      deliverWelcome from /api/vendor-welcome, then any inquiry that reached the listing before the claim.
//   c. p2_deploy_requests: fires the Vercel deploy hook once for all pending requests (claims, edits, removals).
// Every queue row is locked by the RPC before work starts, so overlapping runs never double send.
import { rpc, fireDeployHook, ingestImage, sleep } from './cron';
import { deliverWelcome } from '../pages/api/vendor-welcome';
import { mapsLookup, bigPhoto, type Released } from '../pages/api/cron/weekly';

type WelcomeRow = { id: number; vendor_id: number; email: string; token: string | null; name: string; slug: string; sub_region: string | null; attempts: number };

export async function runQueueStage(secret: string, opts: { dry?: boolean; started?: number; budgetMs?: number } = {}): Promise<Record<string, unknown>> {
  const started = opts.started ?? Date.now();
  const budget = opts.budgetMs ?? 240_000;
  const out: Record<string, unknown> = { listings: [] as unknown[], welcomes: [] as unknown[], failed: [] as unknown[] };
  let fire = false;

  // a. Maps lookup for new listings
  const login = process.env.DATAFORSEO_LOGIN ?? import.meta.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD ?? import.meta.env.DATAFORSEO_PASSWORD;
  if (opts.dry) out.listings = 'skipped (dry)';
  else if (!login || !password) out.listings = 'DATAFORSEO credentials missing';
  else {
    try {
      const due = (await rpc<Released[] | null>('ceg_cron_listing_enrich_due', { p_secret: secret, p_limit: 5 })) || [];
      for (const v of due) {
        if (Date.now() - started > budget) break;
        const got: string[] = [];
        try {
          const hit = await mapsLookup(v, login, password);
          if (hit) {
            const rating = hit.rating?.value, reviews = hit.rating?.votes_count;
            if (rating != null || reviews != null) { await rpc('ceg_cron_set_rating', { p_secret: secret, p_id: v.id, p_rating: rating ?? null, p_reviews: reviews ?? null }); got.push('rating'); }
            const src = bigPhoto(hit.main_image);
            if (src && !v.image_url) {
              const stored = await ingestImage(v.slug, src);
              if (stored) { await rpc('ceg_cron_set_image', { p_secret: secret, p_id: v.id, p_url: stored }); got.push('image'); }
            }
          }
          const result = hit ? (got.join('+') || 'matched_no_data') : 'unmatched';
          await rpc('ceg_cron_listing_enrich_mark', { p_secret: secret, p_vendor_id: v.id, p_result: result, p_done: true });
          if (got.length) fire = true;
          (out.listings as unknown[]).push({ vendor: v.slug, result });
        } catch (e) {
          const err = String(e).slice(0, 200);
          try { await rpc('ceg_cron_listing_enrich_mark', { p_secret: secret, p_vendor_id: v.id, p_result: err, p_done: false }); } catch { /* noop */ }
          (out.failed as unknown[]).push({ listing: v.slug, error: err });
        }
      }
    } catch (e) { out.listings_fatal = String(e).slice(0, 300); }
  }

  // b. Welcome emails
  if (opts.dry) out.welcomes = 'skipped (dry: the queue RPC locks rows, so a dry run does not read it)';
  else {
    try {
      const rows = (await rpc<WelcomeRow[] | null>('ceg_cron_welcome_queue', { p_secret: secret, p_limit: 10 })) || [];
      for (const q of rows) {
        if (Date.now() - started > budget) {
          try { await rpc('ceg_cron_welcome_mark', { p_secret: secret, p_id: q.id, p_error: 'time budget, retry next run' }); } catch { /* noop */ }
          continue;
        }
        if (!q.token) {
          await rpc('ceg_cron_welcome_mark', { p_secret: secret, p_id: q.id, p_error: 'account row missing' });
          (out.failed as unknown[]).push({ queue: q.id, vendor: q.slug, error: 'account row missing' });
          continue;
        }
        const r = await deliverWelcome(secret, { vendorId: q.vendor_id, email: q.email, token: q.token, name: q.name, slug: q.slug, subRegion: q.sub_region });
        try { await rpc('ceg_cron_welcome_mark', { p_secret: secret, p_id: q.id, p_error: r.ok ? null : (r.error || 'send failed') }); }
        catch (e) { (out.failed as unknown[]).push({ queue: q.id, error: 'mark failed: ' + String(e).slice(0, 150) }); }
        if (r.ok) (out.welcomes as unknown[]).push({ queue: q.id, vendor: q.slug, to: q.email, id: r.id, pending_inquiries: r.pending_inquiries });
        else (out.failed as unknown[]).push({ queue: q.id, vendor: q.slug, attempt: q.attempts, error: r.error });
        await sleep(300);
      }
    } catch (e) { out.welcomes_fatal = String(e).slice(0, 300); }
  }

  // c. Deploy hook, once for every pending request
  if (opts.dry) out.deploy = 'skipped (dry)';
  else {
    try {
      const ids = (await rpc<number[] | null>('ceg_cron_deploy_requests', { p_secret: secret })) || [];
      out.deploy_requests = ids.length;
      if (ids.length || fire) {
        const ok = await fireDeployHook();
        out.deploy = ok;
        if (!ok && ids.length) await rpc('ceg_cron_deploy_requests', { p_secret: secret, p_reopen: ids });
      } else out.deploy = 'nothing pending';
    } catch (e) { out.deploy_fatal = String(e).slice(0, 300); }
  }
  out.ok = !out.listings_fatal && !out.welcomes_fatal && !out.deploy_fatal;
  return out;
}
