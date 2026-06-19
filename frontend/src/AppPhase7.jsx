/**
 * Phase 7: Agent Console Application
 * Main app component integrating the dashboard, ticket list, and ticket details
 */

import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TicketList } from './components/Dashboard/TicketList';
import { TicketDetails } from './components/Dashboard/TicketDetails';
import './App.css';

function App() {
  const { user, isAuthenticated, loading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const result = await login(loginForm.email, loginForm.password);
    if (!result.success) {
      setLoginError(result.error);
    }
  };

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
    setSelectedTicket(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="app loading">
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login form
  if (!isAuthenticated) {
    return (
      <div className="app login-page">
        <div className="login-container">
          <div className="login-box">
            <h1>Smart Service Desk</h1>
            <h2>Agent Console</h2>

            {loginError && <div className="error-message">{loginError}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="agent@example.com"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  required
                />
              </div>

              <button type="submit" className="btn-login">
                Sign In
              </button>
            </form>

            <p className="login-footer">
              Demo Credentials:<br/>
              Email: agent@example.com<br/>
              Password: password
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show main app
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <h1>Smart Service Desk</h1>
            <p>Agent Console</p>
          </div>

          <div className="header-info">
            <span className="user-name">
              {user?.first_name || user?.email}
            </span>
            <span className="user-role">{user?.role}</span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="icon">📊</span>
              Dashboard
            </button>

            <button
              className={`nav-tab ${activeTab === 'tickets' ? 'active' : ''}`}
              onClick={() => setActiveTab('tickets')}
            >
              <span className="icon">📋</span>
              All Tickets
            </button>

            <button
              className={`nav-tab ${activeTab === 'unassigned' ? 'active' : ''}`}
              onClick={() => setActiveTab('unassigned')}
            >
              <span className="icon">📥</span>
              Unassigned Queue
            </button>

            <button
              className={`nav-tab ${activeTab === 'my' ? 'active' : ''}`}
              onClick={() => setActiveTab('my')}
            >
              <span className="icon">👤</span>
              My Tickets
            </button>
          </nav>

          <div className="sidebar-footer">
            <p className="version">Phase 7 - Agent Console</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {activeTab === 'dashboard' && <Dashboard />}

          {activeTab === 'tickets' && (
            <div className="tickets-section">
              <h2>All Tickets</h2>
              <TicketList onSelectTicket={setSelectedTicket} />
            </div>
          )}

          {activeTab === 'unassigned' && (
            <div className="tickets-section">
              <h2>Unassigned Queue</h2>
              <p className="section-info">
                Tickets waiting for agent assignment
              </p>
              {/* Will use TicketList with unassigned filter */}
              <TicketList
                onSelectTicket={setSelectedTicket}
              />
            </div>
          )}

          {activeTab === 'my' && (
            <div className="tickets-section">
              <h2>My Tickets</h2>
              <p className="section-info">
                Tickets assigned to you
              </p>
              {/* Will use TicketList with my_tickets filter */}
              <TicketList
                onSelectTicket={setSelectedTicket}
              />
            </div>
          )}
        </main>

        {/* Ticket Details Panel */}
        {selectedTicket && (
          <aside className="details-panel">
            <TicketDetails
              ticketId={selectedTicket.id}
              onClose={() => setSelectedTicket(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
