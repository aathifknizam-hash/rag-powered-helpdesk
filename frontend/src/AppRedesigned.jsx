import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Ticket, Users, BarChart3, BookOpen, MessageSquare, Settings, Home } from 'lucide-react'
import './App.css'

// Contexts & Hooks
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './components/auth/LoginPage'
import { ProtectedRoute, RoleBasedRoute } from './components/auth/ProtectedRoute'
import { MainLayout } from './layouts/MainLayout'

// Customer Components
import { CustomerDashboard } from './components/customer/Dashboard'
import { TicketList as CustomerTickets } from './components/customer/TicketList'
import { KnowledgeBase } from './components/customer/KnowledgeBase'
import { AIAssistant } from './components/customer/AIAssistant'

// Agent Components
import { AgentDashboard } from './components/agent/Dashboard'

// Admin Components
import { AdminDashboard } from './components/admin/Dashboard'
import { UserManagement } from './components/admin/UserManagement'
import { KnowledgeBaseAdmin } from './components/admin/KnowledgeBaseAdmin'

// Loading component
import { Loading } from './components/common/UIComponents'

function App() {
  const { user, loading: authLoading, login, logout } = useAuth()
  const [darkMode, setDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (authLoading) {
    return <Loading text="Loading..." fullscreen />
  }

  // Menu items based on role
  const getMenuItems = () => {
    switch (user?.role) {
      case 'customer':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
          { id: 'tickets', label: 'My Tickets', icon: <Ticket className="w-5 h-5" /> },
          { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-5 h-5" /> },
          { id: 'ai-assistant', label: 'AI Assistant', icon: <MessageSquare className="w-5 h-5" /> },
          { id: 'profile', label: 'Profile', icon: <Settings className="w-5 h-5" /> }
        ]
      case 'agent':
        return [
          { id: 'dashboard', label: 'Queue', icon: <Home className="w-5 h-5" /> },
          { id: 'tickets', label: 'All Tickets', icon: <Ticket className="w-5 h-5" /> },
          { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-5 h-5" /> },
          { id: 'ai-copilot', label: 'AI Copilot', icon: <MessageSquare className="w-5 h-5" /> },
          { id: 'profile', label: 'Profile', icon: <Settings className="w-5 h-5" /> }
        ]
      case 'admin':
        return [
          { id: 'dashboard', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
          { id: 'tickets', label: 'All Tickets', icon: <Ticket className="w-5 h-5" /> },
          { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
          { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-5 h-5" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> }
        ]
      default:
        return []
    }
  }

  const renderCustomerPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <CustomerDashboard />
      case 'tickets':
        return <CustomerTickets />
      case 'knowledge':
        return <KnowledgeBase />
      case 'ai-assistant':
        return <AIAssistant />
      default:
        return <CustomerDashboard />
    }
  }

  const renderAgentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AgentDashboard />
      case 'tickets':
        return <CustomerTickets />
      case 'knowledge':
        return <KnowledgeBase />
      case 'ai-copilot':
        return <AIAssistant />
      default:
        return <AgentDashboard />
    }
  }

  const renderAdminPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard />
      case 'tickets':
        return <CustomerTickets />
      case 'users':
        return <UserManagement />
      case 'knowledge':
        return <KnowledgeBaseAdmin />
      case 'settings':
        return <div className="p-6"><h1 className="text-2xl font-bold">Settings - Coming Soon</h1></div>
      default:
        return <AdminDashboard />
    }
  }

  // Not authenticated - show login
  if (!user) {
    return <LoginPage onLogin={login} />
  }

  // Authenticated - show main layout with appropriate dashboard
  return (
    <MainLayout
      user={user}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      menuItems={getMenuItems()}
      onLogout={() => {
        logout()
        setCurrentPage('dashboard')
      }}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    >
      {user.role === 'customer' && renderCustomerPage()}
      {user.role === 'agent' && renderAgentPage()}
      {user.role === 'admin' && renderAdminPage()}
    </MainLayout>
  )
}

export default App
