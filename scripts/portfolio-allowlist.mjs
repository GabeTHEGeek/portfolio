export const PORTFOLIO_ORIGIN = 'https://gabrielpendleton.me';

export const PORTFOLIO_ALLOWLIST = [
  { path: '/', sourceType: 'portfolio-homepage' },
  { path: '/projects/fleet-command/', sourceType: 'portfolio-project' },
  { path: '/projects/speakit/', sourceType: 'portfolio-project' },
  { path: '/projects/maester/', sourceType: 'portfolio-project' },
  { path: '/projects/brand-companions/', sourceType: 'portfolio-project' },
  { path: '/writing/', sourceType: 'portfolio-writing-index' },
  { path: '/writing/fleet-command-organization-not-models/', sourceType: 'portfolio-article' },
  { path: '/writing/training-an-ai-agent-to-do-the-job/', sourceType: 'portfolio-article' },
  { path: '/writing/building-fleet-command/', sourceType: 'portfolio-article' }
].map((entry) => ({ ...entry, url: new URL(entry.path, PORTFOLIO_ORIGIN).href }));
