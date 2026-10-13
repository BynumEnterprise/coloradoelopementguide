import { getCollection } from 'astro:content';
export async function allVendors() {
  const entries = await getCollection('vendors');
  const bigBox = (v: any) => /conference|marriott|hyatt|hilton|doubletree|embassy suites/i.test(v.name||'') || ['Hotel','Resort hotel'].includes(v.google_category||'');
  const score = (v: any) => ((v.rating||0) * Math.log((v.reviews||0)+1)) * (bigBox(v) ? 0.35 : 1) + (v.status === 'featured' ? (v.featured_source === 'trial' ? 1000 : 2000) : 0);
  return entries.map(e => e.data as any).sort((a,b) => score(b) - score(a));
}

// Profile facets (mirrors _ceg_styles in the database; keep both lists in sync).
export const STYLE_OPTIONS: Record<string, string[]> = {
  'photographers': ['adventure','documentary','editorial','film','light and airy','moody'],
  'venues': ['mountain views','rustic','modern','historic','lodge','outdoor ceremony','intimate'],
  'florists': ['wildflower','garden','modern','minimalist','dried','romantic'],
  'hair-makeup': ['natural','glam','editorial','airbrush','on location','bridal party'],
  'officiants': ['nonreligious','religious','spiritual','personalized','bilingual','adventure'],
  'planners': ['full planning','elopement packages','day of coordination','adventure','luxury','destination']
};
export const PRICE_BUCKETS: { id: string; label: string; min: number; max: number }[] = [
  { id: 'u1500', label: 'Under $1,500', min: 0, max: 1499 },
  { id: '1500-3500', label: '$1,500 to $3,500', min: 1500, max: 3500 },
  { id: '3500-6000', label: '$3,500 to $6,000', min: 3501, max: 6000 },
  { id: '6000p', label: '$6,000 plus', min: 6001, max: Infinity },
  { id: 'none', label: 'Price not listed', min: -1, max: -1 }
];
export const money = (n: number) => '$' + Number(n).toLocaleString('en-US');
export const servedRegions = (v: any): string[] => (Array.isArray(v.served_regions) ? v.served_regions : []).filter((r: string) => r && r !== v.sub_region && r !== 'other-colorado');
// Compact facet record embedded on listing pages for the client side filter.
export function facet(v: any, i: number) {
  return { s: v.slug, c: v.category, r: v.sub_region, sr: servedRegions(v), p: Number.isFinite(v.starting_price) ? v.starting_price : null,
    st: Array.isArray(v.styles) ? v.styles : [], ph: !!v.image_url, rt: v.rating ? Number(v.rating) : 0, rv: v.reviews || 0, i, f: v.status === 'featured' };
}
// Reply time badge from p2_vendors.reply_median_hours (median over the last 90 days, set only when at least
// two inquiries were marked replied). Returns null when the data does not support a claim.
export function replyBadge(v: any): string | null {
  const n = Number(v.reply_sample), h = Number(v.reply_median_hours);
  if (!(n >= 2) || !Number.isFinite(h) || h < 0) return null;
  if (h <= 4) return 'Usually replies within a few hours';
  if (h <= 24) return 'Usually replies within a day';
  if (h <= 72) return 'Usually replies within 3 days';
  return null;
}
// "October 2026" from p2_vendors.checked_at, or null to hide the line.
export function checkedLabel(v: any): string | null {
  const s = typeof v.checked_at === 'string' ? v.checked_at.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
