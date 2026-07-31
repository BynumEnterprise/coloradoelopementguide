import { getCollection } from 'astro:content';
export async function allVendors() {
  const entries = await getCollection('vendors');
  return entries.map(e => e.data).sort((a,b) => ((b.rating||0)*Math.log((b.reviews||0)+1)) - ((a.rating||0)*Math.log((a.reviews||0)+1)));
}
