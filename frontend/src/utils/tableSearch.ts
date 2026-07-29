export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function matchesSearch(query: string, ...parts: unknown[]) {
  const q = normalizeSearch(query)
  if (!q) return true
  const haystack = normalizeSearch(
    parts
      .flatMap((part) => {
        if (part == null || part === '') return []
        if (typeof part === 'object') return [JSON.stringify(part)]
        return [String(part)]
      })
      .join(' '),
  )
  return haystack.includes(q)
}

export function filterBySearch<T>(
  items: T[],
  query: string,
  getValues: (item: T) => unknown[],
) {
  if (!query.trim()) return items
  return items.filter((item) => matchesSearch(query, ...getValues(item)))
}
