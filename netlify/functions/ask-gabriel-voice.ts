const MAX_TEXT_LENGTH = 1200;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const requestLog = new Map<string, number[]>();

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'JSON required.' }, 415);
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_KEY;
  if (!apiKey) return json({ error: 'Voice provider is not configured.' }, 503);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const text = typeof body === 'object' && body !== null && 'text' in body ? (body as { text?: unknown }).text : null;
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) return json({ error: 'Invalid speech text.' }, 400);

  const client = request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const recent = (requestLog.get(client) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return json({ error: 'Voice rate limit reached.' }, 429);
  recent.push(now); requestLog.set(client, recent);

  const customVoiceId = process.env.OPENAI_TTS_VOICE_ID?.trim();
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts',
      voice: customVoiceId ? { id: customVoiceId } : (process.env.OPENAI_TTS_VOICE?.trim() || 'cedar'),
      input: text.trim(),
      instructions: 'Speak warmly, naturally, and concisely. This is an AI-generated voice for Gabriel’s digital counterpart.',
      response_format: 'mp3'
    })
  });
  if (!response.ok || !response.body) return json({ error: 'Voice generation failed.' }, response.status === 429 ? 429 : 502);
  return new Response(response.body, { status: 200, headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
};
