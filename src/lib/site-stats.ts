import { getCollection } from 'astro:content';
import { allVendors } from './vendors';
import { REGIONS, CATEGORIES } from './taxonomy';

// Build time counts for About and Press. Computed from the same data the site renders.
export async function siteStats() {
  const vendors = await allVendors();
  const guides = (await getCollection('guides')).filter((g: any) => g.data.region in REGIONS && g.data.region !== 'other-colorado');
  const resources = await getCollection('resources');
  const regions = Object.keys(REGIONS).filter(r => r !== 'other-colorado');
  return {
    vendors: vendors.length,
    regions: regions.length,
    regionNames: regions.map(r => REGIONS[r].name),
    categories: Object.keys(CATEGORIES).length,
    categoryNames: Object.values(CATEGORIES).map(c => c.name),
    guides: guides.length,
    resources: resources.length,
    built: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' }),
  };
}
