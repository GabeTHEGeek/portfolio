export const EMBEDDING_DIMENSIONS = 768;
export const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';

type EmbeddingResponse = {
  embedding?: { values?: number[] };
  error?: { message?: string };
};

const normalizeVector = (values: number[]) => {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) throw new Error('Embedding vector has zero magnitude.');
  return values.map(value => value / magnitude);
};

export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  title?: string
) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`,
    {
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
    }
  );

  const result = await response.json() as EmbeddingResponse;
  if (!response.ok) {
    console.error('Gemini embedding request failed:', response.status, result.error?.message ?? 'Unknown API error');
    throw new Error('Embedding request failed.');
  }

  const values = result.embedding?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding response did not contain ${EMBEDDING_DIMENSIONS} values.`);
  }

  // gemini-embedding-001 requires normalization at reduced dimensions. This is
  // harmless for models that already return a normalized vector.
  return normalizeVector(values);
}
