import React, { useState, useEffect, useCallback } from 'react'
import { adminService } from '../../services/adminService'
import { ChevronDown, ChevronUp, RefreshCw, UserCheck, ShieldAlert, Award } from 'lucide-react'
import { Badge } from '../common/UIComponents'

const CSS = `
.rt-root {
  padding: 28px 32px;
  background: var(--bg);
  min-height: 100%;
  font-family: 'Inter', system-ui, sans-serif;
}

.rt-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.rt-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 3px; letter-spacing: -0.01em; }
.rt-subtitle { font-size: 0.83rem; color: var(--text-muted); margin: 0; }

.rt-refresh-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text-secondary); font-size: 0.8rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.rt-refresh-btn:hover:not(:disabled) { background: var(--bg); border-color: #cbd5e1; }
.rt-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* KPI bar */
.rt-kpi-bar {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px; margin-bottom: 20px;
}
.rt-kpi-cell {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 14px;
  display: flex; flex-direction: column; gap: 3px;
}
.rt-kpi-val { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
.rt-kpi-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

/* Weights Accordion */
.rt-weight-accordion {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  margin-bottom: 20px;
  overflow: hidden;
}
.rt-weight-header {
  width: 100%; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
  background: var(--surface); cursor: pointer; border: none; font-family: inherit;
  font-weight: 600; color: var(--text-primary); font-size: 0.8rem;
}
.rt-weight-header:hover { background: var(--bg); }
.rt-weight-panel {
  padding: 14px 16px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: var(--bg);
}
.rt-weight-pill {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.75rem; color: var(--text-secondary);
  background: var(--surface); border: 1px solid var(--border);
  padding: 3px 10px; border-radius: 99px;
}
.rt-weight-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rt-weight-pct { font-weight: 700; }

/* Filters */
.rt-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
.rt-filter-select {
  padding: 7px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text-secondary); font-size: 0.8rem;
  outline: none; cursor: pointer; font-family: inherit;
}
.rt-filter-select:focus { border-color: #6366f1; }

/* Agent table */
.rt-table-wrap { overflow-x: auto; }
.rt-table {
  width: 100%; border-collapse: collapse; font-size: 0.82rem;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden;
}
.rt-table th {
  text-align: left; padding: 10px 14px;
  color: var(--text-muted); font-weight: 600;
  font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border); background: var(--bg);
  white-space: nowrap;
}
.rt-table td {
  padding: 12px 14px; border-bottom: 1px solid var(--border);
  color: var(--text-secondary); vertical-align: middle;
}
.rt-table tr:last-child td { border-bottom: none; }
.rt-table tr:hover td { background: var(--bg); }

/* Agent cell */
.rt-agent-cell { display: flex; align-items: center; gap: 10px; }
.rt-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: #e0e7ff; color: #4338ca;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
}
.rt-agent-name { font-weight: 600; color: var(--text-primary); font-size: 0.82rem; }
.rt-agent-email { font-size: 0.7rem; color: var(--text-muted); }

/* Status badge */
.rt-status-badge { font-size: 0.72rem; font-weight: 500; padding: 3px 9px; border-radius: 4px; white-space: nowrap; }
.rt-status-badge.available   { background: #d1fae5; color: #059669; }
.rt-status-badge.unavailable { background: var(--bg); color: var(--text-muted); }

/* Workload bar */
.rt-workload { display: flex; align-items: center; gap: 8px; min-width: 120px; }
.rt-workload-bar { flex: 1; height: 5px; background: var(--bg); border-radius: 99px; overflow: hidden; }
.rt-workload-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
.rt-workload-label { font-size: 0.73rem; color: var(--text-secondary); white-space: nowrap; }

/* Inline edit form */
.rt-edit-row {
  display: flex; gap: 8px; align-items: center;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 10px 12px; flex-wrap: wrap;
  margin-top: 8px;
}
.rt-edit-label { font-size: 0.73rem; color: var(--text-secondary); font-weight: 500; min-width: 72px; }
.rt-edit-input {
  padding: 5px 9px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text-primary); font-size: 0.8rem; width: 64px; outline: none;
}
.rt-edit-input:focus { border-color: #6366f1; }
.rt-edit-select {
  padding: 5px 9px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text-primary); font-size: 0.8rem; flex: 1; outline: none;
}
.rt-edit-select:focus { border-color: #6366f1; }

.rt-btn-ghost {
  padding: 5px 12px; border-radius: 6px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-secondary); font-size: 0.78rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.rt-btn-ghost:hover { background: var(--border); }

/* Toast */
.rt-toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  background: var(--text-primary); border-radius: var(--radius-sm); padding: 12px 20px;
  color: var(--surface); font-size: 0.82rem; font-weight: 500;
  box-shadow: var(--shadow-md);
}
.rt-empty {
  text-align: center; padding: 60px 20px; color: var(--text-muted);
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
}
`

