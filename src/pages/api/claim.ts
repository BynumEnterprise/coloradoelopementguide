export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const slug = String(form.get('vendor_slug') || '');
  const name = String(form.get('name') || '').slice(0, 200);
  const email = String(form.get('email') || '').slice(0, 200);
  const message = String(form.get('message') || '').slice(0, 2000);
  if (!slug || !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect('/claim?e=invalid', 303);
  let vendorId: number | null = null;
  if (slug !== '__not_listed__') {
    const r = await fetch(`${SB_URL}/rest/v1/p2_vendors?slug=eq.${encodeURIComponent(slug)}&select=id`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    const rows = await r.json();
    vendorId = rows?.[0]?.id ?? null;
  }
  await fetch(`${SB_URL}/rest/v1/p2_claims`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ vendor_id: vendorId, claimant_name: name, claimant_email: email, message: slug === '__not_listed__' ? `[NEW LISTING REQUEST] ${message}` : message })
  });
  return redirect('/thanks?claim=1', 303);
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
