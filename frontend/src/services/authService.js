import apiClient from './api'

export const authService = {
  login: async (email, password) => {
    try {
      const data = await apiClient.post('/auth/login/', { email, password })
      localStorage.setItem('tokens', JSON.stringify({ access: data.access, refresh: data.refresh }))
      localStorage.setItem('user', JSON.stringify(data.user))
      return data
    } catch (error) {
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('tokens')
    localStorage.removeItem('user')
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  getTokens: () => {
    const tokens = localStorage.getItem('tokens')
    return tokens ? JSON.parse(tokens) : null
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('tokens')
  },

  refreshToken: async () => {
    try {
      const tokens = localStorage.getItem('tokens')
      if (!tokens) throw new Error('No tokens available')
      
      const { refresh } = JSON.parse(tokens)
      const response = await apiClient.post('/auth/refresh/', { refresh })
      localStorage.setItem('tokens', JSON.stringify({
        access: response.access,
        refresh: response.refresh
      }))
      return response
    } catch (error) {
      throw error
    }
  }
}