const WEIGHT_INFO = [
  { label: 'Department Match', pct: 30, color: '#6366f1' },
  { label: 'Expertise Score',  pct: 25, color: '#3b82f6' },
  { label: 'KB Coverage',      pct: 15, color: '#8b5cf6' },
  { label: 'Success Rate',     pct: 10, color: '#10b981' },
  { label: 'Workload',         pct: 10, color: '#f59e0b' },
  { label: 'Sentiment Handling', pct: 10, color: '#ec4899' },
]

function WorkloadCell({ active, max }) {
  const pct = Math.min((active / Math.max(max, 1)) * 100, 100)
  const color = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--success)'
  return (
    <div className="rt-workload">
      <div className="rt-workload-bar">
        <div className="rt-workload-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="rt-workload-label">{active}/{max}</span>
    </div>
  )
}

function AgentRow({ agent, departments, onSave, onToast }) {
  const [editing, setEditing] = useState(false)
  const [maxTickets, setMaxTickets] = useState(agent.max_active_tickets || 10)
  const [deptId, setDeptId] = useState(agent.department_id || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMaxTickets(agent.max_active_tickets || 10)
    setDeptId(agent.department_id || '')
  }, [agent])

  const toggleAvailability = async () => {
    try {
      await adminService.updateAgentRouting(agent.id, { is_available: !agent.is_available })
      onToast(`${agent.name} marked ${!agent.is_available ? 'available' : 'unavailable'}`)
      onSave()
    } catch { onToast('Failed to update availability') }
  }

  const save = async () => {
    setSaving(true)
    try {
      await adminService.updateAgentRouting(agent.id, {
        max_active_tickets: parseInt(maxTickets),
        department: deptId || null,
      })
      onToast('Routing rules saved')
      setEditing(false)
      onSave()
    } catch { onToast('Save failed') }
    setSaving(false)
  }

  return (
    <>
      <tr>
        <td>
          <div className="rt-agent-cell">
            <div className="rt-avatar">{(agent.name || agent.email)[0].toUpperCase()}</div>
            <div>
              <div className="rt-agent-name">{agent.name}</div>
              <div className="rt-agent-email">{agent.email}</div>
            </div>
          </div>
        </td>
        <td>
          {agent.department
            ? <span className="rt-dept-badge">{agent.department}</span>
            : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
          }
        </td>
        <td>
          <span className={`rt-status-badge ${agent.is_available ? 'available' : 'unavailable'}`}>
            {agent.is_available ? 'Available' : 'Away'}
          </span>
        </td>
        <td><WorkloadCell active={agent.active} max={agent.max_active} /></td>
        <td className="font-semibold text-slate-800">{agent.expertise_score?.toFixed(1) || '0.0'}</td>
        <td style={{ color: 'var(--info)', fontWeight: 600 }}>{agent.success_rate}%</td>
        <td>
          <div className="rt-action-cell">
            <button className="rt-btn-ghost" onClick={toggleAvailability}>
              {agent.is_available ? 'Set Away' : 'Set Available'}
            </button>
            <button className="rt-btn-ghost" onClick={() => setEditing(e => !e)}>
              {editing ? 'Cancel' : 'Rules'}
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--bg)', padding: '8px 14px 14px' }}>
            <div className="rt-edit-row">
              <span className="rt-edit-label">Max Tickets</span>
              <input
                className="rt-edit-input"
                type="number"
                min={1} max={50}
                value={maxTickets}
                onChange={e => setMaxTickets(e.target.value)}
              />
              <span className="rt-edit-label">Department</span>
              <select
                className="rt-edit-select"
                value={deptId}
                onChange={e => setDeptId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button className="rt-btn-ghost" onClick={save} disabled={saving} style={{ background: 'var(--surface)' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function AgentRouting() {
  const [agents, setAgents] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [toast, setToast] = useState('')
  const [weightsExpanded, setWeightsExpanded] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [agentsRes, deptRes] = await Promise.all([
        adminService.getAgentPerformance(),
        adminService.getDepartments(),
      ])
      setAgents(agentsRes.data)
      setDepartments(deptRes.data)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = agents.filter(a => {
    if (filterDept && a.department !== filterDept) return false
    if (filterStatus === 'available' && !a.is_available) return false
    if (filterStatus === 'unavailable' && a.is_available) return false
    return true
  })

  const available = agents.filter(a => a.is_available).length
  const totalActive = agents.reduce((s, a) => s + (a.active || 0), 0)
  const avgLoad = agents.length
    ? Math.round((totalActive / agents.reduce((s, a) => s + (a.max_active || 10), 0)) * 100)
    : 0

  return (
    <div className="rt-root">
      <style>{CSS}</style>
      {toast && <div className="rt-toast">{toast}</div>}

      <div className="rt-header">
        <div>
          <h1 className="rt-title">Agent Routing Rules</h1>
          <p className="rt-subtitle">Configure availability, capacity, and department assignments for ticket routing</p>
        </div>
        <button className="rt-refresh-btn" onClick={fetchAll} disabled={loading}>
          <RefreshCw className="w-3.5 h-3.5" />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* KPI Summary */}
      <div className="rt-kpi-bar">
        <div className="rt-kpi-cell">
          <span className="rt-kpi-val">{agents.length}</span>
          <span className="rt-kpi-label">Total Agents</span>
        </div>
        <div className="rt-kpi-cell">
          <span className="rt-kpi-val" style={{ color: 'var(--success)' }}>{available}</span>
          <span className="rt-kpi-label">Available</span>
        </div>
        <div className="rt-kpi-cell">
          <span className="rt-kpi-val" style={{ color: 'var(--text-muted)' }}>{agents.length - available}</span>
          <span className="rt-kpi-label">Away</span>
        </div>
        <div className="rt-kpi-cell">
          <span className="rt-kpi-val">{totalActive}</span>
          <span className="rt-kpi-label">Active Tickets</span>
        </div>
        <div className="rt-kpi-cell">
          <span
            className="rt-kpi-val"
            style={{ color: avgLoad >= 80 ? 'var(--danger)' : avgLoad >= 60 ? 'var(--warning)' : 'var(--success)' }}
          >
            {avgLoad}%
          </span>
          <span className="rt-kpi-label">Avg. Load</span>
        </div>
      </div>

      {/* Expandable Routing Weights Insights Panel */}
      <div className="rt-weight-accordion">
        <button 
          onClick={() => setWeightsExpanded(!weightsExpanded)}
          className="rt-weight-header"
        >
          <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-indigo-600" /> Scoring Weights Insights</span>
          {weightsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {weightsExpanded && (
          <div className="rt-weight-panel">
            {WEIGHT_INFO.map(w => (
              <div key={w.label} className="rt-weight-pill">
                <div className="rt-weight-dot" style={{ background: w.color }} />
                {w.label}
                <span className="rt-weight-pct" style={{ color: w.color }}>{w.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rt-filters">
        <select className="rt-filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          <option value="Unassigned">Unassigned</option>
        </select>
        <select className="rt-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Away</option>
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="h-6 w-full bg-slate-100 animate-pulse rounded mb-2" />
          <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rt-empty">
          <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          No agents match the current filters.
        </div>
      ) : (
        <div className="rt-table-wrap">
          <table className="rt-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Department</th>
                <th>Availability</th>
                <th>Current Load</th>
                <th>Expertise Score</th>
                <th>Success Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(agent => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  departments={departments}
                  onSave={fetchAll}
                  onToast={showToast}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
