/**
 * Enhanced TicketDetails Component with AI Copilot Integration
 * Displays full ticket information with messages, attachments, and AI suggestions
 */

import React, { useEffect, useState } from 'react';
import { ticketAPI, handleAPIError } from '../../services/api';
import { AICopilot } from '../AICopilot';
import './TicketDetailsWithCopilot.css';

export const TicketDetailsWithCopilot = ({ ticketId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCopilot, setShowCopilot] = useState(true);

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
    }
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const [ticketRes, messagesRes, attachmentsRes] = await Promise.all([
        ticketAPI.get(ticketId),
        ticketAPI.getMessages(ticketId),
        ticketAPI.getAttachments(ticketId),
      ]);

      setTicket(ticketRes.data);
      setMessages(messagesRes.data || []);
      setAttachments(attachmentsRes.data || []);
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      console.error('Error fetching ticket details:', apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    setSubmitting(true);
    try {
      await ticketAPI.addMessage(ticketId, messageInput, isInternalNote);
      setMessageInput('');
      setIsInternalNote(false);
      await fetchTicketDetails();
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setSubmitting(true);
    try {
      if (newStatus === 'resolved') {
        await ticketAPI.resolve(ticketId, '');
      } else if (newStatus === 'closed') {
        await ticketAPI.close(ticketId);
      } else if (newStatus === 'in_progress') {
        await ticketAPI.update(ticketId, { status: 'in_progress' });
      } else {
        await ticketAPI.update(ticketId, { status: newStatus });
      }
      await fetchTicketDetails();
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplySuggestion = (suggestion) => {
    if (suggestion?.description) {
      setMessageInput(suggestion.description);
    }
  };

  if (loading) {
    return (
      <div className="ticket-details-wrapper loading">
        <div className="loading-spinner"></div>
        <p>Loading ticket details...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="ticket-details-wrapper error">
        <p>Error: {error}</p>
        <button onClick={fetchTicketDetails} className="btn-retry">
          Retry
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="ticket-details-wrapper">
        <p>No ticket selected</p>
      </div>
    );
  }

  return (
    <div className={`ticket-details-with-copilot ${showCopilot ? 'with-copilot' : 'full-width'}`}>
      {/* Main Content Panel */}
      <div className="ticket-details-main">
        {/* Header */}
        <div className="ticket-details-header">
          <div className="ticket-details-title-group">
            <button className="btn-close" onClick={onClose} title="Close">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="ticket-details-id-section">
              <span className="ticket-number">{ticket.ticket_number}</span>
              <h2 className="ticket-subject">{ticket.subject}</h2>
            </div>
          </div>

          <div className="ticket-details-controls">
            <select 
              value={ticket.status} 
              onChange={(e) => handleStatusChange(e.target.value)}
              className="status-dropdown"
            >
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_customer">Waiting Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button 
              className="btn-toggle-copilot"
              onClick={() => setShowCopilot(!showCopilot)}
              title={showCopilot ? 'Hide AI Copilot' : 'Show AI Copilot'}
            >
              <span className="material-symbols-outlined">
                {showCopilot ? 'smart_toy' : 'android'}
              </span>
            </button>
          </div>
        </div>

        {/* Ticket Info Bar */}
        <div className="ticket-info-bar">
          <div className="info-item">
            <span className="info-label">Priority</span>
            <span className={`priority-badge priority-${ticket.priority}`}>
              {ticket.priority}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Type</span>
            <span className="type-badge">
              {ticket.ai_type || 'Pending'}
              {ticket.confidence && (
                <span className="confidence-score">
                  {Math.round(ticket.confidence * 100)}%
                </span>
              )}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Assigned To</span>
            <span className="assigned-to">
              {ticket.assigned_to?.first_name || 'Unassigned'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Created</span>
            <span className="created-date">
              {new Date(ticket.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="ticket-description-section">
          <h3>Description</h3>
          <div className="ticket-description-text">
            {ticket.description}
          </div>
        </div>

        {/* Messages */}
        <div className="ticket-messages-section">
          <h3>Conversation History</h3>
          <div className="messages-list">
            {messages.length === 0 ? (
              <p className="no-messages">No messages yet</p>
            ) : (
              messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`message-item ${msg.is_internal ? 'internal' : 'external'}`}
                >
                  <div className="message-header">
                    <span className="sender-name">
                      {msg.sender?.first_name || 'Unknown'}
                    </span>
                    {msg.is_internal && (
                      <span className="internal-badge">Internal Note</span>
                    )}
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-body">{msg.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="ticket-attachments-section">
            <h3>Attachments</h3>
            <div className="attachments-list">
              {attachments.map((att, idx) => (
                <div key={idx} className="attachment-item">
                  <span className="material-symbols-outlined">attach_file</span>
                  <a href={att.file} download className="attachment-name">
                    {att.file.split('/').pop()}
                  </a>
                  <span className="attachment-size">
                    {(att.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={handleAddMessage} className="message-input-form">
          <textarea
            className="message-textarea"
            placeholder="Type your response or internal note..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            rows="4"
            disabled={submitting}
          ></textarea>

          <div className="message-input-footer">
            <label className="checkbox-internal">
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                disabled={submitting}
              />
              <span>Internal Note</span>
            </label>
            <button 
              type="submit" 
              className="btn-send"
              disabled={submitting || !messageInput.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* AI Copilot Panel */}
      {showCopilot && (
        <AICopilot 
          ticketId={ticketId}
          ticketDescription={ticket.description}
          onApplySuggestion={handleApplySuggestion}
        />
      )}
    </div>
  );
};
