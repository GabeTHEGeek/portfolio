const CHUNK_TARGET_CHARACTERS = 1_400;
const CHUNK_OVERLAP_CHARACTERS = 240;
const EMBEDDING_DIMENSIONS = 768;

export function chunkDocument(content) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= CHUNK_TARGET_CHARACTERS) return [normalized];

  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_TARGET_CHARACTERS, normalized.length);
    if (end < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf('\n\n', end);
      const sentenceBreak = Math.max(
        normalized.lastIndexOf('. ', end),
        normalized.lastIndexOf('? ', end),
        normalized.lastIndexOf('! ', end)
      );
      const preferredBreak = Math.max(paragraphBreak, sentenceBreak);
      if (preferredBreak > start + CHUNK_TARGET_CHARACTERS * 0.55) end = preferredBreak + 1;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP_CHARACTERS, start + 1);
  }
  return chunks.filter(Boolean);
}

const normalizeVector = (values) => {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) throw new Error('Embedding vector has zero magnitude.');
  return values.map((value) => value / magnitude);
};

export async function embed(text, taskType, title) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001';
  if (!geminiKey) throw new Error('GEMINI_API_KEY is required.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(embeddingModel)}:embedContent`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        model: `models/${embeddingModel}`,
        taskType,
        ...(taskType === 'RETRIEVAL_DOCUMENT' && title ? { title } : {}),
        outputDimensionality: EMBEDDING_DIMENSIONS,
        content: { parts: [{ text }] }
      })
    }
  );
  const result = await response.json();
  if (!response.ok) throw new Error(`Gemini embedding failed (${response.status}): ${result.error?.message ?? 'unknown error'}`);
  const values = result.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected a ${EMBEDDING_DIMENSIONS}-dimension embedding.`);
  }
  return normalizeVector(values);
}
