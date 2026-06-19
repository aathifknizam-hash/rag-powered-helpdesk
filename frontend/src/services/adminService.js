import apiClient from './api'

export const adminService = {
  // ── System Stats ──────────────────────────────────────────────────────────
  getStats: () => apiClient.get('/admin/stats/stats/'),
  getSystemHealth: () => apiClient.get('/admin/stats/health/'),

  // ── Ticket Analytics (existing tickets endpoint + new analytics) ──────────
  getTicketAnalytics: () => apiClient.get('/tickets/stats/'),
  getTicketVolume: (days = 30) => apiClient.get(`/admin/analytics/ticket_volume/?days=${days}`),
  getByDepartment: () => apiClient.get('/admin/analytics/by_department/'),
  getByPriority: () => apiClient.get('/admin/analytics/by_priority/'),
  getBySentiment: () => apiClient.get('/admin/analytics/by_sentiment/'),
  getAgentPerformance: () => apiClient.get('/admin/analytics/agent_performance/'),
  getSLASummary: () => apiClient.get('/admin/analytics/sla_summary/'),
  getResolutionTrend: (days = 14) => apiClient.get(`/admin/analytics/resolution_trend/?days=${days}`),

  // ── Departments ───────────────────────────────────────────────────────────
  getDepartments: () => apiClient.get('/admin/departments/'),
  getDepartment: (id) => apiClient.get(`/admin/departments/${id}/`),
  createDepartment: (data) => apiClient.post('/admin/departments/', data),
  updateDepartment: (id, data) => apiClient.patch(`/admin/departments/${id}/`, data),
  deleteDepartment: (id) => apiClient.delete(`/admin/departments/${id}/`),
  getDepartmentAgents: (id) => apiClient.get(`/admin/departments/${id}/agents/`),
  assignAgentToDept: (deptId, agentId) =>
    apiClient.post(`/admin/departments/${deptId}/assign_agent/`, { agent_id: agentId }),
  removeAgentFromDept: (deptId, agentId) =>
    apiClient.post(`/admin/departments/${deptId}/remove_agent/`, { agent_id: agentId }),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (filters = {}) => {
    const params = new URLSearchParams(filters)
    return apiClient.get(`/admin/users/?${params.toString()}`)
  },
  createUser: (data) => apiClient.post('/admin/users/', data),
  updateUser: (id, data) => apiClient.patch(`/admin/users/${id}/`, data),
  lockUser: (id) => apiClient.post(`/admin/users/${id}/lock/`),
  unlockUser: (id) => apiClient.post(`/admin/users/${id}/unlock/`),
  changePassword: (id, password) => apiClient.post(`/admin/users/${id}/change_password/`, { password }),
  updateAgentRouting: (id, data) => apiClient.patch(`/admin/users/${id}/update_agent/`, data),

  // ── Agent Routing ─────────────────────────────────────────────────────────
  getAgents: () => apiClient.get('/admin/agents/list_agents/'),
  getAgentPerformanceDetail: (id) => apiClient.get(`/admin/agents/${id}/performance/`),
  updateAgentRouting: (id, data) => apiClient.patch(`/admin/agents/${id}/update_routing/`, data),
  assignTicketsToAgent: (id, ticketIds) =>
    apiClient.post(`/admin/agents/${id}/assign_tickets/`, { ticket_ids: ticketIds }),

  // ── Audit Logs ────────────────────────────────────────────────────────────
  getAuditLogs: (filters = {}) => {
    const params = new URLSearchParams(filters)
    return apiClient.get(`/admin/audit-logs/?${params.toString()}`)
  },
  exportAuditLogs: () => apiClient.get('/admin/audit-logs/export/', { responseType: 'blob' }),

  // ── System Settings ───────────────────────────────────────────────────────
  restartServices: () => apiClient.post('/admin/settings/restart_services/'),
  backupDatabase: () => apiClient.post('/admin/settings/backup_database/'),
  cleanupLogs: (days = 30) => apiClient.post('/admin/settings/cleanup_logs/', { days }),
}
