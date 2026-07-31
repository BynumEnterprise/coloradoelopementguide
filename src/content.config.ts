import { defineCollection, z } from 'astro:content';
import { SB_URL, SB_KEY } from './lib/supabase';

const vendors = defineCollection({
  loader: async () => {
    const r = await fetch(`${SB_URL}/rest/v1/p2_vendors?select=*&status=neq.removed&order=id&limit=1000`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    if (!r.ok) throw new Error(`Vendor fetch failed: ${r.status} — build aborted (schema gate)`);
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length < 50) throw new Error(`Vendor count suspiciously low (${rows?.length}) — build aborted`);
    return rows.map((v: any) => { const { id, ...rest } = v; return { ...rest, db_id: id, id: v.slug }; });
  },
  schema: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(['photographers','venues','florists','hair-makeup','officiants','planners']),
    sub_region: z.string().min(1),
    description: z.string().min(40),
    status: z.enum(['seeded','claimed','featured','removed']),
    address: z.string().nullable(), phone: z.string().nullable(),
    website: z.string().nullable(), domain: z.string().nullable(),
    rating: z.coerce.number().min(0).max(5).nullable(), reviews: z.number().nullable(),
    lat: z.coerce.number().nullable(), lng: z.coerce.number().nullable(),
    image_url: z.string().nullable(), google_category: z.string().nullable(),
    place_id: z.string().nullable(), source: z.string(), source_query: z.string()
  }).passthrough()
});
export const collections = { vendors };
