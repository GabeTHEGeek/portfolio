import assert from 'node:assert/strict';
import { VOICE_DISCLOSURE, VOICE_RETURN_GREETING, formatTimer, isGreeting, speechText } from '../src/utils/voice.ts';
assert.equal(isGreeting('hello'), true);
assert.equal(isGreeting('What is Fleet Command?'), false);
assert.equal(formatTimer(65), '01:05');
assert.equal(speechText('Answer [source](https://example.com) **here**'), 'Answer [source]( here');
assert.match(VOICE_DISCLOSURE, /digital counterpart/i);
assert.match(VOICE_RETURN_GREETING, /welcome back/i);
console.log('Voice utility tests passed.');
