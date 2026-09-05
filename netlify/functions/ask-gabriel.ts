import { askDeepSeek } from './_lib/deepseek';
import { retrieveDocumentChunks } from './_lib/documents';
import { logStage, safeErrorCode } from './_lib/observability';

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 10;
const requestLog = new Map<string, number[]>();

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    }
  });

export default async (request: Request) => {
  const trace = { requestId: request.headers.get('x-nf-request-id') ?? crypto.randomUUID() };
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Send a POST request.' }, 405, { allow: 'POST' });
  }

  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({ error: 'Content-Type must be application/json.' }, 415);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const honeypot = typeof body === 'object' && body !== null && 'website' in body
    ? (body as { website?: unknown }).website
    : undefined;
  if (typeof honeypot === 'string' && honeypot.trim()) {
    return json({ error: 'Request rejected.' }, 400);
  }

  const question = typeof body === 'object' && body !== null && 'question' in body
    ? (body as { question?: unknown }).question
    : undefined;
  if (typeof question !== 'string' || question.trim().length < MIN_QUESTION_LENGTH) {
    return json({ error: `Question must be at least ${MIN_QUESTION_LENGTH} characters.` }, 400);
  }
  if (question.trim().length > MAX_QUESTION_LENGTH) {
    return json({ error: `Question must be no more than ${MAX_QUESTION_LENGTH} characters.` }, 400);
  }

  const missingConfiguration = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'GEMINI_API_KEY', 'DEEPSEEK_API_KEY']
    .filter(name => !process.env[name]);
  if (missingConfiguration.length) {
    logStage(trace, 'configuration.failed', { error_code: 'MISSING_REQUIRED_ENV', missing_variable_count: missingConfiguration.length, rate_limited: false });
    return json({ error: 'Unable to retrieve portfolio knowledge.' }, 500);
  }
  logStage(trace, 'request.accepted', { question_length: question.trim().length });

  const clientAddress = request.headers.get('x-nf-client-connection-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  const now = Date.now();
  const recentRequests = (requestLog.get(clientAddress) ?? []).filter(time => now - time < RATE_LIMIT_WINDOW_MS);
  if (recentRequests.length >= RATE_LIMIT_REQUESTS) {
    logStage(trace, 'rate_limit.rejected', { rate_limited: true, limit: RATE_LIMIT_REQUESTS, window_ms: RATE_LIMIT_WINDOW_MS });
    return json({ error: 'Too many questions. Please wait a moment and try again.' }, 429, { 'retry-after': '60' });
  }
  recentRequests.push(now);
  requestLog.set(clientAddress, recentRequests);

  let chunks;
  try {
    chunks = await retrieveDocumentChunks(question.trim(), trace);
  } catch (error) {
    logStage(trace, 'request.failed', { stage: 'retrieval', error_code: safeErrorCode(error) });
    return json({ error: 'Unable to retrieve portfolio knowledge.' }, 500);
  }

  if (chunks.length === 0) {
    return json({
      error: 'No relevant documents were found.',
      answer: 'There is not enough information available to answer that.',
      sources: []
    }, 404);
  }

  try {
    const answer = await askDeepSeek(question.trim(), chunks, trace);
    const sources = [...new Map(chunks.map(chunk => [
      `${chunk.title}\u0000${chunk.source_url ?? ''}`,
      { title: chunk.title, url: chunk.source_url }
    ])).values()];
    logStage(trace, 'request.completed', { chunks_retrieved: chunks.length, sources_returned: sources.length });
    return json({
      answer,
      sources
    });
  } catch (error) {
    logStage(trace, 'request.failed', { stage: 'generation', error_code: safeErrorCode(error) });
    return json({ error: 'Unable to generate an answer right now.' }, 502);
  }
};
