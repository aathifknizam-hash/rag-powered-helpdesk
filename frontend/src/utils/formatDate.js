/**
 * Centralized date formatting — never surfaces "Invalid Date".
 */

const FALLBACK = 'Not Available'

function toDate(value) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value, options = {}) {
  const d = toDate(value)
  if (!d) return FALLBACK
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  })
}

export function formatDateTime(value, options = {}) {
  const d = toDate(value)
  if (!d) return FALLBACK
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

export function formatRelative(value) {
  const d = toDate(value)
  if (!d) return FALLBACK
  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return formatDate(d)
}

export default formatDate
