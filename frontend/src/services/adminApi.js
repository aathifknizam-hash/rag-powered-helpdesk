/**
 * Admin API Service - Phase 10 Administration
 * Handles all admin dashboard API calls
 */

import api from './api';

export const adminAPI = {
  // System Stats
  getSystemStats: () => api.get('/admin/stats/'),
  getSystemHealth: () => api.get('/admin/health/'),

  // User Management
  listUsers: (params = {}) => api.get('/admin/users/', { params }),
  getUser: (id) => api.get(`/admin/users/${id}/`),
  createUser: (data) => api.post('/admin/users/', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}/`),
  lockUser: (id) => api.post(`/admin/users/${id}/lock/`),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock/`),
  changeUserPassword: (id, password) =>
    api.post(`/admin/users/${id}/change-password/`, { password }),

  // Agent Management
  listAgents: (params = {}) => api.get('/admin/agents/', { params }),
  getAgent: (id) => api.get(`/admin/agents/${id}/`),
  updateAgent: (id, data) => api.patch(`/admin/agents/${id}/`, data),
  assignTickets: (id, ticketIds) =>
    api.post(`/admin/agents/${id}/assign-tickets/`, { ticket_ids: ticketIds }),
  viewAgentPerformance: (id) => api.get(`/admin/agents/${id}/performance/`),

  // Knowledge Base Management
  listKBArticles: (params = {}) => api.get('/admin/knowledge-base/', { params }),
  getKBArticle: (id) => api.get(`/admin/knowledge-base/${id}/`),
  updateKBArticle: (id, data) => api.patch(`/admin/knowledge-base/${id}/`, data),
  deleteKBArticle: (id) => api.delete(`/admin/knowledge-base/${id}/`),
  indexKBArticles: () => api.post('/admin/knowledge-base/reindex/'),
  checkVectorIndex: () => api.get('/admin/knowledge-base/index-status/'),

  // FAQ Management
  listFAQs: (params = {}) => api.get('/admin/faqs/', { params }),
  createFAQ: (data) => api.post('/admin/faqs/', data),
  updateFAQ: (id, data) => api.patch(`/admin/faqs/${id}/`, data),
  deleteFAQ: (id) => api.delete(`/admin/faqs/${id}/`),

  // Audit Logs
  listAuditLogs: (params = {}) => api.get('/admin/audit-logs/', { params }),
  getAuditLog: (id) => api.get(`/admin/audit-logs/${id}/`),
  exportAuditLogs: (params = {}) =>
    api.get('/admin/audit-logs/export/', { params, responseType: 'blob' }),

  // Reports
  getTicketMetrics: (startDate, endDate) =>
    api.get('/admin/reports/tickets/', {
      params: { start_date: startDate, end_date: endDate },
    }),
  getAgentPerformance: (startDate, endDate) =>
    api.get('/admin/reports/agents/', {
      params: { start_date: startDate, end_date: endDate },
    }),
  getCustomerMetrics: (startDate, endDate) =>
    api.get('/admin/reports/customers/', {
      params: { start_date: startDate, end_date: endDate },
    }),
  getSystemMetrics: () => api.get('/admin/reports/system/'),

  // System Settings
  getSettings: () => api.get('/admin/settings/'),
  updateSettings: (data) => api.patch('/admin/settings/', data),
  restartServices: () => api.post('/admin/system/restart/'),
  backupDatabase: () => api.post('/admin/system/backup/'),
  cleanupOldLogs: (days) =>
    api.post('/admin/system/cleanup-logs/', { days }),
};
