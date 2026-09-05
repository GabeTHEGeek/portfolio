import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chunkDocument, embed } from './embed-documents.mjs';
import { PORTFOLIO_ALLOWLIST } from './portfolio-allowlist.mjs';
import { extractPortfolioPage } from './portfolio-extractor.mjs';

for (const name of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'GEMINI_API_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});
const stats = { checked: 0, unchanged: 0, changed: 0, updated: 0, chunks: 0, embeddings: 0, failures: 0 };
const hashContent = (content) => createHash('sha256').update(content, 'utf8').digest('hex');

async function fetchPage(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { 'user-agent': 'AskGabrielPortfolioIngest/1.0', accept: 'text/html' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) throw new Error('Response was not HTML');
  return response.text();
}

async function ingestPage(entry) {
  stats.checked += 1;
  console.log(`CHECK ${entry.url}`);
  const extracted = extractPortfolioPage(await fetchPage(entry.url), entry.url);
  const contentHash = hashContent(extracted.content);
  const fetchedAt = new Date().toISOString();
  const { data: existing, error: lookupError } = await supabase.from('documents').select('id, content_hash').eq('source_url', entry.url).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.content_hash === contentHash) {
    const { error } = await supabase.from('documents').update({ last_fetched_at: fetchedAt }).eq('id', existing.id);
    if (error) throw error;
    stats.unchanged += 1;
    console.log(`UNCHANGED ${entry.url}`);
    return;
  }

  stats.changed += 1;
  const embeddedChunks = [];
  const chunks = chunkDocument(extracted.content);
  for (const [chunkIndex, content] of chunks.entries()) {
    embeddedChunks.push({ chunk_index: chunkIndex, content, embedding: await embed(content, 'RETRIEVAL_DOCUMENT', extracted.title) });
    stats.embeddings += 1;
  }
  const values = {
    title: extracted.title, content: extracted.content, source_url: entry.url, source_type: entry.sourceType,
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
  const rows = embeddedChunks.map((chunk) => ({ ...chunk, document_id: documentId, title: extracted.title, source_url: entry.url, source_type: entry.sourceType }));
  const { error: deleteError } = await supabase.from('document_chunks').delete().eq('document_id', documentId);
  if (deleteError) throw deleteError;
  if (rows.length) {
    const { error: insertError } = await supabase.from('document_chunks').insert(rows);
    if (insertError) throw insertError;
  }
  stats.updated += 1;
  stats.chunks += rows.length;
  console.log(`UPDATED ${entry.url} (${rows.length} chunks)`);
}

console.log(`Portfolio ingestion: ${PORTFOLIO_ALLOWLIST.length} allowlisted URLs`);
for (const entry of PORTFOLIO_ALLOWLIST) {
  try { await ingestPage(entry); }
  catch (error) {
    stats.failures += 1;
    console.error(`FAILED ${entry.url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log('\nSUMMARY');
console.log(`URLs checked: ${stats.checked}`);
console.log(`Unchanged pages: ${stats.unchanged}`);
console.log(`Changed pages: ${stats.changed}`);
console.log(`Documents updated: ${stats.updated}`);
console.log(`Chunks generated: ${stats.chunks}`);
console.log(`Embedding calls: ${stats.embeddings}`);
console.log(`Failures: ${stats.failures}`);
if (stats.failures) process.exitCode = 1;
