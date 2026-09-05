import { embedText } from './embeddings';
import { getSupabaseAdmin, type Database } from './supabase';

export type DocumentChunkMatch = Database['public']['Functions']['match_document_chunks']['Returns'][number];

const DEFAULT_MATCH_THRESHOLD = 0.62;
const DEFAULT_MATCH_COUNT = 5;
const RELATIVE_SCORE_WINDOW = 0.08;

const boundedNumber = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export async function retrieveDocumentChunks(question: string) {
  const queryEmbedding = await embedText(question, 'RETRIEVAL_QUERY');
  const matchThreshold = boundedNumber(
    process.env.ASK_GABRIEL_MATCH_THRESHOLD,
    DEFAULT_MATCH_THRESHOLD,
    0,
    1
  );
  const matchCount = Math.round(boundedNumber(
    process.env.ASK_GABRIEL_MATCH_COUNT,
    DEFAULT_MATCH_COUNT,
    1,
    10
  ));

  const { data, error } = await getSupabaseAdmin().rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount
  });

  if (error) throw error;
  const matches = data ?? [];
  if (!matches.length) return [];
  const bestSimilarity = Math.max(...matches.map(match => match.similarity));
  return matches.filter(match => match.similarity >= bestSimilarity - RELATIVE_SCORE_WINDOW);
}
