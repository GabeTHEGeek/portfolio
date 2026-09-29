const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isValidArticleSlug = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 120 && SLUG_PATTERN.test(value);
