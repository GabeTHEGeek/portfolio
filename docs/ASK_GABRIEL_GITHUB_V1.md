# Ask Gabriel: GitHub knowledge sync V1

Ask Gabriel checks Gabriel's public GitHub repositories once daily. The existing
portfolio ingestion and public interface are unchanged.

## Approval rules

The first three approved repositories are included directly using their stable
GitHub repository IDs, so they remain approved if their names or URLs change:

- `GabeTHEGeek/ai-agent-starter-templates`
- `GabeTHEGeek/maester`
- `GabeTHEGeek/speakit`

Future public repositories are discovered automatically when they have the
GitHub topic `ask-gabriel`. The portfolio repository is always excluded because
its source files already use the portfolio ingestion pipeline. Forks, archived
repositories, disabled repositories, private repositories, and repositories
without approval are not ingested.

BrandCompanions is not included.

## Data used

For an approved repository, V1 reads only its public repository name,
description, primary language, topics, homepage, license, creation date, README,
and latest public release. It does not ingest source files, commits, issues, pull
requests, discussions, stars, or forks.

README and release text are untrusted knowledge. Code blocks, images, badges, and
HTML are removed before indexing, and Ask Gabriel's existing grounding rules
continue to ignore instructions inside retrieved content.

## Apply the migration

Run `supabase/github_ingestion.sql` once in the Supabase SQL Editor. It adds the
stable external repository ID and lifecycle fields used to handle repository
renames, removals, and approval changes.

Run `supabase/source_relationships.sql` once as well. It adds the project key
used to group a portfolio project page, its related articles, and its GitHub
repository as companion citations.

## Relate articles in Decap

Writing entries have an optional **Related project** selector. Selecting a
project is the only relationship management required when publishing an
article. Project entries continue using their existing **GitHub URL** field.
After portfolio ingestion, Ask Gabriel uses those two values to return the
project page, related articles, and GitHub repository together when relevant.

## Environment variables

The sync reuses `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `GEMINI_API_KEY`.

`GITHUB_USERNAME` is optional and defaults to `GabeTHEGeek`. `GITHUB_TOKEN` is
also optional because V1 reads only public data. A read-only token increases
GitHub's request limit and should be stored as a secret if added.

## Run manually

After applying the migration, run:

```sh
npm run ingest:github
```

The command reports discovered, approved, unchanged, updated, removed,
unavailable, chunk, embedding, and failure counts. One repository failure does
not prevent the remaining approved repositories from processing.

## Daily production run

`sync-github` is a Netlify Scheduled Function and runs at midnight UTC on
published production deploys. It can also be selected in Netlify's Functions
panel and run manually. Netlify Dev does not execute schedules automatically.

The first production run should happen after applying the migration. Running
the local command once first is recommended because it creates the initial
embeddings outside the scheduled function's execution window.

## Rename and removal behavior

Repositories are tracked using GitHub's stable repository ID. A rename updates
the URL and title without creating duplicate knowledge. If an ingested
repository loses approval, becomes archived, is deleted, becomes private, or is
transferred away, its document is retained but marked inactive and its chunks
are removed from public retrieval. If it becomes public and approved again, the
same record is reactivated and re-embedded.
