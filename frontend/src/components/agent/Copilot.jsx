import React, { useState, useEffect, useCallback } from 'react'
import { Sparkles, BookOpen, Lightbulb, MessageSquare, ChevronDown, ChevronUp, RotateCcw, Search, Ticket } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Loading, EmptyState } from '../common/UIComponents'
import { ticketAPI, aiCopilotAPI } from '../../services/api'
import { normalizeList } from '../../utils/apiHelpers'
import { getSourceTypeLabel } from '../../utils/sourceLabels'

/* ─── Scoped CSS ─────────────────────────────────────────────────────────── */
const CSS = `
.cp-root {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--bg);
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Left panel: ticket selector ── */
.cp-sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cp-sidebar-header {
  padding: 18px 16px 12px;
  border-bottom: 1px solid var(--border);
}
.cp-sidebar-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin: 0 0 10px;
}
.cp-search-wrap {
  position: relative;
}
.cp-search-wrap svg {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  width: 14px;
  height: 14px;
  pointer-events: none;
}
.cp-search {
  width: 100%;
  padding: 6px 8px 6px 28px;
  font-size: 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text-primary);
  outline: none;
}
.cp-search:focus { border-color: var(--info); box-shadow: 0 0 0 2px rgba(37,99,235,0.08); }
.cp-ticket-list { flex: 1; overflow-y: auto; }
.cp-ticket-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
  display: block;
}
.cp-ticket-item:hover { background: var(--bg); }
.cp-ticket-item.active {
  background: #eff6ff;
  border-left: 3px solid var(--info);
  padding-left: 13px;
}
.cp-ticket-number {
  font-size: 0.68rem;
  font-family: monospace;
  color: var(--info);
  margin-bottom: 3px;
  display: block;
}
.cp-ticket-subject {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
}
.cp-ticket-meta {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 4px;
}

/* ── Right panel: AI workspace ── */
.cp-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.cp-main-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cp-main-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cp-main-title h1 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.cp-main-title svg { color: var(--info); }
.cp-ticket-subject-header {
  font-size: 0.82rem;
  color: var(--text-secondary);
  max-width: 480px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cp-regen-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s;
  white-space: nowrap;
}
.cp-regen-btn:hover { background: var(--bg); border-color: #cbd5e1; }
.cp-regen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cp-accordion-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Accordion Panels ── */
.cp-accordion {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  overflow: hidden;
}
.cp-accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s;
}
.cp-accordion-header:hover { background: var(--bg); }
.cp-accordion-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-primary);
}
.cp-accordion-body {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.6;
  animation: cp-fade-in 0.15s ease;
}
@keyframes cp-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

/* ── Summary card ── */
.cp-summary-text {
  color: var(--text-secondary);
  line-height: 1.7;
}
/* ── Draft reply ── */
.cp-draft-block {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  white-space: pre-wrap;
  font-size: 0.8rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 10px;
}
.cp-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s;
}
.cp-copy-btn:hover { background: var(--bg); }
.cp-copy-btn.copied { color: var(--success); border-color: var(--success); }
/* ── Resolution steps ── */
.cp-step-list { padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.cp-step-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.cp-step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #eff6ff;
  color: var(--info);
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
/* ── Similar tickets ── */
.cp-similar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.cp-similar-row:last-child { border-bottom: none; }
.cp-similar-num { font-family: monospace; font-size: 0.72rem; color: var(--info); flex-shrink: 0; }
.cp-similar-subj { font-size: 0.8rem; color: var(--text-primary); flex: 1; }
/* ── References ── */
.cp-ref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}
.cp-ref-row:last-child { border-bottom: none; }
.cp-ref-source { font-size: 0.8rem; color: var(--text-secondary); flex: 1; }
.cp-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #eff6ff;
  color: var(--info);
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;
}
/* ── Empty / loading ── */
.cp-empty-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: var(--text-muted);
  padding: 48px;
  text-align: center;
}
.cp-empty-main svg { opacity: 0.3; }
.cp-empty-main h2 { font-size: 1rem; font-weight: 600; color: var(--text-secondary); margin: 0; }
.cp-empty-main p { font-size: 0.82rem; margin: 0; }
`

