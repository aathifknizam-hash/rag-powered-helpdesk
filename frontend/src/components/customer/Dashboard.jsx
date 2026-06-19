import React, { useState, useEffect, useRef } from 'react'
import { ArrowRight, MessageCircle, Plus, Calendar, Bell, HelpCircle, Activity, Sparkles, Send, X, Trash2, ArrowUpRight, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button, Badge, Loading } from '../common/UIComponents'
import { PageHeader } from '../common/Layout'
import { ticketAPI, searchAPI } from '../../services/api'
import { normalizeList } from '../../utils/apiHelpers'
import { formatRelative } from '../../utils/formatDate'
import { CreateTicketModal } from './CreateTicketModal'
import { useAuth } from '../../hooks/useAuth'

// ── Topic-aware fallback suggested questions ─────────────────────────────────
const TOPIC_SUGGESTIONS = {
  salary: [
    'How can I download my payslip?',
    'When is the next payroll processing date?',
    'What happens if the salary date falls on a holiday?',
    'How do I update my bank account details?',
  ],
  leave: [
    'How many annual leave days do I get?',
    'Can I carry forward unused leave?',
    'How do I apply for leave?',
    'What is the leave approval process?',
  ],
  password: [
    'How do I enable two-factor authentication?',
    'What is the password complexity requirement?',
    'How long until my new password takes effect?',
    'Who do I contact if I am still locked out?',
  ],
  vpn: [
    'Which VPN client should I install?',
    'How do I connect to VPN from home?',
    'What do I do if VPN keeps disconnecting?',
    'Can I use VPN on my mobile device?',
  ],
  hardware: [
    'How long does hardware delivery take?',
    'Can I request a second monitor?',
    'What is the laptop replacement policy?',
    'Who approves hardware requests?',
  ],
  software: [
    'Is this software on the approved list?',
    'Who approves software installation requests?',
    'How long does software installation take?',
    'Can I install software on my own?',
  ],
  ticket: [
    'What does my ticket status mean?',
    'How do I add more details to my ticket?',
    'Can I escalate my ticket?',
    'How do I reopen a closed ticket?',
  ],
  default: [
    'Can you give me more detail on that?',
    'How do I create a support ticket for this?',
    'Who is the right team to contact?',
    'What is the expected resolution time?',
  ],
}

function getTopicSuggestions(query = '', apiSuggestions = []) {
  // Prefer API-provided suggestions
  if (apiSuggestions && apiSuggestions.length >= 2) return apiSuggestions.slice(0, 4)

  const q = query.toLowerCase()
  if (q.includes('salary') || q.includes('payslip') || q.includes('payroll')) return TOPIC_SUGGESTIONS.salary
  if (q.includes('leave') || q.includes('annual') || q.includes('vacation')) return TOPIC_SUGGESTIONS.leave
  if (q.includes('password') || q.includes('login') || q.includes('locked')) return TOPIC_SUGGESTIONS.password
  if (q.includes('vpn') || q.includes('remote') || q.includes('network')) return TOPIC_SUGGESTIONS.vpn
  if (q.includes('hardware') || q.includes('laptop') || q.includes('monitor') || q.includes('keyboard')) return TOPIC_SUGGESTIONS.hardware
  if (q.includes('software') || q.includes('install') || q.includes('application')) return TOPIC_SUGGESTIONS.software
  if (q.includes('ticket') || q.includes('status') || q.includes('request')) return TOPIC_SUGGESTIONS.ticket
  return TOPIC_SUGGESTIONS.default
}

