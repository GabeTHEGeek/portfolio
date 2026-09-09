import { embedText } from './embeddings';
import { getSupabaseAdmin, type Database } from './supabase';
import { logStage, safeErrorCode, type TraceContext } from './observability';

export type DocumentChunkMatch = Database['public']['Functions']['match_document_chunks']['Returns'][number];
export type AnswerSource = { title: string; url: string | null };

const DEFAULT_MATCH_THRESHOLD = 0.62;
const DEFAULT_MATCH_COUNT = 5;
const RELATIVE_SCORE_WINDOW = 0.08;

export function normalizeRetrievalQuestion(question: string) {
  const portfolioAlias = /\b(this (site|website|portfolio|page)|the portfolio|gabriel'?s (site|website|portfolio))\b/i;
  if (!portfolioAlias.test(question)) return question;
  return `${question}\nContext: The visitor is asking about Gabriel's portfolio website, what it represents, its design, or why Gabriel built it.`;
}

const boundedNumber = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export async function retrieveDocumentChunks(question: string, trace: TraceContext) {
  const queryEmbedding = await embedText(normalizeRetrievalQuestion(question), 'RETRIEVAL_QUERY', undefined, trace);
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

const sourcePriority: Record<string, number> = {
  'portfolio-project': 1,
  'portfolio-article': 2,
  'github-repository': 3
};

const uniqueSources = (sources: AnswerSource[]) => {
  const unique = new Map<string | null, AnswerSource>();
  for (const source of sources) {
    if (!unique.has(source.url)) unique.set(source.url, source);
  }
  return [...unique.values()];
};

export async function getAnswerSources(chunks: DocumentChunkMatch[], trace: TraceContext): Promise<AnswerSource[]> {
  const directSources = chunks
    .filter((chunk) => chunk.source_url)
    .map((chunk) => ({ title: chunk.title, url: chunk.source_url }));
  const relatedProjects = [...new Set(chunks.map((chunk) => chunk.related_project).filter(Boolean))] as string[];
  if (!relatedProjects.length) return uniqueSources(directSources);

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('documents')
      .select('title, source_url, source_type')
      .in('related_project', relatedProjects)
      .eq('source_status', 'active')
      .not('source_url', 'is', null);
    if (error) throw error;
    const relatedSources = (data ?? [])
      .sort((left, right) => (sourcePriority[left.source_type] ?? 9) - (sourcePriority[right.source_type] ?? 9))
      .map((document) => ({ title: document.title, url: document.source_url }));
    const sources = [...relatedSources, ...directSources];
    return uniqueSources(sources).slice(0, 8);
  } catch (error) {
    logStage(trace, 'sources.expansion_failed', { error_code: safeErrorCode(error) });
    return uniqueSources(directSources);
  }
}
