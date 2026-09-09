import { createHash } from 'node:crypto';

export const GITHUB_APPROVAL_TOPIC = 'ask-gabriel';
export const GITHUB_SOURCE_TYPE = 'github-repository';
export const DEFAULT_GITHUB_USERNAME = 'GabeTHEGeek';
export const ALWAYS_INCLUDED_REPOSITORY_IDS = new Set([
  '1359721557', // GabeTHEGeek/ai-agent-starter-templates
  '1310191971', // GabeTHEGeek/maester
  '1353437174' // GabeTHEGeek/speakit
]);
export const EXCLUDED_REPOSITORIES = new Set([
  'gabethegeek/portfolio'
]);

const GITHUB_API_VERSION = '2026-03-10';
const MAX_README_CHARACTERS = 12_000;
const MAX_RELEASE_NOTES_CHARACTERS = 3_000;

const hashContent = (content) => createHash('sha256').update(content, 'utf8').digest('hex');
const normalizedName = (value) => String(value ?? '').trim().toLowerCase();
const normalizedUrl = (value) => String(value ?? '').trim().replace(/\/$/, '').toLowerCase();

export function cleanGitHubMarkdown(value, maxCharacters = MAX_README_CHARACTERS) {
  return String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxCharacters)
    .trim();
}

export function isApprovedRepository(repository) {
  const fullName = normalizedName(repository.full_name);
  const topics = Array.isArray(repository.topics) ? repository.topics.map(normalizedName) : [];
  return Boolean(
    repository
    && !repository.private
    && !repository.fork
    && !repository.archived
    && !repository.disabled
    && !EXCLUDED_REPOSITORIES.has(fullName)
    && (ALWAYS_INCLUDED_REPOSITORY_IDS.has(String(repository.id)) || topics.includes(GITHUB_APPROVAL_TOPIC))
  );
}

function githubHeaders(token, accept = 'application/vnd.github+json') {
  return {
    accept,
    'user-agent': 'ask-gabriel-knowledge-sync',
    'x-github-api-version': GITHUB_API_VERSION,
    ...(token ? { authorization: `Bearer ${token}` } : {})
  };
}

async function githubRequest(url, { token, accept, allowNotFound = false, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(url, {
    headers: githubHeaders(token, accept),
    signal: AbortSignal.timeout(15_000)
  });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const rateLimited = response.status === 403 || response.status === 429;
    throw new Error(`GitHub request failed (${response.status})${rateLimited ? ' RATE_LIMITED' : ''}`);
  }
  return response;
}

export async function discoverPublicRepositories({ username = DEFAULT_GITHUB_USERNAME, token, fetchImpl = fetch } = {}) {
  const repositories = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=${page}`;
    const response = await githubRequest(url, { token, fetchImpl });
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('GitHub repository discovery returned an invalid response.');
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  return repositories;
}

async function fetchReadme(repository, token, fetchImpl) {
  const response = await githubRequest(
    `https://api.github.com/repos/${repository.full_name}/readme`,
    { token, accept: 'application/vnd.github.raw+json', allowNotFound: true, fetchImpl }
  );
  return response ? response.text() : '';
}

async function fetchLatestRelease(repository, token, fetchImpl) {
  const response = await githubRequest(
    `https://api.github.com/repos/${repository.full_name}/releases/latest`,
    { token, allowNotFound: true, fetchImpl }
  );
  return response ? response.json() : null;
}

