// Vendor uploaded photos (p2_vendor_photos), fetched once per build and grouped by vendor id.
// Public read is allowed by RLS for live vendors. A failed fetch only hides galleries; it never aborts the build.
import { SB_URL, SB_KEY } from './supabase';

export type VendorPhoto = { id: number; vendor_id: number; url: string; sort: number; is_cover: boolean };
let cache: Promise<Map<number, VendorPhoto[]>> | null = null;

export function vendorPhotos(): Promise<Map<number, VendorPhoto[]>> {
  if (!cache) cache = (async () => {
    const m = new Map<number, VendorPhoto[]>();
    try {
      const r = await fetch(`${SB_URL}/rest/v1/p2_vendor_photos?select=id,vendor_id,url,sort,is_cover&order=vendor_id,sort,id&limit=5000`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
      });
      if (!r.ok) { console.warn(`vendor photos fetch failed: ${r.status}`); return m; }
      for (const p of (await r.json()) as VendorPhoto[]) {
        if (!m.has(p.vendor_id)) m.set(p.vendor_id, []);
        m.get(p.vendor_id)!.push(p);
      }
    } catch (e) { console.warn('vendor photos fetch error', e); }
    return m;
  })();
  return cache;
}
