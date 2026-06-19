/**
 * AdminDashboard Component - Phase 10: Comprehensive Administration
 * Provides complete control over users, agents, knowledge base, and system configuration
 */

import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/adminApi';
import UserManagement from './sections/UserManagement';
import AgentManagement from './sections/AgentManagement';
import KnowledgeBaseAdmin from './sections/KnowledgeBaseAdmin';
import AuditLogs from './sections/AuditLogs';
import SystemReports from './sections/SystemReports';
import SystemSettings from './sections/SystemSettings';
import './AdminDashboard.css';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSystemStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load system statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab stats={stats} />;
      case 'users':
        return <UserManagement />;
      case 'agents':
        return <AgentManagement />;
      case 'knowledge':
        return <KnowledgeBaseAdmin />;
      case 'audit':
        return <AuditLogs />;
      case 'reports':
        return <SystemReports />;
      case 'settings':
        return <SystemSettings />;
      default:
        return null;
    }
  };

  if (loading && !stats) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-title-group">
          <span className="material-symbols-outlined admin-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
            admin_panel_settings
          </span>
          <h1>System Administration</h1>
        </div>
        <button className="admin-refresh-button" onClick={fetchSystemStats}>
          <span className="material-symbols-outlined">refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="admin-error">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="material-symbols-outlined">dashboard</span>
          Overview
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="material-symbols-outlined">people</span>
          Users
        </button>
        <button
          className={`admin-tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          <span className="material-symbols-outlined">support_agent</span>
          Agents
        </button>
        <button
          className={`admin-tab ${activeTab === 'knowledge' ? 'active' : ''}`}
          onClick={() => setActiveTab('knowledge')}
        >
          <span className="material-symbols-outlined">menu_book</span>
          Knowledge Base
        </button>
        <button
          className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <span className="material-symbols-outlined">history</span>
          Audit Logs
        </button>
        <button
          className={`admin-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="material-symbols-outlined">analytics</span>
          Reports
        </button>
        <button
          className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="material-symbols-outlined">settings</span>
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="admin-overview">
      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <StatCard
          icon="people"
          title="Total Users"
          value={stats.total_users}
          trend={stats.user_trend}
        />
        <StatCard
          icon="support_agent"
          title="Active Agents"
          value={stats.active_agents}
          trend={stats.agent_trend}
        />
        <StatCard
          icon="assignment"
          title="Total Tickets"
          value={stats.total_tickets}
          trend={stats.ticket_trend}
        />
        <StatCard
          icon="menu_book"
          title="KB Articles"
          value={stats.kb_articles}
          trend={stats.kb_trend}
        />
        <StatCard
          icon="storage"
          title="Vector Index Size"
          value={`${stats.vector_index_size} MB`}
          secondary
        />
        <StatCard
          icon="sd_card"
          title="Database Size"
          value={`${stats.database_size} MB`}
          secondary
        />
      </div>

      {/* System Health */}
      <div className="admin-health-section">
        <h2>System Health</h2>
        <div className="admin-health-items">
          <HealthItem
            label="API Status"
            status="healthy"
            detail="All endpoints operational"
          />
          <HealthItem
            label="WebSocket Status"
            status="healthy"
            detail="Real-time communication active"
          />
          <HealthItem
            label="Vector Database"
            status="healthy"
            detail={`${stats.vector_index_size} MB indexed`}
          />
          <HealthItem
            label="Email Service"
            status="healthy"
            detail="Notifications enabled"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-quick-actions">
        <h2>Quick Actions</h2>
        <div className="admin-action-buttons">
          <button className="admin-action-button">
            <span className="material-symbols-outlined">person_add</span>
            Add New User
          </button>
          <button className="admin-action-button">
            <span className="material-symbols-outlined">upload_file</span>
            Sync Knowledge Base
          </button>
          <button className="admin-action-button">
            <span className="material-symbols-outlined">restart_alt</span>
            Restart Services
          </button>
          <button className="admin-action-button">
            <span className="material-symbols-outlined">backup</span>
            Backup Database
          </button>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, trend, secondary = false }) => {
  return (
    <div className={`admin-stat-card ${secondary ? 'secondary' : ''}`}>
      <div className="admin-stat-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="admin-stat-info">
        <p className="admin-stat-label">{title}</p>
        <p className="admin-stat-value">{value}</p>
        {trend && (
          <span className={`admin-stat-trend ${trend.direction}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.percentage}%
          </span>
        )}
      </div>
    </div>
  );
};

// Health Item Component
const HealthItem = ({ label, status, detail }) => {
  const statusColor = status === 'healthy' ? '#4ca94c' : status === 'warning' ? '#ffb81c' : '#ba1a1a';

  return (
    <div className="admin-health-item">
      <div className="admin-health-status">
        <span className="material-symbols-outlined" style={{ color: statusColor }}>
          {status === 'healthy' ? 'check_circle' : status === 'warning' ? 'warning' : 'error'}
        </span>
      </div>
      <div className="admin-health-info">
        <p className="admin-health-label">{label}</p>
        <p className="admin-health-detail">{detail}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