/* ─── Collapsible accordion panel ───────────────────────────────────────── */
function AccordionPanel({ icon: Icon, label, iconColor = 'var(--info)', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="cp-accordion">
      <button className="cp-accordion-header" onClick={() => setOpen(o => !o)}>
        <span className="cp-accordion-label">
          <Icon size={14} style={{ color: iconColor }} />
          {label}
        </span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
               : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
      </button>
      {open && <div className="cp-accordion-body">{children}</div>}
    </div>
  )
}

/* ─── Copy button ────────────────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button className={`cp-copy-btn${copied ? ' copied' : ''}`} onClick={handle}>
      {copied ? 'Copied!' : 'Copy Draft'}
    </button>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function AgentCopilot() {
  const [searchParams] = useSearchParams()
  const [tickets, setTickets] = useState([])
  const [filteredTickets, setFilteredTickets] = useState([])
  const [selectedId, setSelectedId] = useState(searchParams.get('ticket') || null)
  const [copilot, setCopilot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [searchQ, setSearchQ] = useState('')

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const [queueRes, listRes] = await Promise.all([
        ticketAPI.getUnassignedQueue(),
        ticketAPI.list(),
      ])
      const combined = [...normalizeList(queueRes.data), ...normalizeList(listRes.data)]
      const unique = [...new Map(combined.map(t => [t.id, t])).values()]
      setTickets(unique)
      setFilteredTickets(unique)
      if (!selectedId && unique.length) setSelectedId(String(unique[0].id))
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  useEffect(() => {
    const q = searchQ.trim().toLowerCase()
    if (!q) { setFilteredTickets(tickets); return }
    setFilteredTickets(tickets.filter(t =>
      (t.subject || '').toLowerCase().includes(q) ||
      (t.ticket_number || '').toLowerCase().includes(q)
    ))
  }, [searchQ, tickets])

  useEffect(() => {
    if (!selectedId) return
    runAnalysis(selectedId)
  }, [selectedId])

  const runAnalysis = async (ticketId) => {
    setAnalyzing(true)
    setCopilot(null)
    try {
      const [copilotRes, similarRes] = await Promise.all([
        aiCopilotAPI.getSuggestion(ticketId),
        aiCopilotAPI.getSimilarTickets(ticketId),
      ])
      setCopilot({
        ...copilotRes.data,
        similar: similarRes.data?.similar_tickets || [],
      })
    } catch (err) {
      console.error('Copilot analysis failed:', err)
      setCopilot(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const selected = tickets.find(t => String(t.id) === String(selectedId))

  if (loading) return <Loading fullscreen />

  return (
    <>
      <style>{CSS}</style>
      <div className="cp-root">
        {/* ── Left: ticket selector ── */}
        <aside className="cp-sidebar">
          <div className="cp-sidebar-header">
            <p className="cp-sidebar-title">Tickets</p>
            <div className="cp-search-wrap">
              <Search />
              <input
                className="cp-search"
                placeholder="Search tickets…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
            </div>
          </div>
          <div className="cp-ticket-list">
            {filteredTickets.length === 0 && (
              <div style={{ padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                No tickets found
              </div>
            )}
            {filteredTickets.map(t => (
              <button
                key={t.id}
                className={`cp-ticket-item${String(t.id) === String(selectedId) ? ' active' : ''}`}
                onClick={() => setSelectedId(String(t.id))}
              >
                <span className="cp-ticket-number">{t.ticket_number}</span>
                <span className="cp-ticket-subject">{t.subject}</span>
                <span className="cp-ticket-meta">
                  {t.priority && <span style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    background: t.priority === 'critical' ? '#fee2e2' : t.priority === 'high' ? '#ffedd5' : '#f1f5f9',
                    color: t.priority === 'critical' ? 'var(--danger)' : t.priority === 'high' ? 'var(--warning)' : 'var(--text-muted)',
                    textTransform: 'capitalize'
                  }}>{t.priority}</span>}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Right: AI workspace ── */}
        <div className="cp-main">
          <div className="cp-main-header">
            <div className="cp-main-title">
              <Sparkles size={16} />
              <h1>AI Copilot</h1>
              {selected && (
                <span className="cp-ticket-subject-header">— {selected.subject}</span>
              )}
            </div>
            {selected && (
              <button
                className="cp-regen-btn"
                disabled={analyzing}
                onClick={() => runAnalysis(selectedId)}
              >
                <RotateCcw size={13} style={analyzing ? { animation: 'spin 1s linear infinite' } : {}} />
                {analyzing ? 'Analyzing…' : 'Regenerate'}
              </button>
            )}
          </div>

          {!selected ? (
            <div className="cp-empty-main">
              <Ticket size={40} />
              <h2>No ticket selected</h2>
              <p>Choose a ticket from the list to generate AI insights.</p>
            </div>
          ) : analyzing ? (
            <div className="cp-empty-main">
              <Sparkles size={40} style={{ opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
              <h2>Analyzing ticket…</h2>
              <p>Generating summary, root cause, and draft reply.</p>
            </div>
          ) : !copilot ? (
            <div className="cp-empty-main">
              <Sparkles size={40} />
              <h2>Analysis unavailable</h2>
              <p>Could not generate copilot insights for this ticket.</p>
            </div>
          ) : (
            <div className="cp-accordion-area">
              {/* Summary */}
              <AccordionPanel icon={Sparkles} label="AI Summary" defaultOpen={true}>
                <p className="cp-summary-text">{copilot.summary || '—'}</p>
              </AccordionPanel>

              {/* Suggested Reply / Draft */}
              {copilot.suggested_reply && (
                <AccordionPanel icon={MessageSquare} label="Draft Reply" defaultOpen={true}>
                  <div className="cp-draft-block">{copilot.suggested_reply}</div>
                  <CopyButton text={copilot.suggested_reply} />
                </AccordionPanel>
              )}

              {/* Root Cause */}
              {copilot.root_cause && (
                <AccordionPanel icon={Lightbulb} label="Root Cause" iconColor="var(--warning)">
                  <p>{copilot.root_cause}</p>
                </AccordionPanel>
              )}

              {/* Resolution Steps */}
              {copilot.resolution_recommendations?.length > 0 && (
                <AccordionPanel icon={BookOpen} label="Resolution Steps" iconColor="var(--success)">
                  <ul className="cp-step-list">
                    {copilot.resolution_recommendations.map((step, i) => (
                      <li key={i} className="cp-step-item">
                        <span className="cp-step-num">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionPanel>
              )}

              {/* Similar Tickets */}
              {copilot.similar?.length > 0 && (
                <AccordionPanel icon={Ticket} label={`Similar Tickets (${copilot.similar.length})`}>
                  {copilot.similar.map(t => (
                    <div key={t.id} className="cp-similar-row">
                      <span className="cp-similar-num">{t.ticket_number}</span>
                      <span className="cp-similar-subj">{t.subject}</span>
                    </div>
                  ))}
                </AccordionPanel>
              )}

              {/* Knowledge References */}
              {copilot.sources?.length > 0 && (
                <AccordionPanel icon={BookOpen} label={`Knowledge References (${copilot.sources.length})`}>
                  {copilot.sources.map((s, i) => (
                    <div key={i} className="cp-ref-row">
                      <span className="cp-ref-source">{s.source}</span>
                      <span className="cp-type-badge">{getSourceTypeLabel(s.type)}</span>
                    </div>
                  ))}
                </AccordionPanel>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
