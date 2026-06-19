import React, { useState, useRef, useEffect } from 'react'
import { User, LogOut } from 'lucide-react'
import { Badge } from './UIComponents'

/* ─────────────────────────────────────────────────────────────────────────── */
/* Layout primitives — all using design-system.css tokens                      */
/* ─────────────────────────────────────────────────────────────────────────── */

const ROLE_LABELS = { customer: 'User', agent: 'Agent', admin: 'Admin' }

/* ── spin keyframe injected once ──────────────────────────────────────────── */
const GLOBAL_CSS = `
@keyframes spin { to { transform: rotate(360deg); } }
`

/* ── Header ─────────────────────────────────────────────────────────────── */
export function Header({ user, onLogout, theme = 'user' }) {
  const titles = {
    user:  'Smart Service Desk',
    agent: 'Agent Workspace',
    admin: 'Operations Center',
  }

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const roleLabel = ROLE_LABELS[user?.role] || user?.role
  const initial = user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Brand */}
        <h1
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {titles[theme] || titles.user}
        </h1>

        {/* Account area */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }} ref={menuRef}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--text-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.78rem',
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {user?.email}
              </p>
              <Badge variant="primary" size="sm" style={{ textTransform: 'capitalize' }}>
                {roleLabel}
              </Badge>
            </div>
          </div>

          {/* Menu trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)',
              transition: 'background 0.12s',
            }}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Account menu"
          >
            <User size={16} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '200px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '0.83rem',
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'inherit',
                }}
              >
                <User size={14} /> Profile
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onLogout?.() }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  color: 'var(--danger)',
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'inherit',
                }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
export function Sidebar({ items, activeItem, onItemClick, collapsed = false, onToggle, theme }) {
  const brand = theme?.brand || 'ServiceDesk'

  return (
    <aside
      style={{
        width: collapsed ? '56px' : '216px',
        background: '#0f172a',
        color: '#fff',
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Brand bar */}
      <div
        style={{
          padding: '14px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '56px',
        }}
      >
        {!collapsed && (
          <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {brand}
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          style={{
            padding: '4px 6px',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: '6px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'inherit',
            marginLeft: collapsed ? 0 : 'auto',
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map(item => {
          const isActive =
            activeItem === item.id ||
            (item.id !== items[0]?.id && activeItem?.startsWith(item.id))
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick(item.id)}
              title={collapsed ? item.label : ''}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: collapsed ? '8px' : '8px 10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '10px',
                fontSize: '0.82rem',
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'inherit',
                background: isActive ? 'rgba(37,99,235,0.85)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8',
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.color = '#fff'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              {item.icon}
              {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

/* ── PageHeader ──────────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* ── Stats ───────────────────────────────────────────────────────────────── */
export function Stats({ items, className = '' }) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '10px',
      }}
    >
      {items.map(stat => (
        <div
          key={stat.id}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px',
          }}
        >
          <p
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              margin: '0 0 4px',
            }}
          >
            {stat.label}
          </p>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.45)',
          zIndex: 40,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 60px rgba(15,23,42,0.18)',
            maxWidth: '480px',
            width: '100%',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 20px' }}>{children}</div>

          {/* Footer */}
          {footer && (
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                background: 'var(--bg)',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */
export function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <>
      <div
        style={{
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
          display: 'flex',
          gap: '0',
        }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '10px 18px',
                fontSize: '0.83rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 0.12s, border-color 0.12s',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs.find(t => t.id === activeTab)?.content}
    </>
  )
}
