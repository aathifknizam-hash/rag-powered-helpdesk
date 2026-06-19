import React, { useState } from 'react';

export default function SimilarTickets({ tickets = [], loading }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading && tickets.length === 0) {
    return (
      <div className="ai-similar-skeleton">
        <div className="skeleton-header"></div>
        <div className="skeleton-tickets">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-ticket"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) return null;

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'resolved': 'ai-status-resolved',
      'closed': 'ai-status-closed',
      'in_progress': 'ai-status-in-progress',
      'pending': 'ai-status-pending',
      'open': 'ai-status-open'
    };
    return statusMap[status] || 'ai-status-default';
  };

  return (
    <div className="ai-similar-tickets">
      <div className="ai-section-header">
        <div className="ai-section-title">
          <span className="material-symbols-outlined">join</span>
          Similar Tickets (Past 24h)
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
        <div className="ai-tickets-container">
          {tickets.map((ticket, idx) => (
            <div 
              key={idx}
              className="ai-ticket-item"
            >
              <div className="ai-ticket-header">
                <div className="ai-ticket-info">
                  <span className="ai-ticket-id">{ticket.ticket_number}</span>
                  <span className="ai-ticket-subject">{ticket.subject}</span>
                </div>
                <span className={`ai-ticket-status ${getStatusBadgeClass(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
              {ticket.resolution && (
                <p className="ai-ticket-resolution">{ticket.resolution}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
