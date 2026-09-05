# Ask Gabriel — Phase 1 data layer

Phase 1 adds only a server-side Supabase client, the `documents` schema, and a
temporary read-only Netlify verification function. It does not add a chat UI,
embeddings, vector search, ingestion, model providers, or scheduled jobs.

## Create the table

Open the Supabase dashboard for the project, choose **SQL Editor**, paste the
contents of `supabase/documents.sql`, and run it once. The script creates the
table, maintains `updated_at` on updates, and enables Row Level Security without
public policies.

## Environment variables

Create a local `.env` file from `.env.example` and set:

```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
```

Find both values in the Supabase project **Connect** dialog or under **Settings →
API Keys**. Use the current `sb_secret_...` server key. Never use a `PUBLIC_` or
`VITE_` prefix and never commit `.env`.

In Netlify, open **Project configuration → Environment variables**, add both
variables, and make them available to the **Functions** scope (or all scopes) for
the required deploy contexts. Redeploy after adding or changing them. Do not put
the secret in `netlify.toml`; variables declared there are not available to
functions at runtime.

## Test locally

Install the Netlify CLI if needed, then run:

```sh
npx netlify dev
```

Open `http://localhost:8888/.netlify/functions/documents-check`. A working empty
table returns:

```json
{"ok":true,"count":0,"documents":[]}
```

The endpoint returns at most five recent rows and intentionally omits `content`.
It is temporary and should be removed or protected before sensitive documents
are stored.

## Test the deployed function

After setting the Netlify variables and redeploying, open:

`https://gabrielpendleton.me/.netlify/functions/documents-check`

If it returns HTTP 500, review **Netlify → Logs & Metrics → Functions →
documents-check**. The public response never includes credentials or raw backend
errors.
