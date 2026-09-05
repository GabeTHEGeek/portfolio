import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

const CHUNK_TARGET_CHARACTERS = 1_400;
const CHUNK_OVERLAP_CHARACTERS = 240;
const EMBEDDING_DIMENSIONS = 768;
const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SECRET_KEY, and GEMINI_API_KEY are required.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

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
  return values.map(value => value / magnitude);
};

export async function embed(text, taskType, title) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(embeddingModel)}:embedContent`,
    {
      method: 'POST',
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

export async function embedExistingDocuments() {
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, content, source_url, source_type')
    .order('id');
  if (error) throw error;

  let totalChunks = 0;
  for (const document of documents ?? []) {
    const chunks = chunkDocument(document.content);
    const rows = [];
    for (const [chunkIndex, content] of chunks.entries()) {
      process.stdout.write(`Embedding ${document.title} chunk ${chunkIndex + 1}/${chunks.length}... `);
      const embedding = await embed(content, 'RETRIEVAL_DOCUMENT', document.title);
      rows.push({
        document_id: document.id,
        chunk_index: chunkIndex,
        content,
        title: document.title,
        source_url: document.source_url,
        source_type: document.source_type,
        embedding
      });
      console.log('done');
    }

    const { error: deleteError } = await supabase.from('document_chunks').delete().eq('document_id', document.id);
    if (deleteError) throw deleteError;
    if (rows.length) {
      const { error: insertError } = await supabase.from('document_chunks').insert(rows);
      if (insertError) throw insertError;
    }
    totalChunks += rows.length;
  }
  console.log(`Embedded ${documents?.length ?? 0} documents into ${totalChunks} chunks.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await embedExistingDocuments();
}
