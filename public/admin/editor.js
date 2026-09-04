// Astro optional image/URL fields must be absent, not empty strings.
CMS.registerEventListener({
  name: 'preSave',
  handler: ({ entry }) => {
    let data = entry.get('data');
    const optional = entry.get('collection') === 'projects'
      ? ['heroImage', 'liveUrl', 'githubUrl', 'company', 'role']
      : ['coverImage'];
    optional.forEach((key) => {
      if (data.get(key) === '' || data.get(key) === null) data = data.delete(key);
    });
    return data;
  }
});

