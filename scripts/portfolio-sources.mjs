import { readFile, readdir } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

export const PORTFOLIO_ORIGIN = 'https://gabrielpendleton.me';
const root = new URL('../', import.meta.url);
const sourceUrl = (route) => new URL(route, PORTFOLIO_ORIGIN).href;
const read = (relativePath) => readFile(new URL(relativePath, root), 'utf8');

function parseMarkdown(source) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: source.trim() };
  return { data: parseYaml(match[1]) ?? {}, body: match[2].trim() };
}

function cleanMarkdown(value) {
  return String(value ?? '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?|```/g, ''))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/^>\s?/gm, '')
    .replace(/[*_`]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function metadataText(data, fields) {
  return fields.flatMap(([label, key]) => {
    const value = data[key];
    if (value === undefined || value === null || value === '') return [];
    return [`${label}: ${Array.isArray(value) ? value.join(', ') : value}`];
  }).join('\n');
}

async function projectSources() {
  const directory = new URL('../src/content/projects/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md')).sort();
  return Promise.all(files.map(async (file) => {
    const { data, body } = parseMarkdown(await read(`src/content/projects/${file}`));
    const title = data.company ? `${data.company}: ${data.title}` : String(data.title);
    return { key: `project:${data.slug}`, title, sourceUrl: sourceUrl(`/projects/${data.slug}/`), sourceType: 'portfolio-project', sourcePath: `src/content/projects/${file}`,
      content: cleanMarkdown([title, metadataText(data, [['Description', 'description'], ['Role', 'role'], ['Status', 'status'], ['Tags', 'tags'], ['Published', 'publishDate']]), body].filter(Boolean).join('\n\n')) };
  }));
}

async function writingSources() {
  const directory = new URL('../src/content/writing/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md')).sort();
  const articles = await Promise.all(files.map(async (file) => {
    const { data, body } = parseMarkdown(await read(`src/content/writing/${file}`));
    return { key: `article:${data.slug}`, title: String(data.title), sourceUrl: sourceUrl(`/writing/${data.slug}/`), sourceType: 'portfolio-article', sourcePath: `src/content/writing/${file}`,
      content: cleanMarkdown([data.title, metadataText(data, [['Description', 'description'], ['Category', 'category'], ['Tags', 'tags'], ['Published', 'publishDate'], ['Reading time', 'readTime'], ['Author', 'author']]), body].filter(Boolean).join('\n\n')) };
  }));
  const catalog = { key: 'writing:index', title: 'Gabriel Pendleton Writing', sourceUrl: sourceUrl('/writing/'), sourceType: 'portfolio-writing-index', sourcePath: 'src/content/writing/*.md',
    content: cleanMarkdown(['Gabriel Pendleton Writing', 'Articles and field notes about AI products, agent systems, product leadership, local AI, product judgment, and building in public.', ...articles.map((article) => `${article.title}\n${article.content.split('\n').find((line) => line.startsWith('Description:')) ?? ''}\nSource: ${article.sourceUrl}`)].join('\n\n')) };
  return [catalog, ...articles];
}

async function certificationSource() {
  const directory = new URL('../src/content/certifications/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md')).sort();
  const credentials = await Promise.all(files.map(async (file) => parseMarkdown(await read(`src/content/certifications/${file}`))));
  return { key: 'credentials:certifications', title: 'Gabriel Pendleton Certifications', sourceUrl: sourceUrl('/certifications/'), sourceType: 'portfolio-certifications', sourcePath: 'src/content/certifications/*.md',
    content: cleanMarkdown(['Gabriel Pendleton Certifications', ...credentials.map(({ data }) => `${data.name} - ${data.organization}`)].join('\n\n')) };
}

async function profileSources() {
  const profile = JSON.parse(await read('src/data/ask-gabriel-profile.json'));
  return [
    { key: 'profile:portfolio', title: profile.portfolio.title, sourceUrl: sourceUrl('/'), sourceType: 'portfolio-profile', sourcePath: 'src/data/ask-gabriel-profile.json#portfolio',
      content: cleanMarkdown([profile.portfolio.title, profile.portfolio.summary, 'Professional summary', profile.portfolio.professionalSummary, 'Skills', profile.portfolio.skills.join(', ')].join('\n\n')) },
    { key: 'product:ask-gabriel', title: profile.askGabriel.title, sourceUrl: sourceUrl('/#ask-gabriel'), sourceType: 'portfolio-ai-interface', sourcePath: 'src/data/ask-gabriel-profile.json#askGabriel', content: cleanMarkdown(`${profile.askGabriel.title}\n\n${profile.askGabriel.summary}`) }
  ];
}

async function resumeSource() {
  const relativePath = 'public/resume/gabriel-pendleton-resume.txt';
  return { key: 'career:resume', title: 'Gabriel Pendleton Resume', sourceUrl: sourceUrl('/resume/gabriel-pendleton-resume.txt'), sourceType: 'resume-authoritative', sourcePath: relativePath, content: cleanMarkdown(await read(relativePath)) };
}

export async function loadPortfolioSources() {
  return [...await profileSources(), await resumeSource(), await certificationSource(), ...await projectSources(), ...await writingSources()];
}
