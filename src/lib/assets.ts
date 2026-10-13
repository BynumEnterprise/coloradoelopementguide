export const IMG = 'https://yucgsuzveabsgntlmste.supabase.co/storage/v1/object/public/p2-assets';
export const regionImg = (slug: string) => `${IMG}/${slug}.jpg`;

// Google Business Profile photo URLs default to small thumbnails (=w408-h272).
// Request a properly sized variant so heroes/cards render sharp.
export const gimg = (url: string | null, w: number, h: number) =>
  url ? url.replace(/=w\d+-h\d+-k-no.*$/, `=w${w}-h${h}-k-no`) : url;

// Image resizing hook. Vercel Image Optimization was considered (QA pass 2026-10-13) but the Hobby plan caps
// transformations per month and images fail once the cap is hit, so opt() returns the original URL and
// optSet() emits no srcset. Call sites stay in place so resizing can be switched on later in one file.
export const opt = (url: string | null | undefined, _w?: number, _q = 70) => (url ?? undefined) as any;
export const optSet = (_url: string | null | undefined, _widths: number[], _q = 70): string | undefined => undefined;
