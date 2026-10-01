export function clearActionNoticeParams(href: string, keys: readonly string[]) {
  const url = new URL(href);
  for (const key of keys) url.searchParams.delete(key);
  return `${url.pathname}${url.search}${url.hash}`;
}
