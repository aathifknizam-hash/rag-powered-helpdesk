import React, { useState, useEffect } from 'react'
import { Card, CardBody, Button, Badge } from '../common/UIComponents'
import { PageHeader } from '../common/Layout'
import { adminService } from '../../services/adminService'
import { normalizeList } from '../../utils/apiHelpers'
import { formatDateTime } from '../../utils/formatDate'
import { Search, Calendar, ShieldAlert } from 'lucide-react'

const CSS = `
.au-feed-row {
  display: grid;
  grid-template-columns: 140px 220px 200px 1fr;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 0.82rem;
  color: var(--text-secondary);
  background: var(--surface);
  transition: background 0.1s;
}
.au-feed-row:hover {
  background: var(--bg);
}
.au-feed-header {
  display: grid;
  grid-template-columns: 140px 220px 200px 1fr;
  align-items: center;
  padding: 10px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}
.au-feed-timestamp {
  font-family: monospace;
  color: var(--text-muted);
}
.au-feed-user {
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-all;
  padding-right: 12px;
}
.au-feed-action {
  font-weight: 500;
}
.au-feed-resource {
  font-family: monospace;
  color: var(--text-muted);
  font-size: 0.76rem;
}
`

export function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { fetchLogs() }, [actionFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const filters = actionFilter ? { action: actionFilter } : {}
      const res = await adminService.getAuditLogs(filters)
      setLogs(normalizeList(res.data))
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter local listings for search and date range
  const filteredLogs = logs.filter(log => {
    const textMatch = !searchQuery || 
      (log.user_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entity_type || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!textMatch) return false

    if (dateFrom) {
      const logDate = new Date(log.created_at)
      const filterDate = new Date(dateFrom)
      if (logDate < filterDate) return false
    }

    if (dateTo) {
      const logDate = new Date(log.created_at)
      const filterDate = new Date(dateTo)
      // add 1 day to include selected date fully
      filterDate.setDate(filterDate.getDate() + 1)
      if (logDate > filterDate) return false
    }

    return true
  })

  return (
    <div className="p-6 bg-slate-50 min-h-full font-sans">
      <style>{CSS}</style>

      {/* 1. Page Title & 2. Description */}
      <PageHeader 
        title="Audit Logs" 
        subtitle="Security, configuration overrides, and administrative activity trail" 
      />

      {/* 4. Filters & Search */}
      <Card className="mb-4 border-slate-200 bg-white">
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, action, target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="LOCK_USER">Lock User</option>
              <option value="UNLOCK_USER">Unlock User</option>
              <option value="ASSIGN_TICKETS">Assign Tickets</option>
              <option value="BACKUP_DATABASE">Backup Database</option>
            </select>

            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent focus:outline-none border-0 p-0 text-xs text-slate-700 w-full"
              />
            </div>

            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent focus:outline-none border-0 p-0 text-xs text-slate-700 w-full"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 5. Main Content (Activity Feed Layout) */}
      <Card className="border-slate-200 bg-white">
        <CardBody className="p-0">
          <div className="au-feed-header">
            <div>Timestamp</div>
            <div>User</div>
            <div>Action</div>
            <div>Target Resource</div>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="p-4 flex gap-4">
                  <div className="h-4 w-24 bg-slate-200 animate-pulse rounded" />
                  <div className="h-4 w-48 bg-slate-200 animate-pulse rounded" />
                  <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
                  <div className="h-4 w-full bg-slate-200 animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No audit events match your filters.</p>
              <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query or selecting a wider date range.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <div key={log.id} className="au-feed-row">
                  <div className="au-feed-timestamp">{formatDateTime(log.created_at)}</div>
                  <div className="au-feed-user">{log.user_email || 'System'}</div>
                  <div className="au-feed-action">
                    <Badge size="sm" variant="info" className="uppercase font-semibold tracking-wider">
                      {log.action?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="au-feed-resource">{log.entity_type}:{log.entity_id}</div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
