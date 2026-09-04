import projectOrder from '../data/project-order.json';
import writingOrder from '../data/writing-order.json';

type Entry = { data: { slug: string; order: number; publishDate: Date } };

/** Explicit CMS order first; newly published/unlisted entries retain a safe fallback. */
export function sortContent<T extends Entry>(entries: T[], collection: 'projects' | 'writing'): T[] {
  const saved = collection === 'projects' ? projectOrder : writingOrder;
  const positions = new Map<string, number>();
  saved.entries.forEach(({ entry }, index) => {
    if (!positions.has(entry)) positions.set(entry, index);
  });
  return [...entries].sort((a, b) =>
    (positions.get(a.data.slug) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(b.data.slug) ?? Number.MAX_SAFE_INTEGER) ||
    a.data.order - b.data.order ||
    (collection === 'writing' ? b.data.publishDate.valueOf() - a.data.publishDate.valueOf() : 0)
  );
}
