import React, { useState, useEffect } from 'react'
import { Plus, Search, MessageCircle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loading, EmptyState } from '../common/UIComponents'
import { PageHeader } from '../common/Layout'
import { ticketAPI } from '../../services/api'
import { normalizeList } from '../../utils/apiHelpers'
import { CreateTicketModal } from './CreateTicketModal'
import { formatDate } from '../../utils/formatDate'

/* ─── Scoped CSS ─────────────────────────────────────────────────────────── */
const CSS = `
.tl-root {
  padding: 28px 32px;
  background: var(--bg);
  min-height: 100%;
  font-family: 'Inter', system-ui, sans-serif;
}
.tl-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.tl-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
}
.tl-search-wrap svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  width: 14px;
  height: 14px;
  pointer-events: none;
}
.tl-search {
  width: 100%;
  padding: 8px 10px 8px 30px;
  font-size: 0.82rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
  outline: none;
  font-family: inherit;
}
.tl-search:focus { border-color: var(--info); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
.tl-select {
  padding: 8px 10px;
  font-size: 0.82rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  font-family: inherit;
  min-width: 150px;
}
.tl-select:focus { border-color: var(--info); }
.tl-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--info);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.12s;
  white-space: nowrap;
}
.tl-new-btn:hover { opacity: 0.88; }

/* Table */
.tl-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.tl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.tl-table th {
  text-align: left;
  padding: 11px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
.tl-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
  vertical-align: middle;
}
.tl-table tr:last-child td { border-bottom: none; }
.tl-table tbody tr {
  cursor: pointer;
  transition: background 0.1s;
}
.tl-table tbody tr:hover td { background: var(--bg); }
.tl-ticket-num {
  font-family: monospace;
  color: var(--info);
  font-size: 0.72rem;
}
.tl-subject {
  font-weight: 600;
  color: var(--text-primary);
}
.tl-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
}
.tl-badge-critical { background: #fee2e2; color: var(--danger); }
.tl-badge-high     { background: #ffedd5; color: var(--warning); }
.tl-badge-medium   { background: #fef9c3; color: #854d0e; }
.tl-badge-low      { background: #f1f5f9; color: var(--text-muted); }
.tl-badge-status   { background: #eff6ff; color: var(--info); }
.tl-date           { font-size: 0.78rem; color: var(--text-muted); }
`

function priorityClass(p) {
  if (p === 'critical') return 'tl-badge tl-badge-critical'
  if (p === 'high')     return 'tl-badge tl-badge-high'
  if (p === 'medium')   return 'tl-badge tl-badge-medium'
  return 'tl-badge tl-badge-low'
}

export function TicketList({ mode = 'user' }) {
  const navigate = useNavigate()
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQ, setSearchQ]   = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchTickets() }, [mode])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = mode === 'agent'
        ? await ticketAPI.list()
        : await ticketAPI.getMyTickets()
      setTickets(normalizeList(response.data))
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = tickets.filter(t => {
    const matchStatus = !statusFilter || t.status === statusFilter
    const q = searchQ.trim().toLowerCase()
    const matchSearch = !q ||
      (t.subject || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.ticket_number || '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const location = useLocation()
  const basePath = location.pathname.replace(/\/$/, '')
  const title = mode === 'agent' ? 'Ticket Queue' : 'My Tickets'
  const subtitle = mode === 'agent' ? 'All tickets in your queue' : 'Your support requests'

  if (loading) return <Loading fullscreen />

  return (
    <>
      <style>{CSS}</style>
      <div className="tl-root">
        <PageHeader
          title={title}
          subtitle={subtitle}
          action={
            mode === 'user' && (
              <button className="tl-new-btn" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> New Ticket
              </button>
            )
          }
        />

        {/* Filters */}
        <div className="tl-filters">
          <div className="tl-search-wrap">
            <Search />
            <input
              className="tl-search"
              placeholder="Search tickets…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
          <select
            className="tl-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Table card */}
        <div className="tl-card">
          {filtered.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No tickets"
              message={mode === 'user' ? 'Create your first support request' : 'Queue is empty'}
              action={
                mode === 'user' && (
                  <button className="tl-new-btn" onClick={() => setShowCreate(true)}>
                    <Plus size={14} /> Create Ticket
                  </button>
                )
              }
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tl-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    {mode === 'agent' && <th>User</th>}
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ticket => (
                    <tr
                      key={ticket.id}
                      onClick={() => navigate(`${basePath}/${ticket.id}`)}
                    >
                      <td><span className="tl-ticket-num">{ticket.ticket_number}</span></td>
                      <td><span className="tl-subject">{ticket.subject}</span></td>
                      <td>
                        <span className={priorityClass(ticket.priority)}>
                          {ticket.priority || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="tl-badge tl-badge-status">
                          {(ticket.status || '').replace('_', ' ')}
                        </span>
                      </td>
                      {mode === 'agent' && (
                        <td style={{ color: 'var(--text-muted)' }}>
                          {ticket.customer?.email || '—'}
                        </td>
                      )}
                      <td><span className="tl-date">{formatDate(ticket.updated_at)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {mode === 'user' && (
          <CreateTicketModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={fetchTickets}
          />
        )}
      </div>
    </>
  )
}
