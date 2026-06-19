import React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────────── */
/* All components use CSS custom properties from design-system.css             */
/* to stay consistent with the enterprise light theme.                         */
/* ─────────────────────────────────────────────────────────────────────────── */

export function Card({ children, className = '', hover = false, style = {} }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        transition: hover ? 'box-shadow 0.15s, border-color 0.15s' : undefined,
        ...style,
      }}
      onMouseEnter={hover ? e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.borderColor = '#cbd5e1'
      } : undefined}
      onMouseLeave={hover ? e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.borderColor = 'var(--border)'
      } : undefined}
      className={className}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div
      style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        fontWeight: 600,
        color: 'var(--text-primary)',
        fontSize: '0.88rem',
      }}
      className={className}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return (
    <div style={{ padding: '16px 20px' }} className={className}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div
      style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
      className={className}
    >
      {children}
    </div>
  )
}

/* ── Badge ──────────────────────────────────────────────────────────────── */
const BADGE_STYLES = {
  default: { background: '#f1f5f9', color: 'var(--text-muted)' },
  primary: { background: '#eff6ff', color: 'var(--info)' },
  success: { background: '#dcfce7', color: 'var(--success)' },
  warning: { background: '#ffedd5', color: 'var(--warning)' },
  danger:  { background: '#fee2e2', color: 'var(--danger)' },
  info:    { background: '#e0f2fe', color: '#0369a1' },
}

const BADGE_SIZE = {
  sm: { padding: '2px 8px', fontSize: '0.68rem' },
  md: { padding: '3px 10px', fontSize: '0.78rem' },
  lg: { padding: '5px 14px', fontSize: '0.88rem' },
}

export function Badge({ children, variant = 'default', size = 'md', className = '', style = {} }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        borderRadius: '999px',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        ...BADGE_SIZE[size] || BADGE_SIZE.md,
        ...BADGE_STYLES[variant] || BADGE_STYLES.default,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/* ── Button ─────────────────────────────────────────────────────────────── */
const BTN_VARIANT = {
  primary:   { background: 'var(--info)',    color: '#fff',                  border: 'none' },
  secondary: { background: 'var(--bg)',      color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  danger:    { background: 'var(--danger)',  color: '#fff',                  border: 'none' },
  success:   { background: 'var(--success)', color: '#fff',                  border: 'none' },
  outline:   { background: 'transparent',   color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  ghost:     { background: 'transparent',   color: 'var(--text-secondary)', border: 'none' },
}

const BTN_SIZE = {
  sm:    { padding: '5px 12px',  fontSize: '0.78rem' },
  md:    { padding: '8px 16px',  fontSize: '0.83rem' },
  lg:    { padding: '10px 22px', fontSize: '0.92rem' },
  block: { padding: '9px 16px',  fontSize: '0.83rem', width: '100%' },
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const v = BTN_VARIANT[variant] || BTN_VARIANT.primary
  const s = BTN_SIZE[size] || BTN_SIZE.md
  return (
    <button
      disabled={loading || disabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontWeight: 600,
        borderRadius: 'var(--radius-sm)',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.12s, background 0.12s',
        fontFamily: 'inherit',
        outline: 'none',
        ...v,
        ...s,
        ...style,
      }}
      {...props}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid rgba(255,255,255,0.4)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      )}
      {children}
    </button>
  )
}

/* ── Alert ──────────────────────────────────────────────────────────────── */
const ALERT_STYLES = {
  info:    { background: '#eff6ff', border: '1px solid #bfdbfe', color: 'var(--info)' },
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: 'var(--success)' },
  warning: { background: '#fffbeb', border: '1px solid #fde68a', color: 'var(--warning)' },
  danger:  { background: '#fef2f2', border: '1px solid #fecaca', color: 'var(--danger)' },
}

const ALERT_ICONS = {
  info:    <Info size={16} />,
  success: <CheckCircle size={16} />,
  warning: <AlertCircle size={16} />,
  danger:  <XCircle size={16} />,
}

export function Alert({ variant = 'info', title, message, onClose }) {
  const s = ALERT_STYLES[variant] || ALERT_STYLES.info
  return (
    <div
      style={{
        ...s,
        borderRadius: 'var(--radius-sm)',
        padding: '12px 14px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        fontSize: '0.83rem',
      }}
    >
      <span style={{ flexShrink: 0, marginTop: '1px' }}>{ALERT_ICONS[variant]}</span>
      <div style={{ flex: 1 }}>
        {title && <p style={{ fontWeight: 700, marginBottom: '3px' }}>{title}</p>}
        <p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7, padding: 0 }}
        >
          <XCircle size={16} />
        </button>
      )}
    </div>
  )
}

/* ── Loading ─────────────────────────────────────────────────────────────── */
export function Loading({ text = 'Loading…', fullscreen = false }) {
  const spinner = (
    <div
      style={{
        width: fullscreen ? '40px' : '28px',
        height: fullscreen ? '40px' : '28px',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--info)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        margin: '0 auto 12px',
      }}
    />
  )

  if (fullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255,255,255,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {spinner}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: 0 }}>{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      {spinner}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>{text}</p>
    </div>
  )
}

/* ── EmptyState ──────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div style={{ padding: '56px 24px', textAlign: 'center' }}>
      {Icon && (
        <Icon
          size={48}
          style={{ color: 'var(--border)', margin: '0 auto 16px', display: 'block' }}
        />
      )}
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 18px' }}>{message}</p>
      {action && action}
    </div>
  )
}

/* ── Input ───────────────────────────────────────────────────────────────── */
const INPUT_STYLE = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.83rem',
  color: 'var(--text-primary)',
  background: 'var(--surface)',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.12s, box-shadow 0.12s',
}

export function Input({ label, error, style = {}, ...props }) {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '5px',
          }}
        >
          {label}
        </label>
      )}
      <input
        style={{
          ...INPUT_STYLE,
          borderColor: error ? 'var(--danger)' : 'var(--border)',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--info)'
          e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      />
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{error}</p>
      )}
    </div>
  )
}

/* ── Select ──────────────────────────────────────────────────────────────── */
export function Select({ label, error, options, style = {}, ...props }) {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '5px',
          }}
        >
          {label}
        </label>
      )}
      <select
        style={{
          ...INPUT_STYLE,
          borderColor: error ? 'var(--danger)' : 'var(--border)',
          cursor: 'pointer',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--info)'
          e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{error}</p>
      )}
    </div>
  )
}

/* ── Textarea ────────────────────────────────────────────────────────────── */
export function Textarea({ label, error, style = {}, ...props }) {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '5px',
          }}
        >
          {label}
        </label>
      )}
      <textarea
        style={{
          ...INPUT_STYLE,
          borderColor: error ? 'var(--danger)' : 'var(--border)',
          resize: 'none',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--info)'
          e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      />
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{error}</p>
      )}
    </div>
  )
}
