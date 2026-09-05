# Ask Gabriel — Phase 4 semantic retrieval

Phase 4 keeps `documents` as the source of truth and adds `document_chunks` as a
derived semantic index. The public UI and response shape are unchanged.

## Migration

Run `supabase/document_chunks.sql` once in the Supabase SQL Editor. It:

- enables pgvector in the `extensions` schema;
- creates 768-dimension document embeddings with a foreign key to `documents`;
- preserves each chunk's title, source URL, source type, and sequence index;
- enables RLS without browser policies and grants access only to `service_role`;
- creates an HNSW cosine index and the `match_document_chunks` RPC.

The similarity RPC defaults to five chunks at or above `0.62`. The function
caps callers at ten chunks. Set `ASK_GABRIEL_MATCH_THRESHOLD` or
`ASK_GABRIEL_MATCH_COUNT` in Netlify only if evaluation shows a better cutoff.

## Embed the existing documents

With the existing server variables in `.env`, run:

```sh
npm run embed:documents
```

The script creates approximately 1,400-character chunks with 240 characters of
overlap, embeds them as `RETRIEVAL_DOCUMENT`, and replaces the derived chunks for
each document. It never changes the source `documents` rows. Run it manually
again after changing document content; automated ingestion is intentionally out
of scope.

`GEMINI_EMBEDDING_MODEL` is optional and defaults to
`gemini-embedding-001`. At 768 dimensions, that model's vectors are normalized
before storage. Questions use `RETRIEVAL_QUERY` embeddings from the same model.

## Inspect retrieval

Start `npx netlify dev`, then run:

```sh
npm run test:retrieval
```

The report prints each question, retrieved chunk title/index, similarity score,
content preview, final grounded answer, and returned sources. Override the endpoint
when testing production:

```sh
ASK_GABRIEL_URL=https://gabrielpendleton.me/.netlify/functions/ask-gabriel npm run test:retrieval
```
