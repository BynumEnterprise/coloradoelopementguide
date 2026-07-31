import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const vendors = defineCollection({
  loader: file('src/data/vendors.json'),
  schema: z.object({
    id: z.number().optional(),
    slug: z.string().min(1),
    place_id: z.string().nullable(),
    name: z.string().min(1),
    category: z.enum(['photographers','venues','florists','hair-makeup','officiants','planners']),
    google_category: z.string().nullable(),
    sub_region: z.string().min(1),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    website: z.string().nullable(),
    domain: z.string().nullable(),
    rating: z.number().min(0).max(5).nullable(),
    reviews: z.number().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    image: z.string().nullable(),
    description: z.string().min(40),
    source: z.string(),
    source_query: z.string(),
    is_claimed_gmb: z.boolean().nullable().optional()
  })
});
export const collections = { vendors };
