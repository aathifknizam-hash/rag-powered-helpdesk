import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'

const CSS = `
.adash-root {
  padding: 28px 32px;
  background: #f8fafc;
  min-height: 100%;
  color: #0f172a;
  font-family: 'Inter', sans-serif;
}
.adash-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 28px; flex-wrap: wrap; gap: 12px;
}
.adash-title {
  font-size: 1.6rem; font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}
.adash-subtitle { font-size: 0.85rem; color: #64748b; margin: 0; }

.adash-refresh-btn {
  padding: 8px 18px; border-radius: 10px;
  border: 1px solid #e2e8f0; background: #ffffff;
  color: #475569; font-size: 0.82rem; cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.adash-refresh-btn:hover { background: #f8fafc; color: #0f172a; }

/* KPI grid */
.adash-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.adash-kpi {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 18px 16px;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
}
.adash-kpi:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}
.adash-kpi-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
}
.adash-kpi-label {
  font-size: 0.72rem; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.07em;
  margin: 0 0 8px;
}
.adash-kpi-value {
  font-size: 2rem; font-weight: 700; color: #0f172a;
  margin: 0 0 4px; line-height: 1;
}
.adash-kpi-sub { font-size: 0.72rem; color: #64748b; margin: 0; }
.adash-kpi-trend {
  font-size: 0.75rem; font-weight: 600; margin: 6px 0 0;
}
.adash-kpi-trend.up   { color: #10b981; }
.adash-kpi-trend.down { color: #ef4444; }

/* Main 2-col layout */
.adash-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 18px;
}
@media (max-width: 900px) { .adash-grid-2 { grid-template-columns: 1fr; } }

.adash-card {
  background: #ffffff; border: 1px solid #e2e8f0;
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
}
.adash-card-header {
  padding: 14px 18px 10px;
  border-bottom: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: space-between;
}
.adash-card-title {
  font-size: 0.82rem; font-weight: 700; color: #6366f1;
  text-transform: uppercase; letter-spacing: 0.06em; margin: 0;
}
.adash-card-body { padding: 16px 18px; }

/* Status bar chart */
.status-bar-list { display: flex; flex-direction: column; gap: 12px; }
.status-bar-row { display: flex; flex-direction: column; gap: 5px; }
.status-bar-meta { display: flex; justify-content: space-between; font-size: 0.8rem; }
.status-bar-name { color: #475569; text-transform: capitalize; }
.status-bar-count { font-weight: 600; color: #0f172a; }
.status-bar-track {
  height: 7px; background: #f1f5f9; border-radius: 99px; overflow: hidden;
}
.status-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s ease; }

/* Health grid */
.health-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.health-item {
  background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 10px; padding: 12px 14px;
  display: flex; align-items: center; gap: 10px;
}
.health-indicator {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.health-indicator.healthy    { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
.health-indicator.degraded   { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }
.health-indicator.down       { background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
.health-service-name { font-size: 0.82rem; color: #475569; }
.health-service-status { font-size: 0.75rem; font-weight: 600; margin-left: auto; }
.health-service-status.healthy  { color: #10b981; }
.health-service-status.degraded { color: #f59e0b; }
.health-service-status.down     { color: #ef4444; }

/* AI Diagnostics */
.diag-list { display: flex; flex-direction: column; gap: 0; }
.diag-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid #f1f5f9;
  font-size: 0.82rem;
}
.diag-row:last-child { border-bottom: none; }
.diag-key { color: #64748b; }
.diag-val { color: #0f172a; font-weight: 500; }
.diag-badge {
  padding: 2px 10px; border-radius: 99px; font-size: 0.72rem; font-weight: 600;
}
.diag-badge.healthy { background: #d1fae5; color: #065f46; }
.diag-badge.warn    { background: #fef3c7; color: #92400e; }
.diag-badge.error   { background: #fee2e2; color: #991b1b; }

/* SLA summary */
.sla-row {
  display: flex; gap: 12px; flex-wrap: wrap;
}
.sla-cell {
  flex: 1; min-width: 100px;
  background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 10px; padding: 12px 14px; text-align: center;
}
.sla-cell-val { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
.sla-cell-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

/* Storage */
.storage-row { display: flex; flex-direction: column; gap: 12px; }
.storage-item { display: flex; flex-direction: column; gap: 5px; }
.storage-meta { display: flex; justify-content: space-between; font-size: 0.8rem; }
.storage-name { color: #64748b; }
.storage-size { font-weight: 600; color: #6366f1; }
.storage-bar {
  height: 6px; background: #f1f5f9; border-radius: 99px; overflow: hidden;
}
.storage-fill {
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  transition: width 0.4s ease;
}
`

const STATUS_COLORS = {
  new: '#6366f1',
  assigned: '#8b5cf6',
  in_progress: '#f59e0b',
  waiting_customer: '#64748b',
  resolved: '#34d399',
  closed: '#475569',
}

