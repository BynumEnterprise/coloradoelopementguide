export const prerender = false;
import type { APIRoute } from 'astro';
export const POST: APIRoute = async () => {
  try { await fetch('https://api.vercel.com/v1/integrations/deploy/prj_CF46WLPLbBDSSSbCJjqIirkFxSSw/luIn2nQKtt', { method: 'POST' }); } catch { /* noop */ }
  return new Response('ok');
};
