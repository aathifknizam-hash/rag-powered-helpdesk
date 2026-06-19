/**
 * TicketDetails Component
 * Displays full ticket information with messages and attachments
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'
import { ticketAPI, handleAPIError } from '../../services/api';
import { useAuth } from '../../hooks/useAuth'
import './TicketDetails.css';

export const TicketDetails = ({ ticketId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const navigate = useNavigate()
  const { user } = useAuth()
  const isCustomer = user?.role === 'customer'

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
      setEditTitle(ticketRes.data.subject || '')
      setEditDescription(ticketRes.data.description || '')
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
      fetchTicketDetails(); // Refresh to get new message
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return setError('Title cannot be empty')
    setSubmitting(true)
    try {
      await ticketAPI.update(ticketId, { subject: editTitle, description: editDescription })
      await fetchTicketDetails()
      setIsEditing(false)
    } catch (err) {
      const apiError = handleAPIError(err)
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const hasAgentActivity = ticket?.assigned_agent || (messages || []).some(m => m.author?.role && m.author.role !== 'customer')
    if (ticket?.status !== 'new' || hasAgentActivity) {
      return setError('Ticket cannot be deleted once work has started.')
    }
    const ok = window.confirm('Delete this ticket? This action cannot be undone.')
    if (!ok) return
    setSubmitting(true)
    try {
      await ticketAPI.delete(ticketId)
      if (onClose) onClose()
      else navigate(-1)
    } catch (err) {
      const apiError = handleAPIError(err)
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseTicket = async () => {
    const ok = window.confirm('Mark this ticket as resolved/closed?')
    if (!ok) return
    setSubmitting(true)
    try {
      await ticketAPI.close(ticketId)
      await fetchTicketDetails()
    } catch (err) {
      const apiError = handleAPIError(err)
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setSubmitting(true);
    try {
      if (newStatus === 'resolved') {
        await ticketAPI.resolve(ticketId, '');
      } else if (newStatus === 'closed') {
        await ticketAPI.close(ticketId);
      } else if (newStatus === 'in_progress') {
        await ticketAPI.update(ticketId, { status: 'in_progress' });
      }
      fetchTicketDetails();
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getDisplayStatus = (status) => {
    if (status === 'new') return 'Open'
    if (status === 'assigned') return 'Assigned'
    if (status === 'in_progress') return 'In Progress'
    if (status === 'waiting_customer') return 'Waiting Customer'
    if (status === 'resolved') return 'Resolved'
    if (status === 'closed') return 'Closed'
    return status?.replace('_', ' ') || 'Unknown'
  }

  if (loading) {
    return (
      <div className="ticket-details loading">
        <p>Loading ticket details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ticket-details error">
        <p>Error: {error}</p>
        <button onClick={fetchTicketDetails}>Retry</button>
      </div>
    );
  }

  if (!ticket) {
    return <div className="ticket-details">No ticket selected</div>;
  }

  const hasAgentActivity = ticket?.assigned_agent || (messages || []).some(m => m.author?.role && m.author.role !== 'customer')
  const canDelete = ticket.status === 'new' && !hasAgentActivity

  return (
    <div className="ticket-details">
      {/* Header */}
      <div className="ticket-header">
        <div>
          <h2>{ticket.ticket_number}</h2>
          <h3>{ticket.subject}</h3>
        </div>
        <button className="btn-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {isCustomer && (
        <div className="ticket-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          {ticket.status !== 'closed' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCloseTicket}
              disabled={submitting}
            >
              Close Ticket
            </button>
          )}
          {ticket.status !== 'closed' && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsEditing(!isEditing)}
              disabled={submitting}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="btn-danger"
              onClick={handleDelete}
              disabled={submitting}
            >
              Delete Ticket
            </button>
          )}
        </div>
      )}

      {/* Ticket Info */}
      <div className="ticket-info">
        <div className="info-row">
          <div className="info-item">
            <label>Status</label>
            {isCustomer ? (
              <span className={`badge badge-${ticket.status}`}>
                {getDisplayStatus(ticket.status)}
              </span>
            ) : (
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={submitting}
              >
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting Customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            )}
          </div>

          <div className="info-item">
            <label>Priority</label>
            <span className={`badge badge-${ticket.priority}`}>
              {ticket.priority}
            </span>
          </div>

          {!isCustomer && (
            <>
              <div className="info-item">
                <label>Type (AI)</label>
                <span className="type-badge">
                  {ticket.ai_suggested_type || ticket.request_type}
                </span>
              </div>

              <div className="info-item">
                <label>Confidence</label>
                <div className="confidence-inline">
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${ticket.ai_classification_confidence * 100}%`,
                      }}
                    />
                  </div>
                  <span>
                    {(ticket.ai_classification_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="info-row">
          <div className="info-item">
            <label>Customer</label>
            <p>{ticket.customer.email}</p>
          </div>

          <div className="info-item">
            <label>Assigned To</label>
            <p>
              {ticket.assigned_agent
                ? ticket.assigned_agent.email
                : 'Unassigned'}
            </p>
          </div>

          <div className="info-item">
            <label>Created</label>
            <p>{new Date(ticket.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="description-section">
        <h4>Description</h4>
        {isCustomer && isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Ticket title"
              disabled={submitting}
              style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows="5"
              disabled={submitting}
              style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={submitting || !editTitle.trim()}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditing(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p>{ticket.description}</p>
        )}
      </div>

      {/* Messages */}
      <div className="messages-section">
        <h4>Messages & Notes</h4>
        <div className="messages-list">
          {messages.length === 0 ? (
            <p className="no-messages">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.is_internal ? 'internal' : 'customer'}`}
              >
                <div className="message-header">
                  <strong>{msg.author.email}</strong>
                  {msg.is_internal && <span className="internal-badge">Internal</span>}
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="message-content">{msg.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Message Form */}
        <form onSubmit={handleAddMessage} className="message-form">
          <div className="form-group">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={isCustomer ? 'Add a reply...' : 'Add message or internal note...'}
              rows="3"
              disabled={submitting}
            />
          </div>

          <div className="form-actions">
            {!isCustomer && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  disabled={submitting}
                />
                <span>Internal Note (agents only)</span>
              </label>
            )}

            <button
              type="submit"
              disabled={submitting || !messageInput.trim()}
              className="btn-primary"
            >
              {submitting ? (isCustomer ? 'Adding...' : 'Sending...') : (isCustomer ? 'Add Reply' : 'Send Message')}
            </button>
          </div>
        </form>
      </div>

      {/* Attachments */}
      <div className="attachments-section">
        <h4>Attachments</h4>

        {attachments.length === 0 ? (
          <p className="no-attachments">No attachments</p>
        ) : (
          <div className="attachments-list">
            {attachments.map((att) => (
              <div key={att.id} className="attachment-item">
                <span className="attachment-name">{att.filename}</span>
                <span className="attachment-size">
                  ({(att.file_size / 1024).toFixed(1)} KB)
                </span>
                <a href={att.file} target="_blank" rel="noopener noreferrer" className="btn-download">
                  Download
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Upload Form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const file = e.target.file.files[0];
            if (file) {
              setSubmitting(true);
              try {
                await ticketAPI.uploadAttachment(ticketId, file);
                e.target.reset();
                fetchTicketDetails();
              } catch (err) {
                const apiError = handleAPIError(err);
                setError(apiError.message);
              } finally {
                setSubmitting(false);
              }
            }
          }}
          className="upload-form"
        >
          <input
            type="file"
            name="file"
            disabled={submitting}
            maxSize={10485760}
          />
          <button
            type="submit"
            disabled={submitting}
            className="btn-secondary"
          >
            Upload File
          </button>
        </form>
      </div>
    </div>
  );
};

export default TicketDetails;
