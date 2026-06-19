/**
 * User-facing source labels (no confidence scores).
 */

const TYPE_LABELS = {
  faq: 'FAQ',
  document: 'Knowledge Base',
  policy: 'Policy Document',
}

export function getSourceTypeLabel(type) {
  if (!type) return 'Knowledge Base'
  const key = String(type).toLowerCase()
  return TYPE_LABELS[key] || 'Knowledge Base'
}

export function mapApiSources(sources = []) {
  return sources.map((s, i) => ({
    id: i,
    title: s.source || s.title || s.question || 'Reference',
    typeLabel: getSourceTypeLabel(s.type),
    type: s.type || 'document',
    // Admin-only — not shown in user UI
    confidence: s.similarity,
  }))
}
