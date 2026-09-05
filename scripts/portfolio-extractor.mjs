import { parse } from 'parse5';

const CONTENT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'blockquote', 'time', 'dt', 'dd']);
const SKIP_TAGS = new Set(['script', 'style', 'template', 'svg', 'canvas', 'nav', 'footer', 'aside', 'button', 'audio']);
const DECORATIVE_CLASS = /(?:^|\s)(?:eyebrow|crumbs|tags|command-actions|case-next|article-actions|article-meta|soundtrack-player|hud-label|interface-rail|section-index|site-status)(?:\s|$)/i;

const attrs = (node) => Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
const classes = (node) => attrs(node).class ?? '';

function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes ?? []) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

function textContent(node) {
  if (node.nodeName === '#text') return node.value ?? '';
  return (node.childNodes ?? []).map(textContent).join('');
}

function cleanText(value) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function metaContent(document, key, value) {
  const node = find(document, (candidate) => {
    if (candidate.tagName !== 'meta') return false;
    const attributes = attrs(candidate);
    return attributes[key] === value && attributes.content;
  });
  return node ? attrs(node).content : undefined;
}

function collectContent(node, lines) {
  if (!node || SKIP_TAGS.has(node.tagName)) return;
  const attributes = attrs(node);
  if (attributes['aria-hidden'] === 'true' || attributes.hidden !== undefined || DECORATIVE_CLASS.test(classes(node))) return;
  if (CONTENT_TAGS.has(node.tagName)) {
    const text = cleanText(textContent(node));
    if (text && !lines.includes(text)) lines.push(text);
    return;
  }
  for (const child of node.childNodes ?? []) collectContent(child, lines);
}

export function extractPortfolioPage(html, sourceUrl) {
  const document = parse(html);
  const main = find(document, (node) => node.tagName === 'main');
  if (!main) throw new Error(`No <main> content found at ${sourceUrl}`);
  const lines = [];
  collectContent(main, lines);
  const content = cleanText(lines.join('\n\n'));
  if (content.length < 80) throw new Error(`Extracted content was unexpectedly short at ${sourceUrl}`);
  const titleNode = find(main, (node) => node.tagName === 'h1');
  const documentTitleNode = find(document, (node) => node.tagName === 'title');
  const title = cleanText(metaContent(document, 'property', 'og:title') || textContent(titleNode ?? documentTitleNode ?? {}))
    .replace(/\s*[|–—]\s*Gabriel Pendleton\s*$/i, '');
  return { title: title || new URL(sourceUrl).pathname, content };
}
