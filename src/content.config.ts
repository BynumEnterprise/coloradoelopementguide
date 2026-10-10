import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { SB_URL, SB_KEY } from './lib/supabase';

const vendors = defineCollection({
  loader: async () => {
    const r = await fetch(`${SB_URL}/rest/v1/p2_vendors?select=*&status=in.(seeded,claimed,featured)&order=id&limit=1000`, {
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
const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    region: z.string().min(1),
    title: z.string().min(1),
    headline: z.string().min(1),
    dek: z.string().min(40),
    description: z.string().min(60).max(170),
    datePublished: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    facts: z.object({
      license: z.string(),
      permit: z.string(),
      season: z.string(),
      airport: z.string()
    })
  })
});
const resources = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/resources' }),
  schema: z.object({
    title: z.string().min(1),
    headline: z.string().min(1),
    dek: z.string().min(40),
    description: z.string().min(60).max(160),
    datePublished: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    kind: z.enum(['permits', 'legal', 'budget', 'planning']),
    hero: z.string().min(1),
    regions: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    facts: z.array(z.object({ label: z.string(), value: z.string() })).length(4),
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).min(1)
  })
});
export const collections = { vendors, guides, resources };
