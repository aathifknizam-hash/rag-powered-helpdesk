/**
 * TicketList Component
 * Displays tickets in a table with filtering and sorting
 */

import React, { useState } from 'react';
import useTickets from '../../hooks/useTickets';
import './TicketList.css';

export const TicketList = ({ onSelectTicket }) => {
  const {
    tickets,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    resetFilters,
    goToPage,
  } = useTickets();

  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const handleTicketClick = (ticket) => {
    setSelectedTicketId(ticket.id);
    if (onSelectTicket) {
      onSelectTicket(ticket);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    updateFilters({ [name]: value });
  };

  const handleSearch = (e) => {
    const { value } = e.target;
    updateFilters({ search: value });
  };

  if (loading && tickets.length === 0) {
    return <div className="ticket-list loading">Loading tickets...</div>;
  }

  return (
    <div className="ticket-list">
      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Status:</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_customer">Waiting Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Priority:</label>
          <select
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Type (AI):</label>
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
          >
            <option value="">All Types</option>
            <option value="it">IT</option>
            <option value="hr">HR</option>
            <option value="facilities">Facilities</option>
            <option value="finance">Finance</option>
            <option value="admin">Admin</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="filter-group search">
          <input
            type="text"
            placeholder="Search tickets..."
            value={filters.search}
            onChange={handleSearch}
          />
        </div>

        <button className="btn-reset" onClick={resetFilters}>
          Reset
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="error-message">Error: {error}</div>}

      {/* Tickets Table */}
      <div className="table-container">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Type</th>
              <th>Confidence</th>
              <th>Created</th>
              <th>Agent</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`ticket-row ${
                    selectedTicketId === ticket.id ? 'selected' : ''
                  }`}
                  onClick={() => handleTicketClick(ticket)}
                >
                  <td className="ticket-number">{ticket.ticket_number}</td>
                  <td className="subject">{ticket.subject}</td>
                  <td>
                    <span className={`badge badge-${ticket.status}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className="type-badge">
                      {ticket.ai_suggested_type || ticket.request_type}
                    </span>
                  </td>
                  <td className="confidence">
                    <div className="confidence-bar">
                      <div
                        className={`confidence-fill confidence-${
                          ticket.ai_classification_confidence >= 0.8
                            ? 'high'
                            : ticket.ai_classification_confidence >= 0.5
                            ? 'medium'
                            : 'low'
                        }`}
                        style={{
                          width: `${ticket.ai_classification_confidence * 100}%`,
                        }}
                      />
                    </div>
                    <span className="confidence-label">
                      {(ticket.ai_classification_confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="created-date">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="agent-name">
                    {ticket.assigned_agent
                      ? ticket.assigned_agent.email
                      : 'Unassigned'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() => goToPage(pagination.page - 1)}
          >
            Previous
          </button>

          {Array.from({ length: Math.min(5, pagination.totalPages) }).map(
            (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  className={pagination.page === page ? 'active' : ''}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              );
            }
          )}

          <button
            disabled={pagination.page === pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
          >
            Next
          </button>

          <span className="pagination-info">
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </div>
      )}

      {loading && <div className="loading-overlay">Updating...</div>}
    </div>
  );
};

export default TicketList;
