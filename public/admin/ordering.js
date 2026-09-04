/* Adapter for pinned Decap 3.16.0. Uses its registered GitHub backend, never
 * reads browser token storage, and leaves editing/upload/authentication to Decap.
 * Only the existing collection list is replaced; React-owned cards are not moved.
 */
(() => {
  const states = new Map();
  let backend;
  let mounted;
  let scheduled = false;
  const names = { projects: 'project', writing: 'writing' };
  const decode = (value) => new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0)));
  const encode = (value) => btoa(Array.from(new TextEncoder().encode(value), b => String.fromCharCode(b)).join(''));
  const current = () => location.hash.match(/^#\/collections\/(projects|writing)\/?$/)?.[1];
  const dirty = state => state.order.join('\n') !== state.saved.join('\n');
  const pathFor = name => `src/data/${names[name]}-order.json`;
  const endpoint = name => `/repos/${backend.repo}/contents/${pathFor(name)}`;

  function parseEntry(item) {
    const match = item.data.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) throw new Error('An entry has no valid frontmatter.');
    const data = jsyaml.load(match[1]);
    if (typeof data.slug !== 'string' || typeof data.title !== 'string') throw new Error('An entry is missing its title or slug.');
    return { slug: data.slug, title: data.title, id: item.file.path.split('/').pop().replace(/\.md$/, ''), order: data.order ?? 99, date: new Date(data.publishDate).valueOf() || 0 };
  }

  async function loadState(name, items) {
    const file = await backend.api.request(endpoint(name), { params: { ref: backend.branch } });
    const saved = JSON.parse(decode(file.content));
    if (!Array.isArray(saved.entries) || saved.entries.some(e => typeof e.entry !== 'string')) throw new Error('The saved ordering file is invalid.');
    const entries = items.map(parseEntry);
    const available = new Set(entries.map(e => e.slug));
    const order = [...new Set(saved.entries.map(e => e.entry))].filter(slug => available.has(slug));
    entries.sort((a, b) => a.order - b.order || (name === 'writing' ? b.date - a.date : 0));
    entries.forEach(e => { if (!order.includes(e.slug)) order.push(e.slug); });
    return { entries, order, saved: [...order], sha: file.sha, busy: false, message: '' };
  }

  function mergeEntries(state, items) {
    state.entries = items.map(parseEntry);
    const available = new Set(state.entries.map(e => e.slug));
    for (const key of ['order', 'saved']) {
      state[key] = state[key].filter(slug => available.has(slug));
      state.entries.forEach(e => { if (!state[key].includes(e.slug)) state[key].push(e.slug); });
    }
  }

  // Custom backends are a Decap extension point; this delegates every operation
  // except collection loading to the original GitHub implementation.
  CMS.registerBackend('portfolio-github', class {
    constructor(config, options) {
      backend = CMS.getBackend('github').init(config, options);
      const original = backend.entriesByFolder.bind(backend);
      backend.entriesByFolder = async (folder, extension, depth) => {
        const name = folder.match(/^src\/content\/(projects|writing)$/)?.[1];
        if (!name) return original(folder, extension, depth);
        // Load all entries, so ordering cannot silently omit paginated records.
        const items = await backend.allEntriesByFolder(folder, extension, depth);
        try {
          if (!states.has(name) || states.get(name).error || !dirty(states.get(name))) states.set(name, await loadState(name, items));
          else mergeEntries(states.get(name), items);
        } catch (error) {
          states.set(name, { error: 'Ordering unavailable. Reload to retry. Your normal content editor still works.' });
        }
        schedule();
        return items;
      };
      return backend;
    }
  });

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  async function publish(name, state) {
    if (state.busy || !dirty(state)) return;
    state.busy = true;
    state.message = 'Publishing order…';
    render();
    try {
      // Contents API requires the loaded blob SHA: a competing edit is rejected,
      // not overwritten. Only this ordering file is changed, never Markdown.
      const result = await backend.api.request(endpoint(name), {
        method: 'PUT',
        body: JSON.stringify({
          branch: backend.branch,
          sha: state.sha,
          message: `Reorder ${name} from CMS collection list`,
          content: encode(JSON.stringify({ entries: state.order.map(entry => ({ entry })) }, null, 2) + '\n')
        })
      });
      state.sha = result.content.sha;
      state.saved = [...state.order];
      state.message = 'Order published. It will appear on the site after Netlify finishes deploying.';
    } catch (error) {
      state.message = 'Order was not saved. The repository may have changed or access may have failed. Your changes remain here; reload to get the latest order before retrying.';
    } finally {
      state.busy = false;
      render();
    }
  }

  function render(focusSlug, direction) {
    if (!mounted) return;
    const { name, panel, native } = mounted;
    const state = states.get(name);
    panel.replaceChildren();
    if (state.error) {
      native.classList.remove('portfolio-order-native');
      panel.append(element('p', state.error));
      return;
    }
    native.classList.add('portfolio-order-native');
    const links = [...native.querySelectorAll(`a[href*="/collections/${name}/entries/"]`)];
    const visible = new Set(links.map(a => decodeURIComponent(a.hash.split('/entries/')[1] || '')));
    const filtered = visible.size !== state.entries.length;
    const bar = element('div', '', 'portfolio-order-bar');
    bar.append(element('p', filtered ? 'Clear filters to change the public site order.' : 'Move entries up or down, then publish the order. Click a title to edit.'));
    const save = element('button', 'Publish order', 'portfolio-order-publish');
    save.disabled = state.busy || !dirty(state);
    save.onclick = () => publish(name, state);
    const reset = element('button', 'Discard changes');
    reset.disabled = state.busy || !dirty(state);
    reset.onclick = () => { state.order = [...state.saved]; state.message = 'Unsaved ordering changes discarded.'; render(); };
    bar.append(save, reset);
    const status = element('p', state.message);
    status.setAttribute('role', 'status');
    const list = element('ol', '', 'portfolio-order-list');
    for (const [index, slug] of state.order.entries()) {
      const entry = state.entries.find(e => e.slug === slug);
      if (!entry || !visible.has(entry.id)) continue;
      const row = element('li', '', 'portfolio-order-row');
      row.append(element('span', String(index + 1), 'portfolio-order-position'));
      const link = element('a', entry.title);
      link.href = `#/collections/${name}/entries/${encodeURIComponent(entry.id)}`;
      const controls = element('span', '', 'portfolio-order-controls');
      for (const [delta, label, arrow] of [[-1, 'up', '↑'], [1, 'down', '↓']]) {
        const button = element('button', arrow);
        button.setAttribute('aria-label', `Move ${entry.title} ${label}`);
        button.dataset.slug = slug;
        button.dataset.direction = label;
        button.disabled = state.busy || filtered || index + delta < 0 || index + delta >= state.order.length;
        button.onclick = () => {
          [state.order[index], state.order[index + delta]] = [state.order[index + delta], state.order[index]];
          state.message = `${entry.title} moved to position ${index + delta + 1}. Publish order to save.`;
          render(slug, label);
        };
        controls.append(button);
      }
      row.append(link, controls);
      list.append(row);
    }
    panel.append(bar, status, list);
    if (focusSlug) {
      const buttons = [...panel.querySelectorAll('button[data-slug]')].filter(b => b.dataset.slug === focusSlug);
      (buttons.find(b => b.dataset.direction === direction && !b.disabled) || buttons.find(b => !b.disabled))?.focus();
    }
  }

  function sync() {
    const name = current();
    if (mounted && (mounted.name !== name || !mounted.native.isConnected)) {
      mounted.native.classList.remove('portfolio-order-native');
      mounted.panel.remove();
      mounted = null;
    }
    if (!name || !states.has(name)) return;
    const link = [...document.querySelectorAll(`#nc-root a[href*="/collections/${name}/entries/"]`)].find(a => !a.closest('.portfolio-order'));
    const native = link?.closest('ul');
    if (!native) return;
    const state = states.get(name);
    // Decap may update its cached cards after publishing without fetching the
    // collection again. Refresh our metadata so a new entry is never hidden.
    const unknown = !state.error && [...native.querySelectorAll('a[href*="/entries/"]')].some(a =>
      !state.entries.some(e => e.id === decodeURIComponent(a.hash.split('/entries/')[1] || '')));
    if (unknown) {
      native.classList.remove('portfolio-order-native');
      if (mounted) { mounted.panel.remove(); mounted = null; }
      if (!state.refreshing) {
        state.refreshing = true;
        backend.allEntriesByFolder(`src/content/${name}`, 'md', 1).then(items => {
          mergeEntries(state, items);
          const unresolved = [...native.querySelectorAll('a[href*="/entries/"]')].some(a =>
            !state.entries.some(e => e.id === decodeURIComponent(a.hash.split('/entries/')[1] || '')));
          if (unresolved) throw new Error('The collection changed while refreshing.');
        }).catch(() => {
          states.set(name, { error: 'Ordering unavailable. Reload to retry. Your normal content editor still works.' });
        }).finally(() => { state.refreshing = false; schedule(); });
      }
      return;
    }
    if (!mounted) {
      const panel = element('section', '', 'portfolio-order');
      panel.setAttribute('aria-label', `${name === 'writing' ? 'Writing' : 'Projects'} publishing list`);
      native.before(panel);
      mounted = { name, panel, native };
    }
    render();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; sync(); });
  }
  new MutationObserver(records => {
    if (records.some(r => !r.target.closest?.('.portfolio-order'))) schedule();
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('beforeunload', event => {
    if ([...states.values()].some(state => !state.error && dirty(state))) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
})();
