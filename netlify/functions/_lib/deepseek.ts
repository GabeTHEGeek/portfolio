import type { DocumentChunkMatch } from './documents';
import { buildGroundedPrompt, GROUNDING_INSTRUCTIONS } from './grounding';
import { logStage, type TraceContext } from './observability';

export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

type DeepSeekResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string };
  }>;
  error?: { message?: string; type?: string; code?: string | number };
};

export async function askDeepSeek(question: string, chunks: DocumentChunkMatch[], trace: TraceContext) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
  if (!apiKey) {
    logStage(trace, 'generation.failed', { provider: 'deepseek', model, error_code: 'MISSING_DEEPSEEK_API_KEY', rate_limited: false });
    throw new Error('Missing DEEPSEEK_API_KEY.');
  }

  const startedAt = Date.now();
  logStage(trace, 'generation.started', { provider: 'deepseek', model, chunks_supplied: chunks.length });
  let response: Response;
  try {
    response = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: GROUNDING_INSTRUCTIONS },
          { role: 'user', content: buildGroundedPrompt(question, chunks) }
        ],
        thinking: { type: 'disabled' },
        temperature: 0.1,
        max_tokens: 280,
        stream: false
      })
    });
  } catch (error) {
    logStage(trace, 'generation.failed', { provider: 'deepseek', model, error_code: error instanceof Error ? error.name : 'NETWORK_ERROR', rate_limited: false, duration_ms: Date.now() - startedAt });
    throw error;
  }

  const result = await response.json() as DeepSeekResponse;
  if (!response.ok) {
    logStage(trace, 'generation.failed', {
      provider: 'deepseek', model, provider_http_status: response.status,
      error_code: result.error?.code ?? result.error?.type ?? 'DEEPSEEK_GENERATION_ERROR',
      rate_limited: response.status === 429, duration_ms: Date.now() - startedAt
    });
    throw new Error('DeepSeek request failed.');
  }

  const choice = result.choices?.[0];
  if (choice?.finish_reason === 'length') {
    logStage(trace, 'generation.failed', { provider: 'deepseek', model, provider_http_status: response.status, error_code: 'MAX_TOKENS', rate_limited: false, duration_ms: Date.now() - startedAt });
    throw new Error('DeepSeek returned a truncated answer.');
  }
  const answer = choice?.message?.content?.trim().replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');
  if (!answer) {
    logStage(trace, 'generation.failed', { provider: 'deepseek', model, provider_http_status: response.status, error_code: 'EMPTY_RESPONSE', rate_limited: false, duration_ms: Date.now() - startedAt });
    throw new Error('DeepSeek returned no text answer.');
  }

  logStage(trace, 'generation.completed', { provider: 'deepseek', model, provider_http_status: response.status, duration_ms: Date.now() - startedAt });
  return answer;
}
