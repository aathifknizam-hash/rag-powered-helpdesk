/**
 * Security Utilities - Phase 11 Frontend Security
 * Client-side security practices and utilities
 */

/**
 * Content Security Policy Helper
 * Ensures safe handling of user-generated content
 */
export const sanitizeHTML = (html) => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * XSS Prevention: Sanitize text before rendering
 */
export const escapeDangerousCharacters = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Local Storage Security: Never store sensitive data
 */
export const secureLocalStorage = {
  setToken: (key, token) => {
    // Only store JWT access token, refresh token should be httpOnly
    if (key === 'authToken') {
      localStorage.setItem(key, token);
    } else {
      console.warn('Only auth tokens should be stored in localStorage');
    }
  },

  getToken: (key) => localStorage.getItem(key),

  removeToken: (key) => localStorage.removeItem(key),

  clear: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
  },
};

/**
 * Session Storage Security
 */
export const secureSessionStorage = {
  set: (key, value) => {
    if (typeof value === 'object') {
      sessionStorage.setItem(key, JSON.stringify(value));
    } else {
      sessionStorage.setItem(key, String(value));
    }
  },

  get: (key) => {
    const value = sessionStorage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  remove: (key) => sessionStorage.removeItem(key),

  clear: () => sessionStorage.clear(),
};

/**
 * CSRF Token Management
 */
export const csrfTokenManager = {
  getToken: () => {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) return value;
    }
    return null;
  },

  setHeader: (headers) => {
    const token = csrfTokenManager.getToken();
    if (token) {
      headers['X-CSRFToken'] = token;
    }
    return headers;
  },
};

/**
 * Request Validation
 */
export const validateRequest = (method, headers) => {
  const allowed_methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  
  if (!allowed_methods.includes(method)) {
    throw new Error(`Invalid HTTP method: ${method}`);
  }

  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

/**
 * URL Validation
 */
export const isValidURL = (url) => {
  try {
    const urlObj = new URL(url);
    // Only allow http and https
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

/**
 * Password Strength Checker
 */
export const checkPasswordStrength = (password) => {
  let strength = 0;
  const feedback = [];

  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+-=[\]{}|;:,.<>?]/.test(password)) strength++;

  if (password.length < 8) feedback.push('At least 8 characters required');
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letter');
  if (!/[0-9]/.test(password)) feedback.push('Add number');
  if (!/[!@#$%^&*()_+-=[\]{}|;:,.<>?]/.test(password)) feedback.push('Add special character');

  const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  
  return {
    score: Math.min(strength, 6),
    level: strengthLevels[strength],
    feedback,
  };
};

/**
 * Data Validation
 */
export const validateEmail = (email) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
};

export const validatePhoneNumber = (phone) => {
  const pattern = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return pattern.test(phone);
};

/**
 * Error Handling: Don't expose sensitive info
 */
export const sanitizeError = (error) => {
  // Never expose full error details to user
  if (error.response?.status === 401) {
    return 'Authentication failed. Please login again.';
  }
  if (error.response?.status === 403) {
    return 'You do not have permission to access this resource.';
  }
  if (error.response?.status === 404) {
    return 'Resource not found.';
  }
  if (error.response?.status === 500) {
    return 'Server error. Please try again later.';
  }
  return error.message || 'An error occurred. Please try again.';
};

/**
 * API Call Security Wrapper
 */
export const secureAPICall = async (url, options = {}) => {
  // Validate URL
  if (!isValidURL(url)) {
    throw new Error('Invalid URL');
  }

  // Add security headers
  const headers = {
    ...options.headers,
    'X-Requested-With': 'XMLHttpRequest',
  };

  // Add CSRF token for non-GET requests
  if (options.method && options.method !== 'GET') {
    headers['X-CSRFToken'] = csrfTokenManager.getToken() || '';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: validateRequest(options.method || 'GET', headers),
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

export default {
  sanitizeHTML,
  escapeDangerousCharacters,
  secureLocalStorage,
  secureSessionStorage,
  csrfTokenManager,
  validateRequest,
  isValidURL,
  checkPasswordStrength,
  validateEmail,
  validatePhoneNumber,
  sanitizeError,
  secureAPICall,
};
