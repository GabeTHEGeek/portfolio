export const EMBEDDING_DIMENSIONS = 768;
export const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';

type EmbeddingResponse = {
  embedding?: { values?: number[] };
  error?: { message?: string; status?: string; code?: number };
};

const normalizeVector = (values: number[]) => {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) throw new Error('Embedding vector has zero magnitude.');
  return values.map(value => value / magnitude);
};

export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  title?: string,
  trace?: TraceContext
) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
  if (!apiKey) {
    if (trace) logStage(trace, 'embedding.failed', { provider: 'gemini', error_code: 'MISSING_GEMINI_API_KEY', rate_limited: false });
    throw new Error('Missing GEMINI_API_KEY.');
  }

  const startedAt = Date.now();
  if (trace) logStage(trace, 'embedding.started', { provider: 'gemini', model, task_type: taskType });

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        model: `models/${model}`,
        taskType,
        ...(taskType === 'RETRIEVAL_DOCUMENT' && title ? { title } : {}),
        outputDimensionality: EMBEDDING_DIMENSIONS,
        content: { parts: [{ text }] }
      })
    });
  } catch (error) {
    if (trace) logStage(trace, 'embedding.failed', { provider: 'gemini', model, error_code: error instanceof Error ? error.name : 'NETWORK_ERROR', rate_limited: false, duration_ms: Date.now() - startedAt });
    throw error;
  }

  const result = await response.json() as EmbeddingResponse;
  if (!response.ok) {
    if (trace) logStage(trace, 'embedding.failed', {
      provider: 'gemini', model, provider_http_status: response.status,
      error_code: result.error?.status ?? result.error?.code ?? 'GEMINI_EMBEDDING_ERROR', rate_limited: response.status === 429,
      duration_ms: Date.now() - startedAt
    });
    throw new Error('Embedding request failed.');
  }

  const values = result.embedding?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    if (trace) logStage(trace, 'embedding.failed', { provider: 'gemini', model, provider_http_status: response.status, error_code: 'INVALID_EMBEDDING_RESPONSE', rate_limited: false, duration_ms: Date.now() - startedAt });
    throw new Error(`Embedding response did not contain ${EMBEDDING_DIMENSIONS} values.`);
  }

  if (trace) logStage(trace, 'embedding.completed', { provider: 'gemini', model, provider_http_status: response.status, dimensions: values.length, duration_ms: Date.now() - startedAt });

  // gemini-embedding-001 requires normalization at reduced dimensions. This is
  // harmless for models that already return a normalized vector.
  return normalizeVector(values);
}
import { logStage, type TraceContext } from './observability';