function StatusBars({ ticketStats }) {
  const statuses = ['new', 'assigned', 'in_progress', 'resolved', 'closed']
  const counts = {}
  let total = 0
  if (Array.isArray(ticketStats)) {
    ticketStats.forEach(t => { counts[t.status] = t.count; total += (t.count || 0) })
  } else if (ticketStats && typeof ticketStats === 'object') {
    statuses.forEach(s => { counts[s] = ticketStats[s] || 0; total += (ticketStats[s] || 0) })
  }

  return (
    <div className="status-bar-list">
      {statuses.map(s => {
        const val = counts[s] || 0
        const pct = total ? Math.round((val / total) * 100) : 0
        return (
          <div key={s} className="status-bar-row">
            <div className="status-bar-meta">
              <span className="status-bar-name">{s.replace('_', ' ')}</span>
              <span className="status-bar-count">{val}</span>
            </div>
            <div className="status-bar-track">
              <div
                className="status-bar-fill"
                style={{ width: `${pct}%`, background: STATUS_COLORS[s] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [ticketStats, setTicketStats] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [sla, setSla] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        adminService.getStats(),
        adminService.getTicketAnalytics(),
        adminService.getSLASummary(),
        adminService.getSystemHealth(),
        import('../../services/api').then(m => m.aiDiagnosticsAPI?.get?.()),
      ])
      if (results[0].status === 'fulfilled') setStats(results[0].value.data)
      if (results[1].status === 'fulfilled') setTicketStats(results[1].value.data)
      if (results[2].status === 'fulfilled') setSla(results[2].value.data)
      if (results[3].status === 'fulfilled') setHealth(results[3].value.data)
      if (results[4].status === 'fulfilled') setDiagnostics(results[4].value?.data)
    } catch (err) {
      console.error('Admin dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const slaRate = sla ? Math.round((sla.compliant / Math.max(sla.total, 1)) * 100) : null

  const kpis = [
    {
      label: 'Total Users',
      value: stats?.total_users ?? '—',
      sub: 'Registered accounts',
      color: '#6366f1',
      trend: stats?.user_trend,
    },
    {
      label: 'Active Agents',
      value: stats?.active_agents ?? '—',
      sub: 'In support pool',
      color: '#8b5cf6',
    },
    {
      label: 'Total Tickets',
      value: stats?.total_tickets ?? '—',
      sub: 'All time',
      color: '#a78bfa',
      trend: stats?.ticket_trend,
    },
    {
      label: 'Knowledge Docs',
      value: stats?.kb_articles ?? '—',
      sub: 'Published articles',
      color: '#34d399',
    },
    {
      label: 'Escalated',
      value: stats?.escalated_tickets ?? '—',
      sub: 'Open escalations',
      color: '#ef4444',
    },
    {
      label: 'SLA Compliance',
      value: slaRate !== null ? `${slaRate}%` : '—',
      sub: sla ? `${sla.breached} breached` : 'No SLA data',
      color: slaRate >= 90 ? '#34d399' : slaRate >= 70 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'Resolution Rate',
      value: stats?.resolution_rate ? `${stats.resolution_rate}%` : '—',
      sub: 'Last 30 days',
      color: '#f59e0b',
    },
    {
      label: 'SLA at Risk',
      value: sla?.at_risk ?? '—',
      sub: 'Due in 4h',
      color: '#f97316',
    },
  ]

  const HEALTH_SERVICES = [
    { key: 'api_status', label: 'REST API' },
    { key: 'websocket_status', label: 'WebSockets' },
    { key: 'database_status', label: 'Database' },
    { key: 'vector_db_status', label: 'Vector DB' },
  ]

  const dbSizePct = stats ? Math.min((stats.database_size / 500) * 100, 100) : 0
  const vecSizePct = stats ? Math.min((stats.vector_index_size / 200) * 100, 100) : 0

  return (
    <div className="adash-root">
      <style>{CSS}</style>

      <div className="adash-header">
        <div>
          <h1 className="adash-title">Command Center</h1>
          <p className="adash-subtitle">Platform overview — live system metrics and operational health</p>
        </div>
        <button className="adash-refresh-btn" onClick={fetchData} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* KPI row */}
      <div className="adash-kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="adash-kpi">
            <div className="adash-kpi-bar" style={{ background: k.color }} />
            <p className="adash-kpi-label">{k.label}</p>
            <p className="adash-kpi-value">{k.value}</p>
            <p className="adash-kpi-sub">{k.sub}</p>
            {k.trend && (
              <p className={`adash-kpi-trend ${k.trend.direction}`}>
                {k.trend.direction === 'up' ? '▲' : '▼'} {k.trend.percentage}% this week
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="adash-card" style={{ marginBottom: '18px' }}>
        <div className="adash-card-header">
          <h3 className="adash-card-title">Quick Access</h3>
        </div>
        <div className="adash-card-body" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/tickets')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', textAlign: 'left', cursor: 'pointer' }}
          >
            <strong>Tickets</strong>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>Manage tickets and SLA flow.</div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', textAlign: 'left', cursor: 'pointer' }}
          >
            <strong>Users</strong>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>Agent and user management.</div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/agents')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', textAlign: 'left', cursor: 'pointer' }}
          >
            <strong>Agents</strong>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>Review routing and capacity.</div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/knowledge')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', textAlign: 'left', cursor: 'pointer' }}
          >
            <strong>Knowledge Base</strong>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>Control knowledge and articles.</div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/analytics')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', textAlign: 'left', cursor: 'pointer' }}
          >
            <strong>Analytics</strong>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>Surface performance trends.</div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/settings')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', textAlign: 'left', cursor: 'pointer' }}
          >
            <strong>Settings</strong>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>Maintenance and system tools.</div>
          </button>
        </div>
      </div>

      {/* Row 1: Status + Health */}
      <div className="adash-grid-2">
        <div className="adash-card">
          <div className="adash-card-header">
            <h3 className="adash-card-title">Ticket Status Breakdown</h3>
          </div>
          <div className="adash-card-body">
            <StatusBars ticketStats={ticketStats} />
          </div>
        </div>

        <div className="adash-card">
          <div className="adash-card-header">
            <h3 className="adash-card-title">System Health</h3>
          </div>
          <div className="adash-card-body">
            <div className="health-grid">
              {HEALTH_SERVICES.map(svc => {
                const st = health?.[svc.key] || 'unknown'
                return (
                  <div key={svc.key} className="health-item">
                    <div className={`health-indicator ${st}`} />
                    <span className="health-service-name">{svc.label}</span>
                    <span className={`health-service-status ${st}`}>{st}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: SLA + Storage */}
      <div className="adash-grid-2">
        <div className="adash-card">
          <div className="adash-card-header">
            <h3 className="adash-card-title">SLA Overview</h3>
          </div>
          <div className="adash-card-body">
            <div className="sla-row">
              <div className="sla-cell">
                <div className="sla-cell-val" style={{ color: '#6366f1' }}>{sla?.total ?? '—'}</div>
                <div className="sla-cell-label">Total</div>
              </div>
              <div className="sla-cell">
                <div className="sla-cell-val" style={{ color: '#34d399' }}>{sla?.compliant ?? '—'}</div>
                <div className="sla-cell-label">Compliant</div>
              </div>
              <div className="sla-cell">
                <div className="sla-cell-val" style={{ color: '#f59e0b' }}>{sla?.at_risk ?? '—'}</div>
                <div className="sla-cell-label">At Risk</div>
              </div>
              <div className="sla-cell">
                <div className="sla-cell-val" style={{ color: '#ef4444' }}>{sla?.breached ?? '—'}</div>
                <div className="sla-cell-label">Breached</div>
              </div>
            </div>
          </div>
        </div>

        <div className="adash-card">
          <div className="adash-card-header">
            <h3 className="adash-card-title">Storage</h3>
          </div>
          <div className="adash-card-body">
            <div className="storage-row">
              <div className="storage-item">
                <div className="storage-meta">
                  <span className="storage-name">Database</span>
                  <span className="storage-size">{stats?.database_size ?? 0} MB</span>
                </div>
                <div className="storage-bar">
                  <div className="storage-fill" style={{ width: `${dbSizePct}%` }} />
                </div>
              </div>
              <div className="storage-item">
                <div className="storage-meta">
                  <span className="storage-name">Vector Index (ChromaDB)</span>
                  <span className="storage-size">{stats?.vector_index_size ?? 0} MB</span>
                </div>
                <div className="storage-bar">
                  <div className="storage-fill" style={{ width: `${vecSizePct}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Diagnostics */}
      {diagnostics && (
        <div className="adash-card">
          <div className="adash-card-header">
            <h3 className="adash-card-title">AI Engine Diagnostics</h3>
          </div>
          <div className="adash-card-body">
            <div className="diag-list">
              <div className="diag-row">
                <span className="diag-key">Groq Status</span>
                <span className={`diag-badge ${diagnostics.groq_status === 'healthy' ? 'healthy' : 'error'}`}>
                  {diagnostics.groq_status}
                </span>
              </div>
              <div className="diag-row">
                <span className="diag-key">Model</span>
                <span className="diag-val" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{diagnostics.model_name}</span>
              </div>
              <div className="diag-row">
                <span className="diag-key">RAG Mode</span>
                <span className={`diag-badge ${diagnostics.rag_response_mode === 'retrieval_and_llm' ? 'healthy' : 'warn'}`}>
                  {diagnostics.rag_response_mode}
                </span>
              </div>
              <div className="diag-row">
                <span className="diag-key">Last Response Time</span>
                <span className="diag-val">{diagnostics.last_response_time_ms ?? '—'} ms</span>
              </div>
              <div className="diag-row">
                <span className="diag-key">Probe Confidence</span>
                <span className="diag-val">
                  {diagnostics.last_probe_confidence != null
                    ? `${Math.round(diagnostics.last_probe_confidence * 100)}%`
                    : '—'}
                </span>
              </div>
              <div className="diag-row">
                <span className="diag-key">Fallback Usage</span>
                <span className={`diag-badge ${diagnostics.fallback_usage ? 'warn' : 'healthy'}`}>
                  {diagnostics.fallback_usage ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}