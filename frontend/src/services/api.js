/**
 * API Client Service
 * Cookie-based JWT authentication (HttpOnly cookies, no localStorage tokens)
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfReady = false;

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function ensureCsrfCookie() {
  if (csrfReady) return;
  await api.get('/auth/csrf/');
  csrfReady = true;
}

const AUTH_SKIP_REFRESH = [
  '/auth/login/',
  '/auth/refresh/',
  '/auth/logout/',
  '/auth/csrf/',
  '/auth/register/',
];

function shouldSkipRefresh(url = '') {
  return AUTH_SKIP_REFRESH.some((path) => url.includes(path));
}

api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();
    if (method && !['get', 'head', 'options', 'trace'].includes(method)) {
      await ensureCsrfCookie();
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh/');
        return api(originalRequest);
      } catch (refreshError) {
        csrfReady = false;
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Authentication API
 */
export const authAPI = {
  login: async (email, password) => {
    await ensureCsrfCookie();
    return api.post('/auth/login/', { email, password });
  },

  register: async (email, password, firstName, lastName) => {
    await ensureCsrfCookie();
    return api.post('/auth/register/', {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    });
  },

  refresh: () => api.post('/auth/refresh/'),

  logout: async () => {
    await ensureCsrfCookie();
    return api.post('/auth/logout/');
  },

  getCsrf: () => api.get('/auth/csrf/'),

  getCurrentUser: () => api.get('/auth/me/'),
  updateProfile: (data) => api.patch('/auth/me/', data),
};

/**
 * Tickets API
 */
export const ticketAPI = {
  list: (params = {}) => api.get('/tickets/', { params }),
  get: (id) => api.get(`/tickets/${id}/`),
  create: (data) => api.post('/tickets/', data),
  update: (id, data) => api.patch(`/tickets/${id}/`, data),
  delete: (id) => api.delete(`/tickets/${id}/`),
  assign: (id, agentId) => api.post(`/tickets/${id}/assign/`, { agent_id: agentId }),
  resolve: (id, notes = '') => api.post(`/tickets/${id}/resolve/`, { resolution_notes: notes }),
  close: (id) => api.post(`/tickets/${id}/close/`),
  reopen: (id) => api.post(`/tickets/${id}/reopen/`),
  escalate: (id) => api.patch(`/tickets/${id}/`, { is_escalated: true }),
  getMessages: (id) => api.get(`/tickets/${id}/messages/`),
  addMessage: (id, content, isInternal = false) =>
    api.post(`/tickets/${id}/messages/`, { content, is_internal: isInternal }),
  getAttachments: (id) => api.get(`/tickets/${id}/attachments/`),
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tickets/${id}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  addWatcher: (id, userId) => api.post(`/tickets/${id}/watch/`, { user_id: userId }),
  removeWatcher: (id, userId) =>
    api.delete(`/tickets/${id}/unwatch/`, { data: { user_id: userId } }),
  getMyTickets: (params = {}) => api.get('/tickets/my_tickets/', { params }),
  getUnassignedQueue: (params = {}) => api.get('/tickets/unassigned/', { params }),
  getStats: () => api.get('/tickets/stats/'),
};

export const knowledgeAPI = {
  list: (params = {}) => api.get('/knowledge_base/documents/', { params }),
  get: (id) => api.get(`/knowledge_base/documents/${id}/`),
  create: (formData) =>
    api.post('/knowledge_base/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id) => api.delete(`/knowledge_base/documents/${id}/`),
};

export const searchAPI = {
  search: (query, options = {}) =>
    api.post('/ai/search/', {
      query,
      top_k: options.top_k || 5,
      use_faq: options.use_faq !== false,
      use_groq: options.use_groq !== false,
      ...options,
    }),
  searchTickets: (query, filters = {}) => ticketAPI.list({ search: query, ...filters }),
};

export const aiDiagnosticsAPI = {
  get: () => api.get('/ai/diagnostics/'),
};

export const aiCopilotAPI = {
  getSuggestion: (ticketId, description) =>
    api.post('/ai/copilot/suggestion/', { ticket_id: ticketId, description }),
  getKnowledgeRecommendations: (query) =>
    api.get('/ai/copilot/knowledge/', { params: { query } }),
  getSimilarTickets: (ticketId) =>
    api.get('/ai/copilot/similar-tickets/', { params: { ticket_id: ticketId } }),
  askQuestion: (ticketId, question) =>
    api.post('/ai/copilot/ask/', { ticket_id: ticketId, question }),
  classifyTicket: (description, subject) =>
    api.post('/ai/classify/', { description, subject }),
};

const friendlyErrorMap = {
  'No active account found with the given credentials': 'Invalid email or password.',
  'Refresh token not found.': 'Your session has expired. Please sign in again.',
  'Invalid or expired refresh token.': 'Your session has expired. Please sign in again.',
  'Token is invalid or expired': 'Your session has expired. Please sign in again.',
};

export const handleAPIError = (error) => {
  if (error.response) {
    const rawMessage = error.response.data?.detail || error.response.data?.error || 'An error occurred'
    let message = friendlyErrorMap[rawMessage] || rawMessage

    if (!error.response.data?.detail && error.response.status === 404 && error.config?.url?.includes('/tickets/')) {
      message = 'Requested ticket could not be found.'
    }

    if (error.response.status === 403) {
      message = 'You do not have permission to perform this action.'
    }

    return {
      status: error.response.status,
      message,
      data: error.response.data,
    };
  }

  if (error.request) {
    return {
      status: 0,
      message: 'Unable to connect to the server. Please try again.',
      data: null,
    };
  }

  return {
    status: 0,
    message: error.message || 'An unexpected error occurred.',
    data: null,
  };
};

export default api;
