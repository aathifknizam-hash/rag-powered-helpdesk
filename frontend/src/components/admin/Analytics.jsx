import React, { useState, useEffect, useMemo } from 'react'
import { adminService } from '../../services/adminService'

// ─── Tiny SVG chart helpers ──────────────────────────────────────────────────

function BarChart({ data = [], valueKey = 'count', labelKey = 'label', color = '#3b82f6', height = 140 }) {
  if (!data.length) return <EmptyChart />
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1)
  return (
    <div className="an-bar-chart" style={{ height }}>
      {data.map((d, i) => {
        const pct = ((d[valueKey] || 0) / max) * 100
        return (
          <div key={i} className="an-bar-col" title={`${d[labelKey]}: ${d[valueKey]}`}>
            <span className="an-bar-value">{d[valueKey] || 0}</span>
            <div className="an-bar-track">
              <div className="an-bar-fill" style={{ height: `${pct}%`, background: color }} />
            </div>
            <span className="an-bar-label">{(d[labelKey] || '').toString().slice(0, 8)}</span>
          </div>
        )
      })}
    </div>
  )
}

function LineChart({ data = [], valueKey = 'count', labelKey = 'date', color = '#6366f1', height = 140 }) {
  if (data.length < 2) return <EmptyChart />
  const values = data.map(d => d[valueKey] || 0)
  const max = Math.max(...values, 1)
  const w = 600, h = height
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 40) + 20
    const y = h - 20 - ((v / max) * (h - 40))
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  const area = `20,${h - 20} ${polyline} ${(w - 20)},${h - 20}`

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineFillEnt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#lineFillEnt)" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => {
          const [x, y] = pts[i].split(',').map(Number)
          return (
            <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="#fff" strokeWidth="1.5">
              <title>{`${data[i][labelKey]}: ${v}`}</title>
            </circle>
          )
        })}
      </svg>
    </div>
  )
}

