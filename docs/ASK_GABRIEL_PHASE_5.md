# Ask Gabriel Phase 5: Portfolio ingestion

The ingestion job fetches only the URLs in `scripts/portfolio-allowlist.mjs`. It does not discover or crawl links.

## Run the migration

Apply `supabase/portfolio_ingestion.sql` once in the Supabase SQL editor. It adds content-change metadata to `documents` and grants the server role the writes required by ingestion.

## Run ingestion

With the existing server-only variables in `.env`:

```sh
npm run ingest:portfolio
```

The command reports checked, changed, unchanged, updated, chunk, embedding, and failure counts. Each page is isolated: a failed URL is reported while the remaining allowlisted pages continue.

Normalized content is SHA-256 hashed. Unchanged pages update only `last_fetched_at`; their documents and chunks are not rewritten and Gemini is not called for embeddings.

Fetched HTML is untrusted input. The extractor keeps meaningful text from `<main>`, excludes navigation, footers, scripts, styles, asides, controls, and known decorative interface labels, and never evaluates page scripts or follows instructions in page content.
