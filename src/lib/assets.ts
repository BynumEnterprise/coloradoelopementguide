export const IMG = 'https://yucgsuzveabsgntlmste.supabase.co/storage/v1/object/public/p2-assets';
export const regionImg = (slug: string) => `${IMG}/${slug}.jpg`;

// Google Business Profile photo URLs default to small thumbnails (=w408-h272).
// Request a properly sized variant so heroes/cards render sharp.
export const gimg = (url: string | null, w: number, h: number) =>
  url ? url.replace(/=w\d+-h\d+-k-no.*$/, `=w${w}-h${h}-k-no`) : url;
