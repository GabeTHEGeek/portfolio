import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    heroImage: image().optional(),
    screenshots: z.array(image()).default([]),
    tags: z.array(z.string()).default([]),
    status: z.enum(['concept', 'in-progress', 'in-development', 'launched', 'archived']),
    liveUrl: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    kind: z.enum(['ai', 'product']).default('product'),
    company: z.string().optional(),
    role: z.string().optional(),
    order: z.number().int().default(99),
    publishDate: z.coerce.date()
  })
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    coverImage: image().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    publishDate: z.coerce.date(),
    readTime: z.string(),
    author: z.string()
  })
});

const certifications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/certifications' }),
  schema: ({ image }) => z.object({
    name: z.string(),
    organization: z.string(),
    credentialUrl: z.string().url().optional(),
    year: z.number().int().optional(),
    logo: image().optional()
  })
});

export const collections = { projects, writing, certifications };
