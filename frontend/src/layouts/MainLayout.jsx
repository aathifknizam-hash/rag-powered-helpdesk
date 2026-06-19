import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header, Sidebar } from '../components/common/Layout'

const THEMES = {
  user: { sidebar: 'bg-slate-900', active: 'bg-blue-600', brand: 'User Portal' },
  agent: { sidebar: 'bg-slate-900', active: 'bg-emerald-600', brand: 'Agent' },
  admin: { sidebar: 'bg-slate-950', active: 'bg-violet-600', brand: 'Admin' },
}

export function MainLayout({ user, children, menuItems, onLogout, theme = 'user' }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const t = THEMES[theme] || THEMES.user

  const activeItem = menuItems.find((item) =>
    location.pathname === item.id || (item.id !== menuItems[0]?.id && location.pathname.startsWith(item.id))
  )?.id || menuItems[0]?.id

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        items={menuItems}
        activeItem={activeItem}
        onItemClick={(id) => navigate(id)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        theme={t}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={onLogout} theme={theme} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
