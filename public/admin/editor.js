// Astro optional image/URL fields must be absent, not empty strings.
CMS.registerEventListener({
  name: 'preSave',
  handler: ({ entry }) => {
    let data = entry.get('data');
    const optional = entry.get('collection') === 'projects'
      ? ['heroImage', 'videoUrl', 'liveUrl', 'githubUrl', 'company', 'role']
      : ['coverImage', 'videoUrl'];
    optional.forEach((key) => {
      if (data.get(key) === '' || data.get(key) === null) data = data.delete(key);
    });
    return data;
  }
});

// Decap builds "View live" and site links from the production display URL.
// While editing locally, keep those links on the running local portfolio.
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  let scheduled = false;
  const rewriteLocalLinks = () => {
    scheduled = false;
    document.querySelectorAll('#nc-root a[href]').forEach((link) => {
      try {
        const url = new URL(link.href);
        if (url.hostname !== 'gabrielpendleton.me') return;
        link.href = `${location.origin}${url.pathname}${url.search}${url.hash}`;
      } catch {}
    });
  };
  const scheduleRewrite = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(rewriteLocalLinks);
  };
  new MutationObserver(scheduleRewrite).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', scheduleRewrite);
  scheduleRewrite();
}
