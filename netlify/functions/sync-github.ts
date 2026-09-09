import { createClient } from '@supabase/supabase-js';
// Shared with the local ingestion command so production and local runs cannot drift.
import { runGitHubIngestion } from '../../scripts/github-ingestion.mjs';
import { chunkDocument, embed } from '../../scripts/embedding-pipeline.mjs';

export default async () => {
  const required = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'GEMINI_API_KEY'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(JSON.stringify({ service: 'github-knowledge-sync', event: 'configuration.failed', missing_count: missing.length }));
    throw new Error('GitHub knowledge sync configuration is incomplete.');
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const logger = Object.create(console) as Console;
  logger.log = (message: string) => console.log(JSON.stringify({ service: 'github-knowledge-sync', event: 'sync.progress', message }));
  logger.error = (message: string) => console.error(JSON.stringify({ service: 'github-knowledge-sync', event: 'sync.error', message }));
  console.log(JSON.stringify({ service: 'github-knowledge-sync', event: 'sync.started' }));
  const stats = await runGitHubIngestion({
    supabase,
    chunkDocument,
    embed,
    username: process.env.GITHUB_USERNAME || 'GabeTHEGeek',
    token: process.env.GITHUB_TOKEN,
    logger
  });
  console.log(JSON.stringify({ service: 'github-knowledge-sync', event: 'sync.completed', ...stats }));
  if (stats.failures) throw new Error(`GitHub knowledge sync completed with ${stats.failures} failure(s).`);
};

// Runs daily at midnight UTC. Netlify displays this function and its logs in the Functions panel.
export const config = {
  schedule: '@daily'
};
