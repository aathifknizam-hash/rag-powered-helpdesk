import React, { useState } from 'react';

export default function KnowledgeRecommendations({ articles = [], loading }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading && articles.length === 0) {
    return (
      <div className="ai-knowledge-skeleton">
        <div className="skeleton-header"></div>
        <div className="skeleton-articles">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-article"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) return null;

  return (
    <div className="ai-knowledge-recommendations">
      <div className="ai-section-header">
        <div className="ai-section-title">
          <span className="material-symbols-outlined">menu_book</span>
          Relevant Articles
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
        <div className="ai-knowledge-list">
          {articles.map((article, idx) => (
            <a 
              key={idx}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ai-knowledge-item"
            >
              <div className="ai-knowledge-top">
                <span className="ai-knowledge-title">{article.title}</span>
                <span className="ai-knowledge-kb-id">{article.kb_id}</span>
              </div>
              <p className="ai-knowledge-description">{article.description}</p>
              {article.relevance_score && (
                <div className="ai-knowledge-score">
                  <div className="ai-score-bar">
                    <div 
                      className="ai-score-fill"
                      style={{ width: `${article.relevance_score}%` }}
                    ></div>
                  </div>
                  <span className="ai-score-text">{Math.round(article.relevance_score)}% Match</span>
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
