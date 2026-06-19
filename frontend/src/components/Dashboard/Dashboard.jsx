/**
 * Dashboard Component
 * Main agent console dashboard showing overview statistics
 */

import React, { useEffect, useState } from 'react';
import { ticketAPI, handleAPIError } from '../../services/api';
import './Dashboard.css';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await ticketAPI.getStats();
      setStats(response.data);
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      console.error('Error fetching stats:', apiError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard loading">Loading statistics...</div>;
  }

  if (error) {
    return (
      <div className="dashboard error">
        <p>Error: {error}</p>
        <button onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  if (!stats) {
    return <div className="dashboard">No data available</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Tickets</h3>
          <p className="stat-value">{stats.total || 0}</p>
          <p className="stat-label">All time</p>
        </div>

        <div className="stat-card">
          <h3>New Tickets</h3>
          <p className="stat-value" style={{ color: '#3b82f6' }}>
            {stats.by_status?.new || 0}
          </p>
          <p className="stat-label">Awaiting assignment</p>
        </div>

        <div className="stat-card">
          <h3>In Progress</h3>
          <p className="stat-value" style={{ color: '#8b5cf6' }}>
            {stats.by_status?.in_progress || 0}
          </p>
          <p className="stat-label">Currently being worked on</p>
        </div>

        <div className="stat-card">
          <h3>Overdue SLAs</h3>
          <p className="stat-value" style={{ color: '#ef4444' }}>
            {stats.overdue || 0}
          </p>
          <p className="stat-label">Requires urgent attention</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="stats-section">
        <h2>Status Breakdown</h2>
        <div className="status-grid">
          {Object.entries(stats.by_status || {}).map(([status, count]) => (
            <div key={status} className={`status-item status-${status}`}>
              <span className="status-label">{status}</span>
              <span className="status-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="stats-section">
        <h2>Priority Breakdown</h2>
        <div className="priority-grid">
          {Object.entries(stats.by_priority || {}).map(([priority, count]) => (
            <div key={priority} className={`priority-item priority-${priority}`}>
              <span className="priority-label">{priority}</span>
              <span className="priority-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Type Breakdown (Phase 6 Classification) */}
      {stats.by_type && (
        <div className="stats-section">
          <h2>Type Breakdown (AI Classification)</h2>
          <div className="type-grid">
            {Object.entries(stats.by_type).map(([type, count]) => (
              <div key={type} className="type-item">
                <span className="type-label">{type}</span>
                <span className="type-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn btn-primary">
            View Unassigned Queue
          </button>
          <button className="action-btn btn-secondary">
            View My Tickets
          </button>
          <button className="action-btn btn-secondary">
            Create New Ticket
          </button>
          <button className="action-btn btn-secondary">
            Refresh Statistics
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
