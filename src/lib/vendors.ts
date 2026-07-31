import { getCollection } from 'astro:content';
export async function allVendors() {
  const entries = await getCollection('vendors');
  const score = (v: any) => ((v.rating||0) * Math.log((v.reviews||0)+1)) + (v.status === 'featured' ? 1000 : 0);
  return entries.map(e => e.data as any).sort((a,b) => score(b) - score(a));
}
