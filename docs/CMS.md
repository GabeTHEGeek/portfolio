# Portfolio content manager

Access: https://gabrielpendleton.me/admin/

The public design, schemas, existing Markdown files, and images are unchanged.
Decap edits Projects in `src/content/projects` and Writing in `src/content/writing`.
Both use Markdown with YAML frontmatter; this project does not currently load MDX.
Certifications remain outside the CMS.

## One-time authentication setup

1. In GitHub Settings → Developer settings → OAuth Apps, register a new OAuth app:
   - Name: Gabriel Portfolio CMS
   - Homepage: https://gabrielpendleton.me
   - Authorization callback: https://api.netlify.com/auth/done
2. Generate a client secret. In your Netlify project, open Project configuration →
   Access & security → OAuth → Authentication providers → Install provider → GitHub.
   Enter the client ID and secret there. Never commit the secret or paste it into admin/config.yml.
3. Ensure gabrielpendleton.me is assigned to this Netlify project and HTTPS is active.
   Decap uses this domain to identify the project to Netlify's OAuth service.
4. Keep GitHub continuous deployment on main enabled. Editors must have write access
   to GabeTHEGeek/portfolio. No Netlify Identity or Git Gateway setup is needed.
5. Visit /admin/ and log in with GitHub. Allow the authentication popup.
   If GitHub branch protection prevents direct commits, adjust the workflow deliberately;
   this configuration publishes directly to main and does not bypass branch protection.

References:
- https://decapcms.org/docs/github-backend/
- https://docs.netlify.com/manage/security/secure-access-to-sites/oauth-provider-tokens/

## Create a project

Choose Projects → New Projects. Fill in title, a unique hyphenated URL slug,
description, status, kind, and publish date. Add optional company/role, links,
hero image, screenshots, tags, and the Markdown body. Lower display-order values
appear first; featured controls the existing featured treatment. Publish when ready.

## Publish an article

Choose Writing → New Writing. Fill in title, unique slug, description, category,
publish date, reading time, author, and body. Select/upload a cover image and add
inline images with the Markdown editor. Set display order if needed, then Publish.

Publish commits to main and triggers Netlify. Wait for the deployment to succeed
before checking the public URL. A future publish date is metadata, not scheduling:
the existing site displays every published file. The editor preview is disabled
because it is not a rendering of the Astro design; use the deployed page to inspect it.
Do not change existing slugs without adding redirects. Entry deletion is disabled.

## Images

New uploads are stored only in src/assets/media. Frontmatter and Markdown use
../../assets/media/filename paths, matching the existing relative-image architecture.
Both content folders are two levels below src, so these paths resolve correctly.
Astro optimizes referenced images during builds. Use descriptive, unique filenames
and add meaningful alt text to inline diagrams. Do not remove images still used by
other entries. Existing images in src/assets and src/assets/projects stay in place;
their current references remain editable without migration. Optional empty image
and URL fields are omitted by editor.js so Astro validation does not reject them.

## Field mapping

Projects: title/string, slug/string, description/text, heroImage/optional image,
screenshots/list of image strings (default []), tags/list of strings (default []),
status/select (concept, in-progress, in-development, launched, archived),
liveUrl/optional URL string, githubUrl/optional URL string, featured/boolean (false),
kind/select (ai, product; default product), company/optional string, role/optional
string, order/integer (99), publishDate/date, body/Markdown.

Writing: title/string, slug/string, description/text, coverImage/optional image,
category/string, tags/list of strings ([]), publishDate/date, readTime/string,
order/integer (99), author/string, body/Markdown.

No draft or extra frontmatter properties are added. Screenshots remain plain strings,
not nested objects. Existing filenames are not renamed when opened in the CMS.

## Verification and maintenance

Run the normal production build after pulling CMS commits. Decap is pinned to
3.16.0 and loaded only under /admin/; public pages receive no CMS JavaScript.
The login/upload/publish round trip requires the manual OAuth setup above and
must be tested with your GitHub account. Verify a project image and article inline
image upload, publish, and inspect the successful Netlify deploy before regular use.

