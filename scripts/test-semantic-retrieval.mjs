import { createClient } from '@supabase/supabase-js';
import { embed } from './embed-documents.mjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});
const endpoint = process.env.ASK_GABRIEL_URL || 'http://localhost:8888/.netlify/functions/ask-gabriel';
const threshold = Number(process.env.ASK_GABRIEL_MATCH_THRESHOLD || 0.62);
const questions = process.argv.slice(2).length ? process.argv.slice(2) : [
  'What is Fleet Command?',
  'How does Fleet Command manage agent autonomy?',
  'What is Gabriel’s favorite restaurant?'
];

for (const question of questions) {
  const queryEmbedding = await embed(question, 'RETRIEVAL_QUERY');
  const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: 5
  });
  if (error) throw error;
  const bestSimilarity = chunks?.length ? Math.max(...chunks.map(chunk => Number(chunk.similarity))) : 0;
  const relevantChunks = (chunks ?? []).filter(chunk => Number(chunk.similarity) >= bestSimilarity - 0.08);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question })
  });
  const result = await response.json();

  console.log(`\nQUESTION: ${question}`);
  console.log('RETRIEVED CHUNKS:');
  if (!relevantChunks.length) console.log('  none above threshold');
  for (const chunk of relevantChunks) {
    const preview = chunk.content.replace(/\s+/g, ' ').slice(0, 180);
    console.log(`  ${chunk.title} [${chunk.chunk_index}] similarity=${Number(chunk.similarity).toFixed(4)}`);
    console.log(`    ${preview}${chunk.content.length > 180 ? '…' : ''}`);
  }
  console.log(`ANSWER (${response.status}): ${result.answer ?? result.error}`);
  console.log(`SOURCES: ${JSON.stringify(result.sources ?? [])}`);
}
