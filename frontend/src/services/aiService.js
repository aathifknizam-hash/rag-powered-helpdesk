import apiClient from './api'

export const aiService = {
  // Generate query embedding
  generateEmbedding: async (query) => {
    return apiClient.post('/ai/generate-query-embedding/', { query })
  },

  // Search similar documents (RAG)
  searchRAG: async (query, topK = 5) => {
    return apiClient.post('/ai/rag-search/', { query, top_k: topK })
  },

  // Get ticket summary
  summarizeTicket: async (ticketId) => {
    return apiClient.get(`/ai/summarize-ticket/${ticketId}/`)
  },

  // Get suggested response
  suggestResponse: async (ticketId) => {
    return apiClient.get(`/ai/suggest-response/${ticketId}/`)
  },

  // Get similar tickets
  getSimilarTickets: async (ticketId, limit = 5) => {
    return apiClient.get(`/ai/similar-tickets/${ticketId}/?limit=${limit}`)
  },

  // Analyze ticket priority
  analyzePriority: async (ticketId) => {
    return apiClient.get(`/ai/analyze-priority/${ticketId}/`)
  },

  // Chat with AI (conversation)
  chat: async (message, conversationId = null) => {
    return apiClient.post('/ai/chat/', { message, conversation_id: conversationId })
  },

  // Get conversation history
  getConversationHistory: async (conversationId) => {
    return apiClient.get(`/ai/conversations/${conversationId}/`)
  },

  // List user conversations
  listConversations: async () => {
    return apiClient.get('/ai/conversations/')
  },

  // Get embedding status
  getEmbeddingStatus: async (documentId) => {
    return apiClient.get(`/ai/embedding-status/${documentId}/`)
  },

  // Check health
  health: async () => {
    return apiClient.get('/ai/health/')
  }
}
