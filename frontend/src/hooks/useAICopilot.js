import { useState, useCallback } from 'react';
import { aiCopilotAPI, handleAPIError } from '../services/api';

export function useAICopilot() {
  const [suggestion, setSuggestion] = useState(null);
  const [knowledgeArticles, setKnowledgeArticles] = useState([]);
  const [similarTickets, setSimilarTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSuggestion = useCallback(async (ticketId, description) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiCopilotAPI.getSuggestion(ticketId, description);
      setSuggestion(response.data);
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      console.error('Error generating suggestion:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getKnowledgeRecommendations = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiCopilotAPI.getKnowledgeRecommendations(query);
      setKnowledgeArticles(response.data.results || response.data || []);
    } catch (err) {
      const apiError = handleAPIError(err);
      console.error('Error fetching knowledge:', err);
      // Don't set error as this is secondary data
    } finally {
      setLoading(false);
    }
  }, []);

  const getSimilarTickets = useCallback(async (ticketId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiCopilotAPI.getSimilarTickets(ticketId);
      setSimilarTickets(response.data.results || response.data || []);
    } catch (err) {
      const apiError = handleAPIError(err);
      console.error('Error fetching similar tickets:', err);
      // Don't set error as this is secondary data
    } finally {
      setLoading(false);
    }
  }, []);

  const askQuestion = useCallback(async (ticketId, question) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiCopilotAPI.askQuestion(ticketId, question);
      setSuggestion(response.data);
      return response.data;
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      console.error('Error asking question:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    suggestion,
    knowledgeArticles,
    similarTickets,
    loading,
    error,
    generateSuggestion,
    getKnowledgeRecommendations,
    getSimilarTickets,
    askQuestion,
    clearError,
  };
}
