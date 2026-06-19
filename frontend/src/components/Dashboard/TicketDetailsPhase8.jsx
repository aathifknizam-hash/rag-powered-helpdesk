import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ticketAPI } from '../../services/api';
import { AICopilot } from '../AICopilot';
import './TicketDetailsPhase8.css';

export default function TicketDetailsPhase8() {
  const { id: ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    try {
      const [ticketData, messagesData, attachmentsData] = await Promise.all([
        ticketAPI.get(ticketId),
        ticketAPI.getMessages(ticketId),
        ticketAPI.getAttachments(ticketId),
      ]);
      
      setTicket(ticketData);
      setMessages(messagesData || []);
      setAttachments(attachmentsData || []);
      setError(null);
    } catch (err) {
      setError('Failed to load ticket details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    setSubmitting(true);
    try {
      await ticketAPI.addMessage(ticketId, {
        message: messageInput,
        is_internal: isInternalNote,
      });
      
      setMessageInput('');
      setIsInternalNote(false);
      await fetchTicketDetails();
    } catch (err) {
      setError('Failed to add message');
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyDraft = (suggestion) => {
    if (suggestion?.description) {
      setDraftText(suggestion.description);
      setMessageInput(suggestion.description);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await ticketAPI.update(ticketId, { status: newStatus });
      setTicket({ ...ticket, status: newStatus });
    } catch (err) {
      setError('Failed to update status');
      console.error('Error:', err);
    }
  };

  if (loading) {
    return (
      <div className="phase8-ticket-details-loading">
        <div className="phase8-spinner"></div>
        <p>Loading ticket details...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="phase8-ticket-details-error">
        <p>Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="phase8-ticket-details-container">
      {/* Left Panel: Ticket Information */}
      <aside className="phase8-ticket-sidebar">
        <div className="phase8-ticket-back">
          <button className="phase8-back-button">
            <span className="material-symbols-outlined">arrow_back</span>
            Back to List
          </button>
          <div className="phase8-ticket-header">
            <span className="phase8-ticket-id">{ticket.ticket_number}</span>
            <span className={`phase8-status-badge phase8-status-${ticket.status}`}>
              {ticket.status}
            </span>
          </div>
          <h2 className="phase8-ticket-subject">{ticket.subject}</h2>
        </div>

        <div className="phase8-ticket-properties">
          <div className="phase8-property">
            <span className="phase8-property-label">Assigned To</span>
            <div className="phase8-property-value">
              <span>{ticket.assigned_to?.first_name || 'Unassigned'}</span>
            </div>
          </div>

          <div className="phase8-property">
            <span className="phase8-property-label">Priority</span>
            <span className={`phase8-priority-badge phase8-priority-${ticket.priority}`}>
              {ticket.priority}
            </span>
          </div>

          <div className="phase8-property">
            <span className="phase8-property-label">Type (AI)</span>
            <span className="phase8-type-badge">
              {ticket.ai_type || 'Pending'}
              {ticket.confidence && (
                <span className="phase8-confidence">
                  {Math.round(ticket.confidence * 100)}%
                </span>
              )}
            </span>
          </div>

          <div className="phase8-property">
            <span className="phase8-property-label">Created</span>
            <span className="phase8-property-value">
              {new Date(ticket.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="phase8-property">
            <span className="phase8-property-label">Last Update</span>
            <span className="phase8-property-value">
              {new Date(ticket.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </aside>

      {/* Center Panel: Conversation */}
      <section className="phase8-ticket-main">
        <div className="phase8-conversation-header">
          <h3 className="phase8-conversation-title">Conversation History</h3>
          <button className="phase8-conversation-menu">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>

        <div className="phase8-messages-area">
          {/* System Message */}
          <div className="phase8-message-system">
            <span className="phase8-system-badge">
              Ticket Created - {new Date(ticket.created_at).toLocaleString()}
            </span>
          </div>

          {/* Messages */}
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`phase8-message ${msg.is_internal ? 'phase8-message-internal' : 'phase8-message-user'}`}
            >
              <div className="phase8-message-avatar">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
              <div className="phase8-message-content">
                <div className="phase8-message-meta">
                  <span className="phase8-message-sender">
                    {msg.sender?.first_name || 'User'}
                  </span>
                  {msg.is_internal && (
                    <span className="phase8-message-internal-badge">Internal</span>
                  )}
                  <span className="phase8-message-time">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="phase8-message-text">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="phase8-message-input-area">
          <form onSubmit={handleAddMessage} className="phase8-message-form">
            <div className="phase8-toolbar">
              <button type="button" className="phase8-toolbar-button">
                <span className="material-symbols-outlined">format_bold</span>
              </button>
              <button type="button" className="phase8-toolbar-button">
                <span className="material-symbols-outlined">format_italic</span>
              </button>
              <button type="button" className="phase8-toolbar-button">
                <span className="material-symbols-outlined">format_list_bulleted</span>
              </button>
              <div className="phase8-toolbar-divider"></div>
              <button type="button" className="phase8-toolbar-button">
                <span className="material-symbols-outlined">attach_file</span>
              </button>
            </div>

            <textarea
              className="phase8-message-textarea"
              placeholder="Type your message here..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              rows="4"
            ></textarea>

            <div className="phase8-message-footer">
              <label className="phase8-internal-checkbox">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                />
                <span>Internal Note</span>
              </label>
              <button 
                type="submit" 
                className="phase8-send-button"
                disabled={submitting || !messageInput.trim()}
              >
                Send Reply
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Right Panel: AI Copilot */}
      <AICopilot 
        ticketId={ticketId}
        ticketDescription={ticket.description}
        onApplySuggestion={handleApplyDraft}
      />
    </div>
  );
}
