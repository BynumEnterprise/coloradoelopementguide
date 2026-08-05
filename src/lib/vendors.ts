import { getCollection } from 'astro:content';
export async function allVendors() {
  const entries = await getCollection('vendors');
  const bigBox = (v: any) => /conference|marriott|hyatt|hilton|doubletree|embassy suites/i.test(v.name||'') || ['Hotel','Resort hotel'].includes(v.google_category||'');
  const score = (v: any) => ((v.rating||0) * Math.log((v.reviews||0)+1)) * (bigBox(v) ? 0.35 : 1) + (v.status === 'featured' ? 1000 : 0);
  return entries.map(e => e.data as any).sort((a,b) => score(b) - score(a));
}
