import apiClient from './api'

export const userService = {
  // List all users
  list: async (filters = {}) => {
    const params = new URLSearchParams(filters)
    return apiClient.get(`/admin/users/?${params.toString()}`)
  },

  // Get user by ID
  get: async (id) => {
    return apiClient.get(`/admin/users/${id}/`)
  },

  // Create user
  create: async (data) => {
    return apiClient.post('/admin/users/', data)
  },

  // Update user
  update: async (id, data) => {
    return apiClient.put(`/admin/users/${id}/`, data)
  },

  // Delete user
  delete: async (id) => {
    return apiClient.delete(`/admin/users/${id}/`)
  },

  // Get current user profile
  getProfile: async () => {
    return apiClient.get('/auth/profile/')
  },

  // Update profile
  updateProfile: async (data) => {
    return apiClient.put('/auth/profile/', data)
  },

  // Get agents only
  getAgents: async () => {
    return apiClient.get('/admin/users/?role=agent')
  },

  // Get customers only
  getCustomers: async () => {
    return apiClient.get('/admin/users/?role=customer')
  },

  // Disable user
  disable: async (id) => {
    return apiClient.post(`/admin/users/${id}/disable/`)
  },

  // Enable user
  enable: async (id) => {
    return apiClient.post(`/admin/users/${id}/enable/`)
  }
}
