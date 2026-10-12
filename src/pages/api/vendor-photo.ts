export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret } from '../../lib/cron';
import { SB_URL, SB_KEY } from '../../lib/supabase';

// Vendor photo manager (dashboard Photos section).
// POST multipart/form-data (p_token, action, file, photo_id, ids) or JSON {p_token, action, image (base64 or data URL), photo_id, ids}.
// Actions: list, upload, delete, set_cover, reorder. Every action returns { ok, photos }.
// All checks live in public.ceg_vendor_photo (secret gated): token, verified account, 30 actions per hour,
// 6 gallery photos plus one cover. This endpoint adds the byte checks (magic bytes, 8 MB) and moves the
// file into p2-assets/vendors/{slug}/{uuid}.{ext} using a one time ticket the database mints.
const MAX_BYTES = 8 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'p2-assets';

function sniff(b: Uint8Array): { ext: string; ct: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', ct: 'image/jpeg' };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { ext: 'png', ct: 'image/png' };
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: 'webp', ct: 'image/webp' };
  return null;
}
const storageHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

export const POST: APIRoute = async ({ request }) => {
  let token = '', action = '', photoId: number | null = null, ids: number[] | null = null, bytes: Uint8Array | null = null;
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
      const fd = await request.formData();
      token = String(fd.get('p_token') || '');
      action = String(fd.get('action') || '');
      photoId = fd.get('photo_id') ? Number(fd.get('photo_id')) : null;
      if (fd.get('ids')) ids = JSON.parse(String(fd.get('ids')));
      const f = fd.get('file');
      if (f && typeof f !== 'string') bytes = new Uint8Array(await f.arrayBuffer());
    } else {
      const b: any = await request.json();
      token = String(b?.p_token || '');
      action = String(b?.action || '');
      photoId = b?.photo_id ? Number(b.photo_id) : null;
      ids = Array.isArray(b?.ids) ? b.ids : null;
      if (typeof b?.image === 'string' && b.image) {
        const raw = b.image.startsWith('data:') ? b.image.slice(b.image.indexOf(',') + 1) : b.image;
        bytes = new Uint8Array(Buffer.from(raw, 'base64'));
      }
    }
  } catch { return json({ ok: false, error: 'Could not read the request.' }, 400); }
  if (!UUID_RE.test(token)) return json({ ok: false, error: 'Please sign in again.' }, 401);
  if (!['list', 'upload', 'delete', 'set_cover', 'reorder'].includes(action)) return json({ ok: false, error: 'Unknown action.' }, 400);
  if (ids && (!Array.isArray(ids) || ids.length > 20 || !ids.every(n => Number.isInteger(Number(n))))) return json({ ok: false, error: 'Bad photo order.' }, 400);

  const call = (a: string, extra: Record<string, unknown> = {}) =>
    rpc<any>('ceg_vendor_photo', { p_secret: authSecret(), p_token: token, p_action: a, p_photo_id: photoId, p_ids: ids ? ids.map(Number) : null, ...extra });
  const out = (r: any) => (r && r.error) ? json({ ok: false, error: r.error }, r.code || 400) : json({ ok: true, photos: r.photos, max_gallery: r.max_gallery, ...(r.extra || {}) });

  try {
    if (action === 'upload') {
      if (!bytes || !bytes.length) return json({ ok: false, error: 'No photo was attached.' }, 400);
      if (bytes.length > MAX_BYTES) return json({ ok: false, error: 'That photo is larger than 8 MB.' }, 413);
      const kind = sniff(bytes);
      if (!kind) return json({ ok: false, error: 'Only JPEG, PNG or WebP photos can be uploaded.' }, 415);
      const t = await call('upload_ticket', { p_ext: kind.ext });
      if (t?.error) return out(t);
      const path: string = t.extra.path;
      const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { ...storageHeaders, 'Content-Type': kind.ct, 'Cache-Control': 'max-age=31536000', 'x-upsert': 'false' },
        body: bytes
      });
      if (!up.ok) { console.error('photo upload failed', up.status, (await up.text()).slice(0, 300)); return json({ ok: false, error: 'Upload failed. Please try again.' }, 502); }
      const c = await call('upload_commit', { p_path: path });
      if (c?.orphan) await removeObject(c.orphan, call);
      return out(c);
    }
    if (action === 'delete') {
      const r = await call('delete');
      if (r?.error) return out(r);
      if (r.extra?.path) await removeObject(r.extra.path, call);
      return out(r);
    }
    return out(await call(action));
  } catch (e) {
    console.error('vendor-photo', action, e);
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
  }
};

async function removeObject(path: string, call: (a: string, extra?: Record<string, unknown>) => Promise<any>) {
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE', headers: { ...storageHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] })
    });
    if (!r.ok) console.error('photo delete failed', r.status, (await r.text()).slice(0, 300));
    await call('delete_done', { p_path: path });
  } catch (e) { console.error('photo delete error', e); }
}

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
