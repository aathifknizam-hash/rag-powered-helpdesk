import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../common/UIComponents'
import { PageHeader } from '../common/Layout'
import TicketDetails from '../Dashboard/TicketDetails'

export function TicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: 'var(--bg)' }}>
      <PageHeader
        title={ticketId ? `Ticket #${ticketId}` : 'Ticket Detail'}
        subtitle="Review ticket activity, updates, and attachments"
        action={
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back to tickets
          </Button>
        }
      />

      {ticketId ? (
        <TicketDetails ticketId={ticketId} onClose={() => navigate(-1)} />
      ) : (
        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            No ticket selected. Please return to your ticket list and select a ticket.
          </p>
        </div>
      )}
    </div>
  )
}

export default TicketDetailPage
