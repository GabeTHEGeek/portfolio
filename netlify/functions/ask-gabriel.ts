import { askGemini } from './_lib/gemini';
import { retrieveDocuments } from './_lib/documents';

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 500;

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

  const question = typeof body === 'object' && body !== null && 'question' in body
    ? (body as { question?: unknown }).question
    : undefined;
  if (typeof question !== 'string' || question.trim().length < MIN_QUESTION_LENGTH) {
    return json({ error: `Question must be at least ${MIN_QUESTION_LENGTH} characters.` }, 400);
  }
  if (question.trim().length > MAX_QUESTION_LENGTH) {
    return json({ error: `Question must be no more than ${MAX_QUESTION_LENGTH} characters.` }, 400);
  }

  let documents;
  try {
    documents = await retrieveDocuments(question.trim());
  } catch (error) {
    console.error('Ask Gabriel retrieval failed:', error);
    return json({ error: 'Unable to retrieve portfolio knowledge.' }, 500);
  }

  if (documents.length === 0) {
    return json({
      error: 'No relevant documents were found.',
      answer: 'There is not enough information available to answer that.',
      sources: []
    }, 404);
  }

  try {
    const answer = await askGemini(question.trim(), documents);
    return json({
      answer,
      sources: documents.map(document => ({
        title: document.title,
        url: document.source_url
      }))
    });
  } catch (error) {
    console.error('Ask Gabriel generation failed:', error);
    return json({ error: 'Unable to generate an answer right now.' }, 502);
  }
};
