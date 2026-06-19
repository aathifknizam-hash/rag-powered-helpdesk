import React, { useState, useEffect } from 'react'
import { Search, BookOpen } from 'lucide-react'
import { Loading, EmptyState } from '../common/UIComponents'
import { PageHeader } from '../common/Layout'
import { knowledgeAPI } from '../../services/api'
import { normalizeList } from '../../utils/apiHelpers'
import { formatDate } from '../../utils/formatDate'

/* ─── Scoped CSS ─────────────────────────────────────────────────────────── */
const CSS = `
.kb-root {
  padding: 28px 32px;
  background: var(--bg);
  min-height: 100%;
  font-family: 'Inter', system-ui, sans-serif;
}
.kb-search-wrap {
  position: relative;
  margin-bottom: 20px;
  max-width: 400px;
}
.kb-search-wrap svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  width: 14px;
  height: 14px;
  pointer-events: none;
}
.kb-search {
  width: 100%;
  padding: 9px 12px 9px 32px;
  font-size: 0.83rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
  outline: none;
  font-family: inherit;
}
.kb-search:focus { border-color: var(--info); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.kb-doc-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.15s, border-color 0.15s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kb-doc-card:hover {
  box-shadow: var(--shadow-md);
  border-color: #cbd5e1;
}
.kb-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  width: fit-content;
}
.kb-status-indexed   { background: #dcfce7; color: var(--success); }
.kb-status-pending   { background: #fef9c3; color: #854d0e; }
.kb-status-failed    { background: #fee2e2; color: var(--danger); }
.kb-status-default   { background: #f1f5f9; color: var(--text-muted); }
.kb-doc-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  flex: 1;
}
.kb-doc-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
}
`

function statusClass(status) {
  if (status === 'indexed')   return 'kb-status-badge kb-status-indexed'
  if (status === 'pending')   return 'kb-status-badge kb-status-pending'
  if (status === 'failed')    return 'kb-status-badge kb-status-failed'
  return 'kb-status-badge kb-status-default'
}

export function KnowledgeBase() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await knowledgeAPI.list()
      setDocuments(normalizeList(response.data))
    } catch (err) {
      console.error('Failed to fetch knowledge base:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = documents.filter(d =>
    !search || (d.title || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading fullscreen />

  return (
    <>
      <style>{CSS}</style>
      <div className="kb-root">
        <PageHeader
          title="Knowledge Base"
          subtitle="Browse indexed documentation and support articles"
        />

        {/* Search */}
        <div className="kb-search-wrap">
          <Search />
          <input
            className="kb-search"
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No documents"
            message="Knowledge base documents will appear here once uploaded"
          />
        ) : (
          <div className="kb-grid">
            {filtered.map(doc => (
              <div key={doc.id} className="kb-doc-card">
                <span className={statusClass(doc.embedding_status)}>
                  {doc.embedding_status || 'pending'}
                </span>
                <p className="kb-doc-title">{doc.title}</p>
                <span className="kb-doc-meta">Added {formatDate(doc.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
