/**
 * useAuth Hook
 * Session state from /auth/me/ — tokens live in HttpOnly cookies only.
 */

import { useState, useEffect, useCallback } from 'react';
import { authAPI, ensureCsrfCookie, handleAPIError } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      await ensureCsrfCookie();
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      const apiError = handleAPIError(err);
      if (window.location.pathname !== '/login') {
        setError(apiError.message);
      } else {
        setError(null);
      }
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(email, password);
      if (response.data?.user) {
        setUser(response.data.user);
      } else {
        const profile = await authAPI.getCurrentUser();
        setUser(profile.data);
      }
      setIsAuthenticated(true);
      setError(null);
      return { success: true };
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      setIsAuthenticated(false);
      return { success: false, error: apiError.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Clear client state even if server logout fails
    }
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    window.location.href = '/login';
  }, []);

  const register = useCallback(async (email, password, firstName, lastName) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.register(email, password, firstName, lastName);
      setUser(response.data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      return { success: false, error: apiError.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    register,
    fetchCurrentUser,
  };
};

export default useAuth;
