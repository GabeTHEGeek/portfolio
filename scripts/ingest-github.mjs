import { createClient } from '@supabase/supabase-js';
import { chunkDocument, embed } from './embed-documents.mjs';
import { runGitHubIngestion } from './github-ingestion.mjs';

for (const name of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'GEMINI_API_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

const stats = await runGitHubIngestion({
  supabase,
  chunkDocument,
  embed,
  username: process.env.GITHUB_USERNAME || 'GabeTHEGeek',
  token: process.env.GITHUB_TOKEN
});

if (stats.failures) process.exitCode = 1;
