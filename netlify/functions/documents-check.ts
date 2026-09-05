import { getSupabaseAdmin } from './_lib/supabase';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

export default async (request: Request) => {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, count, error } = await supabase
      .from('documents')
      .select('id, title, source_url, source_type, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    return json({
      ok: true,
      count: count ?? 0,
      documents: data ?? []
    });
  } catch (error) {
    console.error('Supabase documents check failed:', error);
    return json({
      ok: false,
      error: 'Unable to read the documents table. Check the function logs.'
    }, 500);
  }
};
