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
hero image, screenshots, tags, and the Markdown body. Featured controls the existing
featured treatment. Publish when ready, then position it in the Projects list.

## Publish an article

Choose Writing → New Writing. Fill in title, unique slug, description, category,
publish date, reading time, author, and body. Select/upload a cover image and add
inline images with the Markdown editor. Publish, then position it in the Writing list.

## Ordering entries in the publishing lists

Open **Projects** or **Writing** in the CMS sidebar. Use the **↑ / ↓** buttons
beside each entry to move it, then click **Publish order** above the list.
The title still opens the regular content editor. There is no separate ordering
page, and no order numbers need to be entered. Controls work with keyboard and touch.

Newly published entries are automatically included after explicitly ordered entries.
Return to the list (or reload it) and use the arrows to position them. Clear any
filters before reordering. **Discard changes** restores the last published order.
Unsaved moves are retained when switching collections within the CMS; leaving or
reloading the admin tab warns before discarding them.

Projects controls the project directory and order within each homepage group;
the homepage still separates AI systems from product history. Writing controls
the writing directory and the homepage's first three articles. Related articles
continue to be ranked by relevance.

Ordering is saved in src/data/project-order.json and src/data/writing-order.json,
using references to existing slugs; content is not duplicated or migrated.
Existing frontmatter order numbers are preserved and hidden in the editor, and
remain fallback values for unlisted entries. Publishing an order triggers the
normal Netlify deployment. No additional authentication setup is required.

The portfolio-github backend is a thin adapter over Decap's built-in GitHub backend,
not a new authentication provider. It uses the same OAuth configuration and current
authenticated API instance. Ordering publishes use GitHub's Contents API with the
loaded file SHA, so simultaneous changes are rejected rather than overwritten.
If publication fails, the pending order is retained. Reload to retrieve the latest
repository order before retrying a conflict. No content files are rewritten.

The custom list in public/admin/ordering.js replaces only the collection cards on
the existing Projects/Writing screens. The native list remains the filter source;
editing, creating, uploading, and logging in stay with Decap. This adapter is tested
against pinned Decap 3.16.0. Re-test collection loading, title links, filters, arrows,
publication failures, and keyboard use before upgrading Decap.
Browser regression tests: `node scripts/test-cms-ordering.mjs` (requires Playwright
and Chrome). Set `REAL_CMS=1` to test the actual pinned Decap interface against a
mock repository; this never edits live GitHub content. `PLAYWRIGHT_MODULE` may
point to an existing Playwright module, and `PLAYWRIGHT_CHANNEL` selects a browser.

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
