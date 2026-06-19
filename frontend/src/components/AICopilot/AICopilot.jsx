import React, { useState, useEffect } from 'react';
import { useAICopilot } from '../../hooks/useAICopilot';
import SuggestedResolution from './SuggestedResolution';
import KnowledgeRecommendations from './KnowledgeRecommendations';
import SimilarTickets from './SimilarTickets';
import AICopilotPrompt from './AICopilotPrompt';
import './AICopilot.css';

export default function AICopilot({ ticketId, ticketDescription, onApplySuggestion }) {
  const {
    suggestion,
    knowledgeArticles,
    similarTickets,
    loading,
    error,
    generateSuggestion,
    getKnowledgeRecommendations,
    getSimilarTickets,
    askQuestion
  } = useAICopilot();

  useEffect(() => {
    if (ticketId && ticketDescription) {
      // Load all AI data when ticket changes
      generateSuggestion(ticketId, ticketDescription);
      getKnowledgeRecommendations(ticketDescription);
      getSimilarTickets(ticketId);
    }
  }, [ticketId, ticketDescription]);

  const handleApplySuggestion = () => {
    if (suggestion && onApplySuggestion) {
      onApplySuggestion(suggestion);
    }
  };

  const handleAskQuestion = async (question) => {
    const response = await askQuestion(ticketId, question);
    if (response) {
      // Update suggestions with new response
      generateSuggestion(ticketId, question);
    }
  };

  return (
    <section className="ai-copilot-container">
      {/* Header */}
      <div className="ai-copilot-header">
        <div className="ai-copilot-title-group">
          <span className="material-symbols-outlined ai-copilot-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
          <h2 className="ai-copilot-title">AI Copilot</h2>
        </div>
        <button className="ai-copilot-menu-button">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </div>

      {/* Content */}
      <div className="ai-copilot-content">
        {error && (
          <div className="ai-copilot-error">
            <span className="material-symbols-outlined">error</span>
            <p>{error}</p>
          </div>
        )}

        {/* Suggested Resolution */}
        <SuggestedResolution 
          suggestion={suggestion} 
          loading={loading}
          onApply={handleApplySuggestion}
        />

        {/* Knowledge Base Recommendations */}
        <KnowledgeRecommendations 
          articles={knowledgeArticles} 
          loading={loading}
        />

        {/* Similar Tickets */}
        <SimilarTickets 
          tickets={similarTickets} 
          loading={loading}
        />

        {/* Prompt Area */}
        <AICopilotPrompt 
          onSubmit={handleAskQuestion}
          disabled={loading}
        />
      </div>
    </section>
  );
}
