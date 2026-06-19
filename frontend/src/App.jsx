import React from 'react'

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { Home, Ticket, BookOpen, Sparkles, BarChart3, Users, User, History, Building2, GitBranch, TrendingUp } from 'lucide-react'

import { useAuth } from './hooks/useAuth'

import { LoginPage } from './components/auth/LoginPage'

import { ProtectedRoute, RoleBasedRoute } from './components/auth/ProtectedRoute'

import { MainLayout } from './layouts/MainLayout'

import { Loading } from './components/common/UIComponents'



import { UserDashboard } from './components/customer/Dashboard'
import { TicketDetailPage } from './components/customer/TicketDetailPage'

import { TicketList } from './components/customer/TicketList'

import { KnowledgeBase } from './components/customer/KnowledgeBase'

import { AIAssistant } from './components/customer/AIAssistant'

import { AgentDashboard } from './components/agent/Dashboard'

import { AgentCopilot } from './components/agent/Copilot'

import { AdminDashboard } from './components/admin/Dashboard'

import { UserManagement } from './components/admin/UserManagement'

import { KnowledgeBaseAdmin } from './components/admin/KnowledgeBaseAdmin'
import { AuditLogs } from './components/admin/AuditLogs'
import { Departments } from './components/admin/Departments'
import { AgentRouting } from './components/admin/AgentRouting'
import { Analytics } from './components/admin/Analytics'
import { AdminSettings } from './components/admin/Settings'



const USER_MENU = [
  { id: '/user', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { id: '/user/tickets', label: 'My Tickets', icon: <Ticket className="w-5 h-5" /> },
]

const AGENT_MENU = [
  { id: '/agent', label: 'Workspace', icon: <Home className="w-5 h-5" /> },
  { id: '/agent/knowledge', label: 'Knowledge Search', icon: <BookOpen className="w-5 h-5" /> },
  { id: '/agent/copilot', label: 'AI Copilot', icon: <Sparkles className="w-5 h-5" /> },
]

const ADMIN_MENU = [
  { id: '/admin', label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
  { id: '/admin/tickets', label: 'Tickets', icon: <Ticket className="w-5 h-5" /> },
  { id: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  { id: '/admin/agents', label: 'Agents', icon: <User className="w-5 h-5" /> },
  { id: '/admin/knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-5 h-5" /> },
  { id: '/admin/analytics', label: 'Analytics', icon: <TrendingUp className="w-5 h-5" /> },
  { id: '/admin/settings', label: 'Settings', icon: <Sparkles className="w-5 h-5" /> },
]

function LegacyUserRedirect() {
  const location = useLocation()
  return <Navigate to={location.pathname.replace(/^\/customer/, '/user') + location.search} replace />
}

function RoleRedirect({ user }) {
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'agent') return <Navigate to="/agent" replace />
  return <Navigate to="/user" replace />
}

function UserRoutes() {
  return (
    <Routes>
      <Route index element={<UserDashboard />} />
      <Route path="tickets" element={<TicketList mode="user" />} />
      <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
    </Routes>
  )
}



function AgentRoutes() {
  return (
    <Routes>
      <Route index element={<AgentDashboard />} />
      <Route path="knowledge" element={<KnowledgeBase />} />
      <Route path="copilot" element={<AgentCopilot />} />
    </Routes>
  )
}



function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="tickets" element={<TicketList mode="agent" />} />
      <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="agents" element={<AgentRouting />} />
      <Route path="agent-routing" element={<AgentRouting />} />
      <Route path="knowledge" element={<KnowledgeBaseAdmin />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="departments" element={<Departments />} />
      <Route path="audit-logs" element={<AuditLogs />} />
    </Routes>
  )
}



function AppRoutes() {

  const { user, loading, login, logout, error } = useAuth()



  if (loading) return <Loading text="Loading..." fullscreen />



  return (

    <Routes>

      <Route path="/login" element={

        user ? <RoleRedirect user={user} /> : <LoginPage onLogin={login} loading={loading} error={error} />

      } />



      <Route path="/" element={

        <ProtectedRoute user={user} loading={loading}>

          <RoleRedirect user={user} />

        </ProtectedRoute>

      } />



      {/* Legacy redirects */}

      <Route path="/customer/*" element={<LegacyUserRedirect />} />



      <Route path="/user/*" element={

        <RoleBasedRoute user={user} loading={loading} allowedRoles={['customer']}>

          <MainLayout user={user} menuItems={USER_MENU} onLogout={logout} theme="user">

            <UserRoutes />

          </MainLayout>

        </RoleBasedRoute>

      } />



      <Route path="/agent/*" element={

        <RoleBasedRoute user={user} loading={loading} allowedRoles={['agent', 'admin']}>

          <MainLayout user={user} menuItems={AGENT_MENU} onLogout={logout} theme="agent">

            <AgentRoutes />

          </MainLayout>

        </RoleBasedRoute>

      } />



      <Route path="/admin/*" element={

        <RoleBasedRoute user={user} loading={loading} allowedRoles={['admin']}>

          <MainLayout user={user} menuItems={ADMIN_MENU} onLogout={logout} theme="admin">

            <AdminRoutes />

          </MainLayout>

        </RoleBasedRoute>

      } />



      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>

  )

}



function App() {

  return (

    <BrowserRouter>

      <AppRoutes />

    </BrowserRouter>

  )

}



export default App


