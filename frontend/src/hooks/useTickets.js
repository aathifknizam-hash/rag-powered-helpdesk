/**
 * useTickets Hook
 * Manages ticket list state, filtering, and pagination
 */

import { useState, useEffect } from 'react';
import { ticketAPI, handleAPIError } from '../services/api';

export const useTickets = (initialFilters = {}) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
    search: '',
    ordering: '-created_at',
    ...initialFilters,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    count: 0,
    totalPages: 0,
  });

  // Fetch tickets when filters or page changes
  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          ...filters,
          page: pagination.page,
          page_size: pagination.pageSize,
        };

        // Remove empty filters
        Object.keys(params).forEach(
          (key) => params[key] === '' && delete params[key]
        );

        const response = await ticketAPI.list(params);

        setTickets(response.data.results || response.data);
        if (response.data.count !== undefined) {
          setPagination((prev) => ({
            ...prev,
            count: response.data.count,
            totalPages: Math.ceil(response.data.count / pagination.pageSize),
          }));
        }
      } catch (err) {
        const apiError = handleAPIError(err);
        setError(apiError.message);
        console.error('Error fetching tickets:', apiError);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [filters, pagination.page]);

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      type: '',
      search: '',
      ordering: '-created_at',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  return {
    tickets,
    loading,
    error,
    filters,
    pagination,
    setTickets,
    updateFilters,
    resetFilters,
    goToPage,
  };
};

export default useTickets;
