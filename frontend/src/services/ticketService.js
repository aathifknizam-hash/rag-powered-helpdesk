import apiClient from './api'

export const ticketService = {
  // List all tickets or filtered
  list: async (filters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value)
      }
    })
    return apiClient.get(`/tickets/?${params.toString()}`)
  },

  // Get single ticket
  get: async (id) => {
    return apiClient.get(`/tickets/${id}/`)
  },

  // Create ticket
  create: async (data) => {
    return apiClient.post('/tickets/', data)
  },

  // Update ticket
  update: async (id, data) => {
    return apiClient.put(`/tickets/${id}/`, data)
  },

  // Delete ticket
  delete: async (id) => {
    return apiClient.delete(`/tickets/${id}/`)
  },

  // Assign ticket to agent
  assign: async (id, agentId) => {
    return apiClient.post(`/tickets/${id}/assign/`, { assigned_to: agentId })
  },

  // Resolve ticket
  resolve: async (id, resolution) => {
    return apiClient.post(`/tickets/${id}/resolve/`, { resolution })
  },

  // Close ticket
  close: async (id) => {
    return apiClient.post(`/tickets/${id}/close/`)
  },

  // Reopen ticket
  reopen: async (id, reason) => {
    return apiClient.post(`/tickets/${id}/reopen/`, { reason })
  },

  // Get my tickets (customer)
  getMyTickets: async () => {
    return apiClient.get('/tickets/my_tickets/')
  },

  // Get unassigned tickets (agent/admin)
  getUnassigned: async () => {
    return apiClient.get('/tickets/unassigned/')
  },

  // Get ticket statistics
  getStats: async () => {
    return apiClient.get('/tickets/stats/')
  },

  // Get ticket messages/comments
  getMessages: async (ticketId) => {
    return apiClient.get(`/tickets/${ticketId}/messages/`)
  },

  // Add comment to ticket
  addMessage: async (ticketId, message) => {
    return apiClient.post(`/tickets/${ticketId}/messages/`, { message })
  },

  // Get ticket attachments
  getAttachments: async (ticketId) => {
    return apiClient.get(`/tickets/${ticketId}/attachments/`)
  },

  // Upload attachment
  uploadAttachment: async (ticketId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`/tickets/${ticketId}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // Watch/unwatch ticket
  watch: async (ticketId) => {
    return apiClient.post(`/tickets/${ticketId}/watch/`)
  },

  unwatch: async (ticketId) => {
    return apiClient.post(`/tickets/${ticketId}/unwatch/`)
  }
}
