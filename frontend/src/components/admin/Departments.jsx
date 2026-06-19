import React, { useState, useEffect, useCallback } from 'react'
import { adminService } from '../../services/adminService'

const CSS = `
.dp-root {
  padding: 28px 32px;
  background: #f8fafc;
  min-height: 100%;
  font-family: 'Inter', system-ui, sans-serif;
}

.dp-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.dp-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 3px; letter-spacing: -0.01em; }
.dp-subtitle { font-size: 0.83rem; color: #64748b; margin: 0; }

.dp-btn-primary {
  padding: 8px 18px; border-radius: 8px;
  background: #0f172a; border: none;
  color: #fff; font-size: 0.82rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s; font-family: inherit;
}
.dp-btn-primary:hover { opacity: 0.85; }

.dp-btn-ghost {
  padding: 6px 12px; border-radius: 7px;
  border: 1px solid #e2e8f0; background: #fff;
  color: #374151; font-size: 0.78rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.dp-btn-ghost:hover { background: #f1f5f9; border-color: #cbd5e1; }

.dp-btn-danger {
  padding: 6px 12px; border-radius: 7px;
  border: 1px solid #fee2e2; background: #fff;
  color: #dc2626; font-size: 0.78rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.dp-btn-danger:hover { background: #fef2f2; }

/* Dept grid */
.dp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.dp-card {
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 10px; padding: 20px;
  position: relative; overflow: hidden;
  transition: box-shadow 0.15s;
}
.dp-card-accent {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: #6366f1; border-radius: 10px 10px 0 0;
}
.dp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }

.dp-card-name { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 6px 0 5px; }
.dp-card-desc { font-size: 0.8rem; color: #64748b; margin: 0 0 16px; min-height: 32px; line-height: 1.5; }

.dp-card-stats { display: flex; gap: 20px; margin-bottom: 14px; }
.dp-stat { display: flex; flex-direction: column; gap: 2px; }
.dp-stat-val { font-size: 1.5rem; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
.dp-stat-label { font-size: 0.67rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

.dp-card-lead {
  font-size: 0.78rem; color: #64748b; margin-bottom: 14px;
  display: flex; align-items: center; gap: 5px;
}
.dp-card-lead strong { color: #374151; }
.dp-card-actions { display: flex; gap: 6px; flex-wrap: wrap; }

/* Empty */
.dp-empty {
  text-align: center; padding: 60px 20px; color: #94a3b8;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
}
.dp-empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
.dp-empty-text { font-size: 0.88rem; }

/* Modal */
.dp-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15,23,42,0.4); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.dp-modal-box {
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 12px; width: 100%; max-width: 500px;
  padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.12);
}
.dp-modal-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 20px; }

.dp-form-group { margin-bottom: 14px; }
.dp-form-label {
  display: block; font-size: 0.72rem; font-weight: 600;
  color: #374151; margin-bottom: 6px;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.dp-form-input {
  width: 100%; padding: 9px 12px; border-radius: 8px;
  border: 1px solid #e2e8f0; background: #fff;
  color: #0f172a; font-size: 0.85rem;
  outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box; font-family: inherit;
}
.dp-form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px #6366f115; }
.dp-form-textarea { resize: vertical; min-height: 80px; }

.dp-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
.dp-error { color: #dc2626; font-size: 0.78rem; margin-top: 8px; }

/* Agent assign panel */
.dp-assign-panel {
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 10px; padding: 20px; margin-top: 8px;
}
.dp-assign-title {
  font-size: 0.72rem; font-weight: 700; color: #64748b;
  margin: 0 0 14px; text-transform: uppercase; letter-spacing: 0.06em;
}
.dp-assign-row { display: flex; gap: 8px; margin-bottom: 16px; }
.dp-assign-select {
  flex: 1; padding: 8px 10px; border-radius: 8px;
  border: 1px solid #e2e8f0; background: #fff;
  color: #0f172a; font-size: 0.82rem; outline: none; font-family: inherit;
}
.dp-assign-select:focus { border-color: #6366f1; }

.dp-agent-list { display: flex; flex-direction: column; gap: 6px; }
.dp-agent-row {
  display: flex; align-items: center; gap: 10px;
  background: #f8fafc; border: 1px solid #f1f5f9;
  border-radius: 8px; padding: 9px 12px;
}
.dp-agent-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: #e0e7ff; color: #4338ca;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.78rem; flex-shrink: 0;
}
.dp-agent-info { flex: 1; min-width: 0; }
.dp-agent-name-text { font-size: 0.83rem; font-weight: 600; color: #0f172a; }
.dp-agent-email-text { font-size: 0.7rem; color: #94a3b8; }
.dp-agent-chip {
  font-size: 0.68rem; padding: 2px 7px; border-radius: 4px;
  background: #f1f5f9; color: #475569; font-weight: 500; margin-right: 4px;
}

/* Toast */
.dp-toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  background: #0f172a; border-radius: 8px; padding: 12px 20px;
  color: #fff; font-size: 0.82rem; font-weight: 500;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  animation: dpToastIn 0.25s ease;
}
@keyframes dpToastIn {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
`

