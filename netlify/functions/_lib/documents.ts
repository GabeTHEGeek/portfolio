import { embedText } from './embeddings';
import { getSupabaseAdmin, type Database } from './supabase';
import { logStage, safeErrorCode, type TraceContext } from './observability';

export type DocumentChunkMatch = Database['public']['Functions']['match_document_chunks']['Returns'][number];

const DEFAULT_MATCH_THRESHOLD = 0.62;
const DEFAULT_MATCH_COUNT = 5;
const RELATIVE_SCORE_WINDOW = 0.08;

const boundedNumber = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export async function retrieveDocumentChunks(question: string, trace: TraceContext) {
  const queryEmbedding = await embedText(question, 'RETRIEVAL_QUERY', undefined, trace);
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

  const startedAt = Date.now();
  logStage(trace, 'retrieval.started', { provider: 'supabase', match_threshold: matchThreshold, match_count: matchCount });
  let data;
  let error;
  try {
    ({ data, error } = await getSupabaseAdmin().rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    }));
  } catch (caught) {
    logStage(trace, 'retrieval.failed', { provider: 'supabase', error_code: safeErrorCode(caught), rate_limited: false, duration_ms: Date.now() - startedAt });
    throw caught;
  }

  if (error) {
    logStage(trace, 'retrieval.failed', { provider: 'supabase', error_code: safeErrorCode(error), rate_limited: false, duration_ms: Date.now() - startedAt });
    throw error;
  }
  const matches = data ?? [];
  if (!matches.length) {
    logStage(trace, 'retrieval.completed', { provider: 'supabase', chunks_retrieved: 0, duration_ms: Date.now() - startedAt });
    return [];
  }
  const bestSimilarity = Math.max(...matches.map(match => match.similarity));
  const relevantMatches = matches.filter(match => match.similarity >= bestSimilarity - RELATIVE_SCORE_WINDOW);
  logStage(trace, 'retrieval.completed', { provider: 'supabase', chunks_retrieved: relevantMatches.length, duration_ms: Date.now() - startedAt });
  return relevantMatches;
}
