import { getSupabaseAdmin, type Database } from './supabase';

export type DocumentRow = Database['public']['Tables']['documents']['Row'];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'did', 'do', 'does', 'for',
  'from', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the',
  'to', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'with'
]);

const normalize = (value: string) => value
  .toLocaleLowerCase('en-US')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const tokensFor = (value: string) => [...new Set(
  normalize(value).split(' ').filter(token => token.length >= 2 && !STOP_WORDS.has(token))
)];

const occurrences = (text: string, term: string) => {
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(term, index)) !== -1) {
    count += 1;
    index += term.length;
  }
  return count;
};

export function rankDocuments(question: string, documents: DocumentRow[]) {
  const tokens = tokensFor(question);
  if (tokens.length === 0) return [];
  const phrase = tokens.join(' ');

  return documents
    .map(document => {
      const title = normalize(document.title);
      const content = normalize(document.content);
      let score = 0;
      for (const token of tokens) {
        score += occurrences(title, token) * 8;
        score += Math.min(occurrences(content, token), 8);
      }
      if (tokens.length > 1 && title.includes(phrase)) score += 20;
      if (tokens.length > 1 && content.includes(phrase)) score += 6;
      return { document, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || b.document.updated_at.localeCompare(a.document.updated_at))
    .slice(0, 5)
    .map(result => result.document);
}

export async function retrieveDocuments(question: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, content, source_url, source_type, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return rankDocuments(question, data ?? []);
}
