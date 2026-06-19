import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, RefreshCcw, Database, Trash2 } from 'lucide-react'
import { PageHeader } from '../common/Layout'
import { Card, CardHeader, CardBody, Button, Alert } from '../common/UIComponents'
import { adminService } from '../../services/adminService'

export function AdminSettings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const runAction = async (action, successText) => {
    setMessage(null)
    setLoading(true)
    try {
      await action()
      setMessage({ type: 'success', text: successText })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'danger', text: 'Unable to complete the operation. Try again later.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', minHeight: '100%', background: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PageHeader
        title="Settings"
        subtitle="Operational tools for system health, backups, and maintenance."
      />

      {message && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant={message.type} title={message.type === 'success' ? 'Success' : 'Error'} message={message.text} />
        </div>
      )}

      <div style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <Card>
          <CardHeader>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              System Operations
            </div>
          </CardHeader>
          <CardBody>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Restart platform services and keep the support stack responsive.
            </p>
            <Button
              variant="secondary"
              loading={loading}
              onClick={() => runAction(adminService.restartServices, 'Services restart request submitted.')}
              style={{ width: '100%' }}
            >
              <RefreshCcw size={16} /> Restart Services
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Data Protection
            </div>
          </CardHeader>
          <CardBody>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Create a quick database snapshot for audits or recovery.
            </p>
            <Button
              variant="outline"
              loading={loading}
              onClick={() => runAction(adminService.backupDatabase, 'Database backup started.')}
              style={{ width: '100%' }}
            >
              <Database size={16} /> Backup Database
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Housekeeping
            </div>
          </CardHeader>
          <CardBody>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Clear old log files to recover disk space and reduce noise.
            </p>
            <Button
              variant="danger"
              loading={loading}
              onClick={() => runAction(() => adminService.cleanupLogs(30), 'Old logs cleanup scheduled.')}
              style={{ width: '100%' }}
            >
              <Trash2 size={16} /> Cleanup Logs
            </Button>
          </CardBody>
        </Card>
      </div>

      <div style={{ marginTop: '24px', padding: '20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Platform Settings</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Review platform-level configuration and operational policies.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>Back to Overview</Button>
        </div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Audit Mode</p>
            <p style={{ margin: '8px 0 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Enabled</p>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Notifications</p>
            <p style={{ margin: '8px 0 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Configured</p>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Backup Frequency</p>
            <p style={{ margin: '8px 0 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Daily</p>
          </div>
        </div>
      </div>
    </div>
  )
}
