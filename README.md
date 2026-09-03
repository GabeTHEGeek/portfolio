# Gabriel Pendleton — Portfolio

Static Astro portfolio and blog foundation.

## Local development

```sh
npm install
npm run dev
```

Run `npm run build` to validate content and generate the production site in `dist/`.

## Content

- Add project Markdown or MDX files to `src/content/projects/`.
- Add articles to `src/content/writing/`.
- Add certifications to `src/content/certifications/`.
- Put source images in `src/assets/` and reference them from frontmatter.

Schemas live in `src/content.config.ts`. The sample entries document every supported field and should be replaced when real content is ready.

## Deployment

Set `site` in `astro.config.mjs` and the Sitemap URL in `public/robots.txt` to the final production domain if it changes. Build with `npm run build`, then upload the contents of `dist/` to the DreamHost domain's web directory (commonly via SFTP or SSH). No Node server is required in production.
