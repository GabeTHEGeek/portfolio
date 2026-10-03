import assert from 'node:assert/strict';
import { VOICE_DISCLOSURE, VOICE_RETURN_GREETING, collectRecognitionResults, formatTimer, isGreeting, pcm16ToFloat32, speechText } from '../src/utils/voice.ts';
assert.equal(isGreeting('hello'), true);
assert.equal(isGreeting('What is Fleet Command?'), false);
assert.equal(formatTimer(65), '01:05');
assert.equal(speechText('Answer [source](https://example.com) **here**'), 'Answer [source]( here');
assert.match(VOICE_DISCLOSURE, /digital counterpart/i);
assert.match(VOICE_RETURN_GREETING, /welcome back/i);
const firstSegment = collectRecognitionResults([{ isFinal: true, 0: { transcript: 'Tell me about' } }], 0);
assert.equal(firstSegment.final, 'Tell me about');
assert.equal(firstSegment.processedFinalCount, 1);
const continuedSegment = collectRecognitionResults([
  { isFinal: true, 0: { transcript: 'Tell me about' } },
  { isFinal: false, 0: { transcript: 'Fleet Command' } }
], firstSegment.processedFinalCount);
assert.equal(continuedSegment.final, '', 'previously finalized speech is not repeated');
assert.equal(continuedSegment.interim, 'Fleet Command');
const completedSegment = collectRecognitionResults([
  { isFinal: true, 0: { transcript: 'Tell me about' } },
  { isFinal: true, 0: { transcript: 'Fleet Command' } }
], continuedSegment.processedFinalCount);
assert.equal(completedSegment.final, 'Fleet Command');
assert.equal(collectRecognitionResults([{ isFinal: true, 0: { transcript: 'and its agents' } }], 0).final, 'and its agents', 'a restarted recognition cycle can extend the same question');
assert.deepEqual([...pcm16ToFloat32(new Uint8Array([0, 0, 255, 127, 0, 128]))], [0, 32767 / 32768, -1]);
assert.throws(() => pcm16ToFloat32(new Uint8Array([1])), /Incomplete PCM sample/);
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
let requestedFormat;
try {
  process.env.OPENAI_API_KEY = 'test-only';
  globalThis.fetch = async (_url, options) => {
    requestedFormat = JSON.parse(options.body).response_format;
    return new Response(new Uint8Array([0, 0, 255, 127]));
  };
  const { default: voiceEndpoint } = await import('../netlify/functions/ask-gabriel-voice.ts');
  const pcm = await voiceEndpoint(new Request('http://localhost/.netlify/functions/ask-gabriel-voice', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Test speech', format: 'pcm' })
  }));
  assert.equal(pcm.status, 200);
  assert.equal(pcm.headers.get('content-type'), 'application/octet-stream');
  assert.equal(requestedFormat, 'pcm');
  const invalid = await voiceEndpoint(new Request('http://localhost/.netlify/functions/ask-gabriel-voice', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Test speech', format: 'unexpected' })
  }));
  assert.equal(invalid.status, 400);
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
}
const originalAudioContext = globalThis.AudioContext;
let started = 0;
let stopped = 0;
class FakeAudioContext {
  currentTime = 0;
  destination = {};
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createBuffer(_channels, frames, rate) { return { duration: frames / rate, copyToChannel() {} }; }
  createBufferSource() {
    let ended = false;
    const source = {
      connect() {}, disconnect() {},
      start() { started++; setTimeout(() => source.stop(), 0); },
      stop() { if (ended) return; ended = true; stopped++; source.onended?.(); }
    };
    return source;
  }
}
try {
  globalThis.AudioContext = FakeAudioContext;
  let streamController;
  globalThis.fetch = async (_url, options) => {
    assert.equal(JSON.parse(options.body).format, 'pcm');
    return new Response(new ReadableStream({ start(controller) {
      streamController = controller;
      controller.enqueue(new Uint8Array(9_599));
      controller.enqueue(new Uint8Array(1));
      options.signal.addEventListener('abort', () => controller.error(new DOMException('Stopped', 'AbortError')));
    } }));
  };
  const { ServerTTSVoiceProvider } = await import('../src/utils/voice.ts');
  const provider = new ServerTTSVoiceProvider();
  provider.prepare();
  const playback = (async () => { for await (const _ of provider.synthesize('Test speech')) {} })();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(started, 1, 'streaming playback starts before the response ends');
  streamController.close();
  await playback;

  const interrupted = new ServerTTSVoiceProvider();
  interrupted.prepare();
  const interruptedPlayback = (async () => { for await (const _ of interrupted.synthesize('Test speech')) {} })();
  await new Promise((resolve) => setTimeout(resolve, 10));
  interrupted.cancel();
  await interruptedPlayback;
  assert.ok(stopped >= 2, 'interruption stops scheduled audio');
} finally {
  globalThis.fetch = originalFetch;
  if (originalAudioContext === undefined) delete globalThis.AudioContext;
  else globalThis.AudioContext = originalAudioContext;
}
console.log('Voice utility tests passed.');
