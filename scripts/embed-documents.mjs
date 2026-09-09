import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';
import { chunkDocument, embed } from './embedding-pipeline.mjs';

export { chunkDocument, embed } from './embedding-pipeline.mjs';

export async function embedExistingDocuments() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey || !process.env.GEMINI_API_KEY) {
    throw new Error('SUPABASE_URL, SUPABASE_SECRET_KEY, and GEMINI_API_KEY are required.');
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, content, source_url, source_type, related_project')
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
        related_project: document.related_project,
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await embedExistingDocuments();
}