function DonutChart({ segments = [], size = 120 }) {
  if (!segments.length) return <EmptyChart />
  const total = segments.reduce((s, d) => s + (d.value || 0), 0) || 1
  const r = 45, cx = 60, cy = 60, circumference = 2 * Math.PI * r
  let offset = 0
  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

  return (
    <div className="an-donut-wrap">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        {segments.map((seg, i) => {
          const dashLen = (seg.value / total) * circumference
          const dash = `${dashLen} ${circumference - dashLen}`
          const rotate = (offset / total) * 360 - 90
          offset += seg.value
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="20"
              strokeDasharray={dash}
              strokeDashoffset="0"
              transform={`rotate(${rotate} ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            >
              <title>{`${seg.label}: ${seg.value}`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="an-donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="an-legend-item">
            <span className="an-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span>{seg.label}</span>
            <span className="an-legend-val">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="an-empty-chart">
      <span>No data available</span>
    </div>
  )
}

function KPICard({ label, value, sub, accent = '#6366f1', trend }) {
  return (
    <div className="an-kpi-card" style={{ '--kpi-accent': accent }}>
      <div className="an-kpi-accent-bar" />
      <p className="an-kpi-label">{label}</p>
      <p className="an-kpi-value">{value}</p>
      {sub && <p className="an-kpi-sub">{sub}</p>}
      {trend && (
        <p className={`an-kpi-trend ${trend.dir}`}>
          {trend.dir === 'up' ? '↑' : '↓'} {trend.pct}%
        </p>
      )}
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="an-section-card">
      <div className="an-section-header">{title}</div>
      <div className="an-section-body">{children}</div>
    </div>
  )
}

// ─── Main Analytics Component ────────────────────────────────────────────────

export function Analytics() {
  const [volume, setVolume] = useState([])
  const [byDept, setByDept] = useState([])
  const [byPriority, setByPriority] = useState([])
  const [bySentiment, setBySentiment] = useState([])
  const [agentPerf, setAgentPerf] = useState([])
  const [sla, setSla] = useState(null)
  const [resTrend, setResTrend] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)

  useEffect(() => { fetchAll() }, [range])

  const fetchAll = async () => {
    setLoading(true)
    const results = await Promise.allSettled([
      adminService.getStats(),
      adminService.getTicketVolume(range),
      adminService.getByDepartment(),
      adminService.getByPriority(),
      adminService.getBySentiment(),
      adminService.getAgentPerformance(),
      adminService.getSLASummary(),
      adminService.getResolutionTrend(range),
    ])
    if (results[0].status === 'fulfilled') setStats(results[0].value.data)
    if (results[1].status === 'fulfilled') setVolume(results[1].value.data)
    if (results[2].status === 'fulfilled') setByDept(results[2].value.data)
    if (results[3].status === 'fulfilled') setByPriority(results[3].value.data)
    if (results[4].status === 'fulfilled') setBySentiment(results[4].value.data)
    if (results[5].status === 'fulfilled') setAgentPerf(results[5].value.data)
    if (results[6].status === 'fulfilled') setSla(results[6].value.data)
    if (results[7].status === 'fulfilled') setResTrend(results[7].value.data)
    setLoading(false)
  }

  const priorityData = useMemo(() =>
    byPriority.map(d => ({ label: d.priority, count: d.count }))
  , [byPriority])

  const sentimentSegments = useMemo(() =>
    bySentiment.map(d => ({ label: d.sentiment, value: d.count }))
  , [bySentiment])

  const deptBarData = useMemo(() =>
    byDept.slice(0, 8).map(d => ({ label: d.department, count: d.total }))
  , [byDept])

  const slaRate = sla ? Math.round((sla.compliant / Math.max(sla.total, 1)) * 100) : 0

  return (
    <div className="an-root">
      <style>{CSS}</style>

      {/* Header */}
      <div className="an-header">
        <div>
          <h1 className="an-title">Analytics &amp; Insights</h1>
          <p className="an-subtitle">Operational intelligence across your service desk</p>
        </div>
        <div className="an-controls">
          <div className="an-range-group">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                className={`an-range-btn${range === d ? ' active' : ''}`}
                onClick={() => setRange(d)}
              >
                {d}d
              </button>
            ))}
          </div>
          <button className="an-refresh-btn" onClick={fetchAll} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="an-loading">
          <div className="an-loading-bar" />
        </div>
      )}

      {/* KPI Row */}
      <div className="an-kpi-row">
        <KPICard
          label="Total Tickets"
          value={stats?.total_tickets ?? '—'}
          sub="All time"
          accent="#6366f1"
          trend={stats?.ticket_trend ? { dir: stats.ticket_trend.direction, pct: stats.ticket_trend.percentage } : null}
        />
        <KPICard label="Active Agents" value={stats?.active_agents ?? '—'} sub="Online now" accent="#3b82f6" />
        <KPICard
          label="Resolution Rate"
          value={stats?.resolution_rate ? `${stats.resolution_rate}%` : '—'}
          sub={`Last ${range} days`}
          accent="#10b981"
        />
        <KPICard
          label="SLA Compliance"
          value={sla ? `${slaRate}%` : '—'}
          sub={sla ? `${sla.breached} breached` : ''}
          accent={slaRate >= 90 ? '#10b981' : slaRate >= 70 ? '#f59e0b' : '#ef4444'}
        />
        <KPICard label="Escalated" value={stats?.escalated_tickets ?? '—'} sub="Open escalations" accent="#ef4444" />
        <KPICard label="SLA at Risk" value={sla?.at_risk ?? '—'} sub="Next 4 hours" accent="#f59e0b" />
      </div>

      {/* Volume Chart */}
      <div className="an-grid-full">
        <SectionCard title={`Ticket Volume — Last ${range} Days`}>
          <LineChart data={volume} valueKey="count" labelKey="date" color="#6366f1" height={160} />
        </SectionCard>
      </div>

      {/* Middle Row */}
      <div className="an-grid-2col">
        <SectionCard title="Tickets by Department">
          <BarChart data={deptBarData} valueKey="count" labelKey="label" color="#3b82f6" height={160} />
        </SectionCard>
        <SectionCard title="Sentiment Distribution">
          <DonutChart segments={sentimentSegments} size={130} />
        </SectionCard>
      </div>

      {/* Priority + Resolution Trend */}
      <div className="an-grid-2col">
        <SectionCard title="Tickets by Priority">
          <BarChart data={priorityData} valueKey="count" labelKey="label" color="#f59e0b" height={140} />
        </SectionCard>
        <SectionCard title="Daily Resolutions">
          <LineChart data={resTrend} valueKey="count" labelKey="date" color="#10b981" height={140} />
        </SectionCard>
      </div>

      {/* Department breakdown table */}
      {byDept.length > 0 && (
        <SectionCard title="Department Breakdown">
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Open</th>
                  <th>Resolved</th>
                  <th>Escalated</th>
                  <th>Resolution %</th>
                </tr>
              </thead>
              <tbody>
                {byDept.map((d, i) => (
                  <tr key={i}>
                    <td className="an-td-dept">{d.department}</td>
                    <td><strong>{d.total}</strong></td>
                    <td><span className="badge-open">{d.open}</span></td>
                    <td><span className="badge-resolved">{d.resolved}</span></td>
                    <td><span className={d.escalated > 0 ? 'badge-escalated' : 'badge-zero'}>{d.escalated}</span></td>
                    <td>
                      <div className="an-mini-progress">
                        <div className="an-mini-track">
                          <div className="an-mini-fill" style={{ width: `${Math.round((d.resolved / Math.max(d.total, 1)) * 100)}%` }} />
                        </div>
                        <span>{Math.round((d.resolved / Math.max(d.total, 1)) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Agent Performance Table */}
      {agentPerf.length > 0 && (
        <SectionCard title="Agent Performance Leaderboard">
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Agent</th>
                  <th>Department</th>
                  <th>Resolved</th>
                  <th>Active</th>
                  <th>Avg. Resolution</th>
                  <th>Success Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {agentPerf.map((a, i) => (
                  <tr key={a.id}>
                    <td className="an-rank">{i + 1}</td>
                    <td>
                      <div className="an-agent-cell">
                        <div className="an-agent-avatar">{(a.name || a.email)[0].toUpperCase()}</div>
                        <div>
                          <div className="an-agent-name">{a.name}</div>
                          <div className="an-agent-email">{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{a.department || '—'}</td>
                    <td><strong>{a.resolved}</strong></td>
                    <td>{a.active}/{a.max_active}</td>
                    <td>{a.avg_resolution_hours}h</td>
                    <td>
                      <div className="an-success-bar">
                        <div className="an-success-track">
                          <div className="an-success-fill" style={{ width: `${a.success_rate}%` }} />
                        </div>
                        <span>{a.success_rate}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`an-status-badge ${a.is_available ? 'available' : 'unavailable'}`}>
                        {a.is_available ? 'Available' : 'Away'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Scoped CSS ──────────────────────────────────────────────────────────────

const CSS = `
.an-root {
  padding: 28px 32px;
  background: #f8fafc;
  min-height: 100%;
  color: #0f172a;
  font-family: 'Inter', system-ui, sans-serif;
}

.an-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.an-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 3px;
  letter-spacing: -0.01em;
}

.an-subtitle {
  font-size: 0.83rem;
  color: #64748b;
  margin: 0;
}

.an-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.an-range-group {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.an-range-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border-right: 1px solid #e2e8f0;
  font-family: inherit;
}
.an-range-btn:last-child { border-right: none; }
.an-range-btn:hover { background: #f1f5f9; color: #0f172a; }
.an-range-btn.active { background: #0f172a; color: #fff; }

.an-refresh-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.an-refresh-btn:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
.an-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.an-loading {
  margin-bottom: 16px;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}
.an-loading-bar {
  height: 100%;
  width: 40%;
  background: #6366f1;
  border-radius: 2px;
  animation: anSlide 1.2s ease-in-out infinite;
}
@keyframes anSlide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

/* KPI Cards */
.an-kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.an-kpi-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.an-kpi-accent-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--kpi-accent, #6366f1);
  border-radius: 10px 10px 0 0;
}

.an-kpi-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  margin: 4px 0 8px;
}

.an-kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
  line-height: 1;
  letter-spacing: -0.02em;
}

.an-kpi-sub {
  font-size: 0.72rem;
  color: #94a3b8;
  margin: 0;
}

.an-kpi-trend {
  font-size: 0.73rem;
  font-weight: 600;
  margin: 6px 0 0;
}
.an-kpi-trend.up { color: #10b981; }
.an-kpi-trend.down { color: #ef4444; }

/* Grids */
.an-grid-full { margin-bottom: 16px; }
.an-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 900px) { .an-grid-2col { grid-template-columns: 1fr; } }

/* Section Cards */
.an-section-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 0;
}

.an-section-header {
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #fafafa;
}

.an-section-body { padding: 16px; }

/* Bar Chart */
.an-bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  width: 100%;
}

.an-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 24px;
}

.an-bar-value { font-size: 0.62rem; color: #64748b; }

.an-bar-track {
  width: 100%;
  background: #f1f5f9;
  border-radius: 4px 4px 0 0;
  flex: 1;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.an-bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: height 0.4s ease;
}

.an-bar-label { font-size: 0.62rem; color: #94a3b8; text-align: center; word-break: break-all; }

.an-empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: #94a3b8;
  font-size: 0.82rem;
}

/* Donut */
.an-donut-wrap { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.an-donut-legend { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.an-legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: #374151; }
.an-legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.an-legend-val { margin-left: auto; font-weight: 600; color: #0f172a; }

/* Tables */
.an-table-wrap { overflow-x: auto; }
.an-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.an-table th {
  text-align: left;
  padding: 9px 12px;
  color: #64748b;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
  background: #fafafa;
}
.an-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f8fafc;
  color: #374151;
  vertical-align: middle;
}
.an-table tr:last-child td { border-bottom: none; }
.an-table tr:hover td { background: #fafafa; }
.an-td-dept { font-weight: 500; color: #0f172a; }

/* Badges */
.badge-open     { color: #d97706; background: #fef3c7; padding: 2px 8px; border-radius: 4px; font-size: 0.73rem; font-weight: 500; }
.badge-resolved { color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 4px; font-size: 0.73rem; font-weight: 500; }
.badge-escalated{ color: #dc2626; background: #fee2e2; padding: 2px 8px; border-radius: 4px; font-size: 0.73rem; font-weight: 500; }
.badge-zero     { color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.73rem; font-weight: 500; }

/* Mini progress */
.an-mini-progress { display: flex; align-items: center; gap: 8px; }
.an-mini-track { flex: 1; height: 5px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
.an-mini-fill { height: 100%; background: #6366f1; border-radius: 99px; transition: width 0.4s ease; }

.an-rank { color: #94a3b8; font-weight: 700; }

/* Agent cell */
.an-agent-cell { display: flex; align-items: center; gap: 10px; }
.an-agent-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.8rem;
  flex-shrink: 0;
}
.an-agent-name { font-weight: 600; color: #0f172a; font-size: 0.82rem; }
.an-agent-email { font-size: 0.7rem; color: #94a3b8; }

/* Success bar */
.an-success-bar { display: flex; align-items: center; gap: 8px; }
.an-success-track { width: 60px; height: 5px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
.an-success-fill { height: 100%; background: #10b981; border-radius: 99px; }

/* Status badge */
.an-status-badge { font-size: 0.72rem; font-weight: 500; padding: 3px 8px; border-radius: 4px; }
.an-status-badge.available   { background: #d1fae5; color: #059669; }
.an-status-badge.unavailable { background: #f1f5f9; color: #94a3b8; }
`