export function UserDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Chat states
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatTicketPrefill, setChatTicketPrefill] = useState(null)

  // Ticket detail states
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [selectedTicketDetails, setSelectedTicketDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const chatEndRef = useRef(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  useEffect(() => {
    if (selectedTicketId) {
      setDetailsLoading(true)
      Promise.all([
        ticketAPI.get(selectedTicketId),
        ticketAPI.getMessages(selectedTicketId)
      ])
        .then(([ticketRes, messagesRes]) => {
          setSelectedTicketDetails({
            ...ticketRes.data,
            messages: messagesRes.data || []
          })
        })
        .catch(err => {
          console.error("Failed to fetch ticket details:", err)
        })
        .finally(() => {
          setDetailsLoading(false)
        })
    } else {
      setSelectedTicketDetails(null)
    }
  }, [selectedTicketId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const ticketsRes = await ticketAPI.getMyTickets()
      const list = normalizeList(ticketsRes.data)
      setTickets(list)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTicketLatestUpdate = (t) => {
    if (t.status === 'new') return 'Ticket submitted. Awaiting agent assignment.'
    if (t.status === 'assigned') return 'An agent has been assigned. Work will begin shortly.'
    if (t.status === 'in_progress') return 'Agent is actively working on your request.'
    if (t.status === 'waiting_customer') return 'Awaiting input/clarification from you.'
    if (t.status === 'resolved') return t.resolution_notes || 'Ticket has been marked as resolved.'
    if (t.status === 'closed') return 'Ticket is closed.'
    return 'No updates at this time.'
  }

  const handleChatSend = async (text) => {
    const query = text.trim()
    if (!query || chatLoading) return

    setChatMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: query }])
    setChatInput('')
    setChatLoading(true)

    // Inject ticket context if user mentions a ticket number
    let finalQuery = query
    const ticketMatch = query.match(/TKT-\d{8}-\d{3}/i) || query.match(/TKT-\d+/i)
    if (ticketMatch) {
      const tNum = ticketMatch[0].toUpperCase()
      const matchedTicket = tickets.find(t => t.ticket_number?.toUpperCase() === tNum)
      if (matchedTicket) {
        const statusText = matchedTicket.status?.replace('_', ' ') || 'unknown'
        const priorityText = matchedTicket.priority || 'medium'
        const latestUp = getTicketLatestUpdate(matchedTicket)
        finalQuery = `${query}\n\n[System Context: The user is asking about their ticket ${tNum}. Subject: "${matchedTicket.subject}", Status: "${statusText}", Priority: "${priorityText}", Latest Update: "${latestUp}". Please provide ticket status details directly.]`
      }
    }

    try {
      const res = await searchAPI.search(finalQuery)
      const data = res.data

      const suggestions = getTopicSuggestions(query, data.follow_up_questions || [])

      const newMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || 'I could not find an answer. You can create a support ticket for personalized help.',
        followUps: suggestions,
        userQuery: query,
      }
      setChatMessages((prev) => [...prev, newMsg])
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error
      const suggestions = getTopicSuggestions(query, [])
      setChatMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: detail
          ? `I ran into a problem: ${detail}. Try again or create a ticket for help.`
          : 'Sorry, something went wrong. Please try again or create a support ticket.',
        followUps: suggestions,
        userQuery: query,
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleChatSubmit = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    handleChatSend(chatInput)
  }

  const handleChatWithAIAboutTicket = (ticket) => {
    setSelectedTicketId(null)

    const promptText = `Can you tell me about the status of ticket ${ticket.ticket_number}?`
    const latestUp = (() => {
      const extMsgs = ticket.messages?.filter(m => !m.is_internal && m.author?.role !== 'customer') || [];
      return extMsgs.length > 0 ? extMsgs[extMsgs.length - 1].content : getTicketLatestUpdate(ticket);
    })()

    const systemContextMsg = `[System Context: The user is asking about ticket ${ticket.ticket_number}. Here is the ticket's details: Subject: "${ticket.subject}", Description: "${ticket.description}", Status: "${ticket.status}", Priority: "${ticket.priority}", Assigned To: "${ticket.agent?.first_name ? ticket.agent.first_name : ticket.department_name || 'IT Support'}", Created: "${new Date(ticket.created_at).toLocaleDateString()}". Latest update: "${latestUp}". Please give a friendly status summary to the user.]`

    setChatMessages([
      { id: Date.now(), role: 'user', content: promptText }
    ])

    setChatLoading(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    searchAPI.search(`${promptText}\n\n${systemContextMsg}`)
      .then(res => {
        const data = res.data
        const suggestions = getTopicSuggestions(promptText, data.follow_up_questions || [])
        setChatMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response || 'I could not retrieve details for this ticket.',
          followUps: suggestions,
          userQuery: promptText,
        }])
      })
      .catch(err => {
        console.error(err)
        setChatMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'I ran into an issue retrieving the ticket status. Please try again later.',
          followUps: TOPIC_SUGGESTIONS.ticket,
          userQuery: promptText,
        }])
      })
      .finally(() => {
        setChatLoading(false)
      })
  }

  const openCreateTicketFromChat = () => {
    const userMessages = chatMessages.filter((m) => m.role === 'user').map((m) => m.content)
    setChatTicketPrefill({
      subject: userMessages[userMessages.length - 1]?.slice(0, 120) || 'Support request from AI chatbot',
      description: [
        'Created from AI Chatbot Assistant.',
        '',
        ...chatMessages.map((m) => `${m.role === 'user' ? 'Customer' : 'AI Agent'}: ${m.content}`)
      ].join('\n'),
    })
    setShowCreate(true)
  }

  const getStatusStep = (status) => {
    switch (status) {
      case 'new': return 1;
      case 'assigned': return 2;
      case 'in_progress':
      case 'waiting_customer': return 3;
      case 'resolved': return 4;
      case 'closed': return 5;
      default: return 1;
    }
  }

  if (loading) return <Loading fullscreen />

  const openTickets = tickets.filter(t => ['new', 'assigned', 'in_progress', 'waiting_customer'].includes(t.status))
  const firstName = user?.first_name || user?.email?.split('@')[0] || 'there'

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100%', maxWidth: '1100px', margin: '0 auto', paddingBottom: '48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Support Assistant
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
            Hi {firstName} 👋 — ask me anything or track your requests below.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/user/tickets')}
            style={{
              padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600,
              borderRadius: '10px', border: '1px solid #e2e8f0',
              background: '#fff', color: '#475569', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f8fafc' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}
          >
            My Tickets
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700,
              borderRadius: '10px', border: 'none',
              background: '#2563eb', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.15s', boxShadow: '0 1px 3px rgba(37,99,235,0.3)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2563eb' }}
          >
            <Plus style={{ width: '14px', height: '14px' }} /> Create Ticket
          </button>
        </div>
      </div>

      {/* ── AI Chat Section ──────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        display: 'flex',
        flexDirection: 'column',
        height: '580px',
        overflow: 'hidden',
        marginBottom: '28px',
        width: '100%',
      }}>

        {chatMessages.length === 0 ? (
          /* ── Welcome / Empty State ── */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '48px 24px', textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(37,99,235,0.25)', marginBottom: '20px'
            }}>
              <Sparkles style={{ width: '30px', height: '30px', color: '#fff' }} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              How can I help you today?
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 28px' }}>
              Ask about anything — policies, software, tickets, or HR.
            </p>

            {/* Search input */}
            <form onSubmit={handleChatSubmit} style={{ width: '100%', maxWidth: '560px', display: 'flex', gap: '10px', marginBottom: '28px' }}>
              <input
                type="text"
                placeholder="e.g. How do I reset my password?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                style={{
                  flex: 1, padding: '12px 16px', border: '1.5px solid #e2e8f0',
                  borderRadius: '12px', fontSize: '0.875rem', color: '#0f172a',
                  background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: '12px 18px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'opacity 0.15s',
                  opacity: (chatLoading || !chatInput.trim()) ? 0.45 : 1
                }}
              >
                <Send style={{ width: '16px', height: '16px' }} />
              </button>
            </form>

            {/* Suggested starter chips */}
            <div style={{ width: '100%', maxWidth: '560px', textAlign: 'left' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Try asking
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Reset Password', q: 'How do I reset my password?' },
                  { label: 'VPN Troubleshooting', q: 'How do I troubleshoot VPN issues?' },
                  { label: 'Request Software', q: 'How do I request software installation?' },
                  { label: 'Submit Hardware Request', q: 'How do I submit a hardware request?' },
                ].map((act) => (
                  <button
                    key={act.label}
                    type="button"
                    onClick={() => handleChatSend(act.q)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px', background: '#f8fafc', border: '1.5px solid #e2e8f0',
                      borderRadius: '12px', fontSize: '0.8rem', color: '#374151',
                      fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#93c5fd'
                      e.currentTarget.style.background = '#eff6ff'
                      e.currentTarget.style.color = '#1d4ed8'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.background = '#f8fafc'
                      e.currentTarget.style.color = '#374151'
                    }}
                  >
                    <span>{act.label}</span>
                    <ArrowRight style={{ width: '14px', height: '14px', color: '#94a3b8', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : (
          /* ── Active Chat ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Chat header bar */}
            <div style={{
              background: '#0f172a', color: '#fff',
              padding: '12px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Sparkles style={{ width: '16px', height: '16px', color: '#fff' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>Support Assistant</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>Online</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatMessages([])}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  color: '#94a3b8', background: 'transparent', border: 'none',
                  padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
              >
                <Trash2 style={{ width: '13px', height: '13px' }} /> Clear
              </button>
            </div>

            {/* Message thread */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px',
              display: 'flex', flexDirection: 'column', gap: '16px',
              background: '#f8fafc'
            }}>
              {chatMessages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        maxWidth: '78%', background: '#2563eb', color: '#fff',
                        borderRadius: '18px 18px 4px 18px',
                        padding: '10px 16px', fontSize: '0.875rem',
                        lineHeight: 1.55, boxShadow: '0 1px 4px rgba(37,99,235,0.2)'
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', maxWidth: '88%', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: '2px',
                        boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                      }}>
                        <Sparkles style={{ width: '15px', height: '15px', color: '#fff' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* AI answer bubble */}
                        <div style={{
                          background: '#fff', border: '1px solid #e2e8f0',
                          borderRadius: '4px 18px 18px 18px',
                          padding: '12px 16px', fontSize: '0.875rem',
                          color: '#1e293b', whiteSpace: 'pre-wrap',
                          lineHeight: 1.65, boxShadow: '0 1px 4px rgba(15,23,42,0.06)'
                        }}>
                          {msg.content}
                        </div>

                        {/* ── Suggested Follow-Up Chips ─────────────────────── */}
                        {msg.followUps && msg.followUps.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <p style={{
                              fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8',
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              margin: '0 0 6px'
                            }}>
                              Suggested questions
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {msg.followUps.map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  onClick={() => handleChatSend(q)}
                                  disabled={chatLoading}
                                  style={{
                                    padding: '6px 13px',
                                    border: '1.5px solid #dbeafe',
                                    borderRadius: '999px',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: chatLoading ? 'not-allowed' : 'pointer',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.15s',
                                    opacity: chatLoading ? 0.5 : 1,
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                  onMouseEnter={e => {
                                    if (!chatLoading) {
                                      e.currentTarget.style.background = '#dbeafe'
                                      e.currentTarget.style.borderColor = '#93c5fd'
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = '#eff6ff'
                                    e.currentTarget.style.borderColor = '#dbeafe'
                                  }}
                                >
                                  <ChevronRight style={{ width: '11px', height: '11px', flexShrink: 0 }} />
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {chatLoading && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Sparkles style={{ width: '15px', height: '15px', color: '#fff' }} />
                  </div>
                  <div style={{
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: '4px 18px 18px 18px',
                    padding: '14px 18px', display: 'flex', gap: '5px', alignItems: 'center',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.06)'
                  }}>
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: '#94a3b8',
                        animation: 'bounce 1.2s infinite ease-in-out',
                        animationDelay: `${delay}ms`
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div style={{
              borderTop: '1px solid #e2e8f0', background: '#fff',
              padding: '12px 16px', flexShrink: 0
            }}>
              {/* Still need help? */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f8fafc', padding: '8px 12px', borderRadius: '10px',
                border: '1px solid #f1f5f9', marginBottom: '10px', fontSize: '0.78rem'
              }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Still need help?</span>
                <button
                  type="button"
                  onClick={openCreateTicketFromChat}
                  style={{
                    color: '#2563eb', fontWeight: 700, background: 'none',
                    border: 'none', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: '4px', fontSize: '0.78rem',
                    fontFamily: 'inherit'
                  }}
                >
                  <Plus style={{ width: '12px', height: '12px' }} /> Create Support Ticket
                </button>
              </div>

              <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Ask a follow-up question…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  style={{
                    flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0',
                    borderRadius: '12px', fontSize: '0.875rem', color: '#0f172a',
                    fontFamily: 'inherit', outline: 'none', background: '#f8fafc',
                    transition: 'all 0.15s'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    padding: '10px 16px', background: '#2563eb', color: '#fff',
                    border: 'none', borderRadius: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'opacity 0.15s',
                    opacity: (chatLoading || !chatInput.trim()) ? 0.45 : 1
                  }}
                >
                  <Send style={{ width: '16px', height: '16px' }} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Bounce keyframe */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ── My Open Tickets ──────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: '16px', boxShadow: '0 1px 6px rgba(15,23,42,0.05)',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            My Open Tickets ({openTickets.length})
          </h2>
          <button
            onClick={() => navigate('/user/tickets')}
            style={{
              fontSize: '0.78rem', color: '#2563eb', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit'
            }}
          >
            All tickets <ArrowUpRight style={{ width: '13px', height: '13px' }} />
          </button>
        </div>

        {openTickets.length === 0 ? (
          <div style={{
            padding: '40px', textAlign: 'center', color: '#94a3b8',
            background: '#f8fafc', borderRadius: '12px',
            border: '1.5px dashed #e2e8f0'
          }}>
            <Activity style={{ width: '28px', height: '28px', margin: '0 auto 8px', color: '#cbd5e1' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 4px' }}>No open tickets</p>
            <p style={{ fontSize: '0.78rem', margin: 0 }}>Ask the assistant above or create a ticket below.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {openTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                style={{
                  padding: '14px 16px', background: '#fff',
                  border: '1.5px solid #e2e8f0', borderRadius: '12px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#93c5fd'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)'
                  e.currentTarget.style.background = '#fafcff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.background = '#fff'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#94a3b8', letterSpacing: '0.05em' }}>
                    [{t.ticket_number}]
                  </span>
                  <h4 style={{
                    fontWeight: 600, color: '#0f172a', fontSize: '0.875rem',
                    margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{t.subject}</h4>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {formatRelative(t.updated_at)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: t.status === 'new' ? '#3b82f6' :
                        t.status === 'assigned' ? '#6366f1' :
                        t.status === 'in_progress' ? '#f59e0b' : '#94a3b8'
                    }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                      {t.status?.replace('_', ' ')}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Ticket Detail Modal ──────────────────────────────────────────────── */}
      {selectedTicketId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 50, padding: '16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(15,23,42,0.2)',
            maxWidth: '500px', width: '100%', overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal header */}
            <div style={{
              background: '#0f172a', color: '#fff',
              padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', fontWeight: 700 }}>
                  Ticket Details
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.01em' }}>
                  {selectedTicketDetails ? `#${selectedTicketDetails.ticket_number}` : 'Loading...'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicketId(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8',
                  borderRadius: '8px', padding: '6px', cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
              {detailsLoading || !selectedTicketDetails ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <span style={{
                    width: '32px', height: '32px', border: '3px solid #2563eb',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.8s linear infinite'
                  }} />
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '12px' }}>Fetching details…</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', margin: '0 0 8px' }}>
                      {selectedTicketDetails.subject}
                    </h4>
                    <p style={{
                      fontSize: '0.8rem', color: '#64748b', background: '#f8fafc',
                      padding: '10px 14px', borderRadius: '10px', border: '1px solid #f1f5f9',
                      maxHeight: '80px', overflowY: 'auto', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6
                    }}>
                      {selectedTicketDetails.description}
                    </p>
                  </div>

                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                    background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Status</span>
                      <Badge variant={['resolved', 'closed'].includes(selectedTicketDetails.status) ? 'success' : 'info'} size="md">
                        {selectedTicketDetails.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Priority</span>
                      <Badge variant={selectedTicketDetails.priority === 'critical' ? 'danger' : selectedTicketDetails.priority === 'high' ? 'warning' : 'primary'} size="md">
                        {selectedTicketDetails.priority?.toUpperCase()}
                      </Badge>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Assigned To</span>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                        {selectedTicketDetails.agent?.first_name
                          ? `${selectedTicketDetails.agent.first_name} ${selectedTicketDetails.agent.last_name || ''}`
                          : selectedTicketDetails.department_name || 'IT Support'}
                      </span>
                    </div>
                  </div>

                  {/* Timeline removed: simplified status shown above. */}

                  {/* Latest update */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Latest Update</span>
                    <p style={{
                      fontSize: '0.8rem', color: '#1e293b', lineHeight: 1.6,
                      background: '#eff6ff', padding: '12px 14px', borderRadius: '10px',
                      border: '1px solid #dbeafe', margin: 0
                    }}>
                      {(() => {
                        const extMsgs = selectedTicketDetails.messages?.filter(m => !m.is_internal && m.author?.role !== 'customer') || [];
                        return extMsgs.length > 0 ? extMsgs[extMsgs.length - 1].content : getTicketLatestUpdate(selectedTicketDetails);
                      })()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleChatWithAIAboutTicket(selectedTicketDetails)}
                    style={{
                      width: '100%', background: '#2563eb', color: '#fff',
                      border: 'none', borderRadius: '12px', padding: '12px',
                      fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'background 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#2563eb' }}
                  >
                    <Sparkles style={{ width: '15px', height: '15px' }} /> Ask AI about this ticket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CreateTicketModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setChatTicketPrefill(null) }}
        onCreated={fetchDashboardData}
        initialValues={chatTicketPrefill || {}}
      />
    </div>
  )
}

export const CustomerDashboard = UserDashboard