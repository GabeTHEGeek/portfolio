import assert from 'node:assert/strict';
import { isValidArticleSlug } from '../netlify/functions/_lib/article-views.ts';

assert.equal(isValidArticleSlug('building-ai-agent-starter-templates'), true);
assert.equal(isValidArticleSlug('Article With Spaces'), false);
assert.equal(isValidArticleSlug('../admin'), false);
assert.equal(isValidArticleSlug(''), false);

console.log('PASS: article view slug validation.');
