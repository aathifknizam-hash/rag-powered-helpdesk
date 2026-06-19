export function normalizeList(data) {
  if (Array.isArray(data)) return data
  if (data?.results) return data.results
  return []
}

export function countByStatus(stats, status) {
  return stats?.by_status?.[status] || 0
}