export function buildRepositoryDocument(repository, readme = '', release = null) {
  const topics = (repository.topics ?? [])
    .filter((topic) => normalizedName(topic) !== GITHUB_APPROVAL_TOPIC)
    .join(', ');
  const releaseNotes = release?.body
    ? cleanGitHubMarkdown(release.body, MAX_RELEASE_NOTES_CHARACTERS)
    : '';
  const sections = [
    `GitHub project: ${repository.name}`,
    repository.description ? `Description: ${repository.description.trim()}` : '',
    repository.language ? `Primary language: ${repository.language}` : '',
    topics ? `Topics: ${topics}` : '',
    repository.homepage ? `Public product URL: ${repository.homepage}` : '',
    repository.license?.name ? `License: ${repository.license.name}` : '',
    repository.created_at ? `Repository created: ${repository.created_at.slice(0, 10)}` : '',
    release ? [
      `Latest public release: ${release.name || release.tag_name}`,
      release.tag_name ? `Release tag: ${release.tag_name}` : '',
      release.published_at ? `Released: ${release.published_at.slice(0, 10)}` : '',
      releaseNotes
    ].filter(Boolean).join('\n') : '',
    cleanGitHubMarkdown(readme)
  ].filter(Boolean);
  return sections.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchRepositorySource(repository, token, fetchImpl) {
  const [readme, release] = await Promise.all([
    fetchReadme(repository, token, fetchImpl),
    fetchLatestRelease(repository, token, fetchImpl)
  ]);
  return buildRepositoryDocument(repository, readme, release);
}

async function replaceDocumentChunks({ supabase, documentId, repository, content, relatedProject, chunkDocument, embed }) {
  const chunks = chunkDocument(content);
  const embeddedChunks = [];
  for (const [chunkIndex, chunkContent] of chunks.entries()) {
    embeddedChunks.push({
      document_id: documentId,
      chunk_index: chunkIndex,
      content: chunkContent,
      title: `GitHub: ${repository.name}`,
      source_url: repository.html_url,
      source_type: GITHUB_SOURCE_TYPE,
      related_project: relatedProject,
      embedding: await embed(chunkContent, 'RETRIEVAL_DOCUMENT', `GitHub: ${repository.name}`)
    });
  }
  if (embeddedChunks.length) {
    const { error } = await supabase.from('document_chunks').upsert(embeddedChunks, {
      onConflict: 'document_id,chunk_index'
    });
    if (error) throw error;
  }
  const staleChunkQuery = supabase.from('document_chunks').delete().eq('document_id', documentId);
  const { error: staleChunkError } = embeddedChunks.length
    ? await staleChunkQuery.gte('chunk_index', embeddedChunks.length)
    : await staleChunkQuery;
  if (staleChunkError) throw staleChunkError;
  return { chunks: embeddedChunks.length, embeddings: embeddedChunks.length };
}

async function deactivateDocument(supabase, document, status, now) {
  const { error: updateError } = await supabase.from('documents').update({
    source_status: status,
    removed_at: document.removed_at ?? now,
    ...(status === 'removed' ? { last_seen_at: now } : {})
  }).eq('id', document.id);
  if (updateError) throw updateError;
  const { error: chunkError } = await supabase.from('document_chunks').delete().eq('document_id', document.id);
  if (chunkError) throw chunkError;
}

export async function runGitHubIngestion({
  supabase,
  chunkDocument,
  embed,
  username = DEFAULT_GITHUB_USERNAME,
  token,
  fetchImpl = fetch,
  logger = console
}) {
  const stats = {
    discovered: 0, approved: 0, unchanged: 0, changed: 0, updated: 0,
    chunks: 0, embeddings: 0, removed: 0, unavailable: 0, failures: 0
  };
  const repositories = await discoverPublicRepositories({ username, token, fetchImpl });
  stats.discovered = repositories.length;
  const approved = repositories.filter(isApprovedRepository);
  stats.approved = approved.length;
  const seenIds = new Set(repositories.map((repository) => String(repository.id)));
  const approvedIds = new Set(approved.map((repository) => String(repository.id)));

  const { data: projectDocuments, error: projectError } = await supabase
    .from('documents')
    .select('related_project, github_url')
    .eq('source_type', 'portfolio-project');
  if (projectError) throw projectError;
  const projectByGitHubUrl = new Map(
    (projectDocuments ?? []).filter((document) => document.related_project && document.github_url)
      .map((document) => [normalizedUrl(document.github_url), document.related_project])
  );
  const projectSlugs = new Set(
    (projectDocuments ?? []).map((document) => document.related_project).filter(Boolean)
  );

  const { data: existingDocuments, error: existingError } = await supabase
    .from('documents')
    .select('id, source_external_id, source_url, content_hash, source_status, removed_at')
    .eq('source_type', GITHUB_SOURCE_TYPE);
  if (existingError) throw existingError;

  const existingByExternalId = new Map(
    (existingDocuments ?? []).filter((document) => document.source_external_id)
      .map((document) => [document.source_external_id, document])
  );
  const existingByUrl = new Map((existingDocuments ?? []).map((document) => [document.source_url, document]));

  for (const repository of approved) {
    const externalId = String(repository.id);
    const now = new Date().toISOString();
    logger.log(`CHECK ${repository.full_name}`);
    try {
      const content = await fetchRepositorySource(repository, token, fetchImpl);
      const contentHash = hashContent(content);
      const existing = existingByExternalId.get(externalId) ?? existingByUrl.get(repository.html_url);
      const relatedProject = projectByGitHubUrl.get(normalizedUrl(repository.html_url))
        ?? (projectSlugs.has(normalizedName(repository.name)) ? normalizedName(repository.name) : null);
      const values = {
        title: `GitHub: ${repository.name}`,
        content,
        source_url: repository.html_url,
        source_type: GITHUB_SOURCE_TYPE,
        related_project: relatedProject,
        github_url: repository.html_url,
        source_external_id: externalId,
        source_status: 'active',
        source_updated_at: repository.updated_at,
        last_fetched_at: now,
        last_seen_at: now,
        removed_at: null
      };

      if (existing?.content_hash === contentHash && existing.source_status === 'active') {
        const { error } = await supabase.from('documents').update(values).eq('id', existing.id);
        if (error) throw error;
        const { error: chunkError } = await supabase.from('document_chunks').update({ related_project: relatedProject }).eq('document_id', existing.id);
        if (chunkError) throw chunkError;
        stats.unchanged += 1;
        logger.log(`UNCHANGED ${repository.full_name}`);
        continue;
      }

      stats.changed += 1;
      let documentId = existing?.id;
      if (documentId) {
        const { error } = await supabase.from('documents').update({ ...values, content_hash: contentHash }).eq('id', documentId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('documents').insert({
          ...values,
          content_hash: contentHash,
          last_changed_at: now
        }).select('id').single();
        if (error) throw error;
        documentId = data.id;
      }
      if (existing) {
        const { error } = await supabase.from('documents').update({ last_changed_at: now }).eq('id', documentId);
        if (error) throw error;
      }
      const result = await replaceDocumentChunks({
        supabase, documentId, repository, content, relatedProject, chunkDocument, embed
      });
      stats.updated += 1;
      stats.chunks += result.chunks;
      stats.embeddings += result.embeddings;
      logger.log(`UPDATED ${repository.full_name} (${result.chunks} chunks)`);
    } catch (error) {
      stats.failures += 1;
      logger.error(`FAILED ${repository.full_name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const document of existingDocuments ?? []) {
    if (!document.source_external_id || approvedIds.has(document.source_external_id)) continue;
    const status = seenIds.has(document.source_external_id) ? 'removed' : 'unavailable';
    if (document.source_status === status) continue;
    try {
      await deactivateDocument(supabase, document, status, new Date().toISOString());
      stats[status] += 1;
      logger.log(`${status.toUpperCase()} ${document.source_url ?? document.source_external_id}`);
    } catch (error) {
      stats.failures += 1;
      logger.error(`FAILED deactivation ${document.source_external_id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  logger.log(`SUMMARY ${JSON.stringify(stats)}`);
  return stats;
}
