# Ask Gabriel — Phase 2 grounded-answer proof

Phase 2 adds one server-side endpoint:

`POST /.netlify/functions/ask-gabriel`

It validates a question, retrieves up to 50 records from Supabase, ranks them
locally by title/content keyword overlap, supplies the five most relevant records
to Gemini, and returns an answer plus sources. This intentionally does not use
embeddings or vector search.

## Environment

Add these lines to the local `.env` file used in Phase 1:

```dotenv
GEMINI_API_KEY=your-gemini-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
```

Gemini remains responsible for embeddings. DeepSeek handles grounded answer generation; `DEEPSEEK_MODEL` is optional and defaults to `deepseek-v4-flash`.
Neither variable is included in browser code. In Netlify, add `GEMINI_API_KEY`
under **Project configuration → Environment variables** with **Functions** scope
(or all scopes) and redeploy. Add `DEEPSEEK_MODEL` there only to override the default.

## Test

Run `npx netlify dev`, then in a second terminal run:

```sh
curl -i -X POST http://localhost:8888/.netlify/functions/ask-gabriel \
  -H 'Content-Type: application/json' \
  --data '{"question":"What is Fleet Command?"}'
```

For production, replace the URL with:

`https://gabrielpendleton.me/.netlify/functions/ask-gabriel`

A grounded success response has HTTP 200, a concise answer supported by the
retrieved Fleet Command content, and source objects pointing to those documents.
If no relevant evidence exists, the endpoint returns HTTP 404 and explicitly says
there is not enough information available.

This endpoint is intentionally a minimal public proof mechanism. It has no
conversation memory, UI, analytics, ingestion, embeddings, or vector search.
