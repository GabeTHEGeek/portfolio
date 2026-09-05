import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chunkDocument, embed } from './embed-documents.mjs';
import { loadPortfolioSources } from './portfolio-sources.mjs';

for (const name of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'GEMINI_API_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});
const stats = { checked: 0, unchanged: 0, changed: 0, updated: 0, chunks: 0, embeddings: 0, failures: 0 };
const hashContent = (content) => createHash('sha256').update(content, 'utf8').digest('hex');

async function ingestSource(entry) {
  stats.checked += 1;
  console.log(`CHECK ${entry.key} <- ${entry.sourcePath}`);
  const contentHash = hashContent(entry.content);
  const fetchedAt = new Date().toISOString();
  const { data: existing, error: lookupError } = await supabase.from('documents').select('id, content_hash').eq('source_url', entry.sourceUrl).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.content_hash === contentHash) {
    const { error } = await supabase.from('documents').update({ last_fetched_at: fetchedAt }).eq('id', existing.id);
    if (error) throw error;
    stats.unchanged += 1;
    console.log(`UNCHANGED ${entry.key}`);
    return;
  }

  stats.changed += 1;
  const embeddedChunks = [];
  const chunks = chunkDocument(entry.content);
  for (const [chunkIndex, content] of chunks.entries()) {
    embeddedChunks.push({ chunk_index: chunkIndex, content, embedding: await embed(content, 'RETRIEVAL_DOCUMENT', entry.title) });
    stats.embeddings += 1;
  }
  const values = {
    title: entry.title, content: entry.content, source_url: entry.sourceUrl, source_type: entry.sourceType,
    content_hash: contentHash, last_fetched_at: fetchedAt, last_changed_at: fetchedAt
  };
  let documentId = existing?.id;
  if (documentId) {
    const { error } = await supabase.from('documents').update(values).eq('id', documentId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('documents').insert(values).select('id').single();
    if (error) throw error;
    documentId = data.id;
  }
  const rows = embeddedChunks.map((chunk) => ({ ...chunk, document_id: documentId, title: entry.title, source_url: entry.sourceUrl, source_type: entry.sourceType }));
  const { error: deleteError } = await supabase.from('document_chunks').delete().eq('document_id', documentId);
  if (deleteError) throw deleteError;
  if (rows.length) {
    const { error: insertError } = await supabase.from('document_chunks').insert(rows);
    if (insertError) throw insertError;
  }
  stats.updated += 1;
  stats.chunks += rows.length;
  console.log(`UPDATED ${entry.key} (${rows.length} chunks) -> ${entry.sourceUrl}`);
}

const sources = await loadPortfolioSources();
console.log(`Portfolio ingestion: ${sources.length} repository-backed sources`);
for (const entry of sources) {
  try { await ingestSource(entry); }
  catch (error) {
    stats.failures += 1;
    console.error(`FAILED ${entry.key}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log('\nSUMMARY');
console.log(`Sources checked: ${stats.checked}`);
console.log(`Unchanged sources: ${stats.unchanged}`);
console.log(`Changed sources: ${stats.changed}`);
console.log(`Documents updated: ${stats.updated}`);
console.log(`Chunks generated: ${stats.chunks}`);
console.log(`Embedding calls: ${stats.embeddings}`);
console.log(`Failures: ${stats.failures}`);
if (stats.failures) process.exitCode = 1;
