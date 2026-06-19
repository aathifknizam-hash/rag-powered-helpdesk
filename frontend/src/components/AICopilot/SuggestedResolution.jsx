import React, { useState } from 'react';

export default function SuggestedResolution({ suggestion, loading, onApply }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading && !suggestion) {
    return (
      <div className="ai-suggested-resolution-skeleton">
        <div className="skeleton-header"></div>
        <div className="skeleton-lines">
          <div className="skeleton-line"></div>
          <div className="skeleton-line" style={{ width: '80%' }}></div>
          <div className="skeleton-line" style={{ width: '90%' }}></div>
        </div>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="ai-suggested-resolution">
      <div className="ai-suggested-header">
        <div className="ai-suggested-title">
          <span className="material-symbols-outlined ai-suggested-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          Suggested Resolution
        </div>
        <button 
          className="ai-collapse-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="material-symbols-outlined">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {isExpanded && (
        <div className="ai-suggested-content">
          <p className="ai-suggested-text">{suggestion.description}</p>

          {suggestion.steps && suggestion.steps.length > 0 && (
            <div className="ai-suggested-steps">
              <ol className="ai-steps-list">
                {suggestion.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {suggestion.confidence && (
            <div className="ai-suggested-confidence">
              <span className="material-symbols-outlined">verified</span>
              <span>Confidence: {Math.round(suggestion.confidence * 100)}%</span>
            </div>
          )}

          <div className="ai-suggested-actions">
            <button className="ai-action-button ai-action-edit">
              <span className="material-symbols-outlined">edit_note</span>
              Edit Suggestion
            </button>
            <button 
              className="ai-action-button ai-action-copy"
              onClick={onApply}
            >
              <span className="material-symbols-outlined">content_copy</span>
              Copy to Draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
