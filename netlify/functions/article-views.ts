import { getSupabaseAdmin } from './_lib/supabase';
import { isValidArticleSlug } from './_lib/article-views';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

export default async (request: Request) => {
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);

  let slug: unknown = new URL(request.url).searchParams.get('slug');
  if (request.method === 'POST') {
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'JSON required.' }, 415);
    try {
      const body = await request.json();
      slug = typeof body === 'object' && body !== null && 'slug' in body ? (body as { slug?: unknown }).slug : null;
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
  }
  if (!isValidArticleSlug(slug)) return json({ error: 'Invalid article slug.' }, 400);

  try {
    const supabase = getSupabaseAdmin();
    if (request.method === 'POST') {
      const { data, error } = await supabase.rpc('increment_article_view', { p_slug: slug });
      if (error) throw error;
      return json({ views: Number(data ?? 0) });
    }

    const { data, error } = await supabase
      .from('article_views')
      .select('view_count')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return json({ views: Number(data?.view_count ?? 0) });
  } catch (error) {
    console.error(JSON.stringify({ service: 'article-views', event: 'request.failed', error: error instanceof Error ? error.name : 'unknown' }));
    return json({ error: 'View count unavailable.' }, 503);
  }
};
