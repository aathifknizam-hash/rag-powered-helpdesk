import apiClient from './api'

export const knowledgeService = {
  // List knowledge base documents
  list: async (filters = {}) => {
    const params = new URLSearchParams(filters)
    return apiClient.get(`/knowledge_base/documents/?${params.toString()}`)
  },

  // Get document details
  get: async (id) => {
    return apiClient.get(`/knowledge_base/documents/${id}/`)
  },

  // Upload document
  upload: async (file, category = '') => {
    const formData = new FormData()
    formData.append('file', file)
    if (category) formData.append('category', category)
    
    return apiClient.post('/knowledge_base/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // Delete document
  delete: async (id) => {
    return apiClient.delete(`/knowledge_base/documents/${id}/`)
  },

  // Search knowledge base
  search: async (query) => {
    return apiClient.get(`/knowledge_base/search/?q=${encodeURIComponent(query)}`)
  },

  // Get categories
  getCategories: async () => {
    return apiClient.get('/knowledge_base/categories/')
  },

  // Trigger reindex
  reindex: async () => {
    return apiClient.post('/knowledge_base/reindex/')
  },

  // Get similar documents
  getSimilar: async (documentId) => {
    return apiClient.get(`/knowledge_base/similar/${documentId}/`)
  }
}
