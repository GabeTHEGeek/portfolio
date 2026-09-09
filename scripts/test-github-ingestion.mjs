import assert from 'node:assert/strict';
import {
  buildRepositoryDocument,
  cleanGitHubMarkdown,
  isApprovedRepository
} from './github-ingestion.mjs';

const repository = {
  id: 1353437174,
  name: 'speakit',
  full_name: 'GabeTHEGeek/speakit',
  private: false,
  fork: false,
  archived: false,
  disabled: false,
  description: 'Local-first dictation.',
  language: 'TypeScript',
  topics: [],
  homepage: 'https://example.com',
  created_at: '2026-09-01T10:27:48Z',
  license: { name: 'GPL-3.0' }
};

assert.equal(isApprovedRepository(repository), true, 'initial repositories remain explicitly approved');
assert.equal(isApprovedRepository({ ...repository, name: 'renamed-speakit', full_name: 'GabeTHEGeek/renamed-speakit' }), true, 'stable repository ID survives a rename');
assert.equal(isApprovedRepository({ ...repository, id: 999, full_name: 'GabeTHEGeek/new-project', topics: ['ask-gabriel'] }), true);
assert.equal(isApprovedRepository({ ...repository, id: 999, full_name: 'GabeTHEGeek/new-project', topics: [] }), false);
assert.equal(isApprovedRepository({ ...repository, full_name: 'GabeTHEGeek/portfolio', topics: ['ask-gabriel'] }), false);
assert.equal(isApprovedRepository({ ...repository, fork: true, topics: ['ask-gabriel'] }), false);
assert.equal(isApprovedRepository({ ...repository, archived: true, topics: ['ask-gabriel'] }), false);

const cleaned = cleanGitHubMarkdown('# Product\n\n![badge](badge.svg)\n\n```sh\nsecret command\n```\nUseful [documentation](https://example.com).');
assert.equal(cleaned, 'Product\n\nUseful documentation.');

const content = buildRepositoryDocument(
  { ...repository, topics: ['ask-gabriel', 'local-ai'] },
  '# SpeakIt\n\nPrivate, on-device dictation.',
  { name: 'Version 1', tag_name: 'v1.0.0', published_at: '2026-09-08T12:00:00Z', body: 'First stable release.' }
);
assert.match(content, /Local-first dictation/);
assert.match(content, /Topics: local-ai/);
assert.doesNotMatch(content, /ask-gabriel/);
assert.match(content, /First stable release/);

console.log('PASS: GitHub approval, exclusion, Markdown normalization, metadata, README, and release handling.');