function Toast({ msg }) {
  return msg ? <div className="dp-toast">{msg}</div> : null
}

function DeptModal({ dept, agents, departments, onClose, onSaved }) {
  const isEdit = !!dept?.id
  const [form, setForm] = useState({
    name: dept?.name || '',
    description: dept?.description || '',
    lead_agent: dept?.lead_agent || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    
    const normalizedName = form.name.trim().toLowerCase()
    const duplicate = departments.find(d => d.name.toLowerCase() === normalizedName && d.id !== dept?.id)
    if (duplicate) {
      setError('A department with this name already exists')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        lead_agent: form.lead_agent || null,
      }
      if (isEdit) {
        await adminService.updateDepartment(dept.id, payload)
      } else {
        await adminService.createDepartment(payload)
      }
      onSaved()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed. Check for duplicate names.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dp-modal-box">
        <p className="dp-modal-title">{isEdit ? 'Edit Department' : 'New Department'}</p>

        <div className="dp-form-group">
          <label className="dp-form-label">Name *</label>
          <input className="dp-form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. IT Support" />
        </div>

        <div className="dp-form-group">
          <label className="dp-form-label">Description</label>
          <textarea className="dp-form-input dp-form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this department's function" />
        </div>

        <div className="dp-form-group">
          <label className="dp-form-label">Lead Agent</label>
          <select className="dp-form-input" value={form.lead_agent || ''} onChange={e => set('lead_agent', e.target.value || '')}>
            <option value="">— None —</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.email})</option>
            ))}
          </select>
        </div>

        {error && <p className="dp-error">{error}</p>}

        <div className="dp-modal-actions">
          <button className="dp-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="dp-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AgentAssignPanel({ dept, allAgents, onClose, onToast }) {
  const [deptAgents, setDeptAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDeptAgents() }, [dept.id])

  const fetchDeptAgents = async () => {
    setLoading(true)
    try {
      const res = await adminService.getDepartmentAgents(dept.id)
      setDeptAgents(res.data)
    } catch { }
    setLoading(false)
  }

  const unassigned = allAgents.filter(a => !deptAgents.find(da => da.id === a.id))

  const assign = async () => {
    if (!selectedAgentId) return
    try {
      await adminService.assignAgentToDept(dept.id, selectedAgentId)
      setSelectedAgentId('')
      onToast('Agent assigned successfully')
      fetchDeptAgents()
    } catch { onToast('Failed to assign agent') }
  }

  const remove = async (agentId) => {
    try {
      await adminService.removeAgentFromDept(dept.id, agentId)
      onToast('Agent removed from department')
      fetchDeptAgents()
    } catch { onToast('Failed to remove agent') }
  }

  return (
    <div className="dp-assign-panel">
      <p className="dp-assign-title">Manage Agents — {dept.name}</p>

      <div className="dp-assign-row">
        <select className="dp-assign-select" value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}>
          <option value="">Select agent to assign…</option>
          {unassigned.map(a => (
            <option key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.email})</option>
          ))}
        </select>
        <button className="dp-btn-primary" onClick={assign} disabled={!selectedAgentId}>Assign</button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Loading agents…</p>
      ) : deptAgents.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
          No agents assigned to this department yet.
        </p>
      ) : (
        <div className="dp-agent-list">
          {deptAgents.map(a => (
            <div key={a.id} className="dp-agent-row">
              <div className="dp-agent-avatar">{(a.first_name || a.email)[0].toUpperCase()}</div>
              <div className="dp-agent-info">
                <div className="dp-agent-name-text">{a.first_name} {a.last_name}</div>
                <div className="dp-agent-email-text">{a.email}</div>
              </div>
              <span className="dp-agent-chip">{a.active_tickets ?? 0} active</span>
              <span className="dp-agent-chip">{a.expertise_score?.toFixed(0) ?? 0} score</span>
              <button className="dp-btn-danger" onClick={() => remove(a.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14, textAlign: 'right' }}>
        <button className="dp-btn-ghost" onClick={onClose}>Close Panel</button>
      </div>
    </div>
  )
}

export function Departments() {
  const [departments, setDepartments] = useState([])
  const [allAgents, setAllAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editDept, setEditDept] = useState(null)
  const [manageDept, setManageDept] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [deptRes, agentRes] = await Promise.all([
        adminService.getDepartments(),
        adminService.getUsers({ role: 'agent' }),
      ])
      setDepartments(deptRes.data)
      setAllAgents(agentRes.data)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = () => { setEditDept(null); setShowModal(true) }
  const openEdit = (dept) => { setEditDept(dept); setShowModal(true); setManageDept(null) }

  const handleSaved = () => {
    setShowModal(false)
    showToast(editDept ? 'Department updated' : 'Department created')
    fetchAll()
  }

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return
    try {
      await adminService.deleteDepartment(dept.id)
      showToast('Department deleted')
      fetchAll()
    } catch {
      showToast('Cannot delete — department has associated records')
    }
  }

  return (
    <div className="dp-root">
      <style>{CSS}</style>
      <Toast msg={toast} />

      <div className="dp-header">
        <div>
          <h1 className="dp-title">Departments</h1>
          <p className="dp-subtitle">Manage service departments and agent assignments</p>
        </div>
        <button className="dp-btn-primary" onClick={openCreate}>+ New Department</button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '48px' }}>Loading departments…</p>
      ) : departments.length === 0 ? (
        <div className="dp-empty">
          <div className="dp-empty-icon">🏢</div>
          <p className="dp-empty-text">No departments yet. Create your first department to start routing tickets.</p>
        </div>
      ) : (
        <div className="dp-grid">
          {departments.map(dept => (
            <div key={dept.id} className="dp-card">
              <div className="dp-card-accent" />
              <p className="dp-card-name">{dept.name}</p>
              <p className="dp-card-desc">{dept.description || 'No description provided.'}</p>
              <div className="dp-card-stats">
                <div className="dp-stat">
                  <span className="dp-stat-val">{dept.agent_count ?? 0}</span>
                  <span className="dp-stat-label">Agents</span>
                </div>
                <div className="dp-stat">
                  <span className="dp-stat-val">{dept.open_tickets ?? 0}</span>
                  <span className="dp-stat-label">Open Tickets</span>
                </div>
              </div>
              <p className="dp-card-lead">
                Lead: <strong>{dept.lead_agent_name || '—'}</strong>
              </p>
              <div className="dp-card-actions">
                <button
                  className="dp-btn-ghost"
                  onClick={() => setManageDept(manageDept?.id === dept.id ? null : dept)}
                >
                  {manageDept?.id === dept.id ? 'Close Agents ↑' : 'Manage Agents'}
                </button>
                <button className="dp-btn-ghost" onClick={() => openEdit(dept)}>Edit</button>
                <button className="dp-btn-danger" onClick={() => handleDelete(dept)}>Delete</button>
              </div>

              {manageDept?.id === dept.id && (
                <div style={{ marginTop: 14 }}>
                  <AgentAssignPanel
                    dept={manageDept}
                    allAgents={allAgents}
                    onClose={() => setManageDept(null)}
                    onToast={showToast}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <DeptModal
          dept={editDept}
          agents={allAgents}
          departments={departments}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
