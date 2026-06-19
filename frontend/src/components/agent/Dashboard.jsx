import React, { useState, useEffect, useCallback, useRef } from 'react'
import { AlertCircle, MessageCircle, Sparkles, BookOpen, Clock, CheckCircle2, User, Power, ShieldAlert, FileText, Send, ArrowRight, ChevronDown, ChevronUp, Search, Filter, AlertTriangle, Check, Brain } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button, Badge, Textarea } from '../common/UIComponents'
import { PageHeader, Modal } from '../common/Layout'
import { ticketAPI, authAPI, aiCopilotAPI } from '../../services/api'
import { normalizeList } from '../../utils/apiHelpers'
import { formatDateTime, formatRelative } from '../../utils/formatDate'
import { getSourceTypeLabel } from '../../utils/sourceLabels'

const SCOPED_CSS = `
/* Accordion styles */
.agd-accordion-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  margin-bottom: 8px;
  overflow: hidden;
}
.agd-accordion-header {
  width: 100%;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.8rem;
  transition: background 0.15s;
}
.agd-accordion-header:hover {
  background: var(--bg);
}
.agd-accordion-content {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Skeletons */
.agd-skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: agdSkel 1.5s infinite;
  border-radius: 4px;
}
@keyframes agdSkel {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`

export function AgentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [queue, setQueue] = useState([])
  const [activeTab, setActiveTab] = useState('assigned') // assigned, unassigned, sla
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [ticketSearch, setTicketSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  
  // Chat inputs
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  
  // AI Copilot state
  const [copilot, setCopilot] = useState(null)
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [expandedSection, setExpandedSection] = useState('summary') // Accordion active state

  // System status
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [presenceUsers, setPresenceUsers] = useState([]) // typing/online users in chat

  // Resolve Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [resolveNotes, setResolveNotes] = useState('')

  // Escalation Modal
  const [escalationModalOpen, setEscalationModalOpen] = useState(false)
  const [escalationReason, setEscalationReason] = useState('')

  // Refs for WebSockets
  const chatSocketRef = useRef(null)
  const notificationSocketRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------

  const fetchAgentData = useCallback(async (selectId = null) => {
    try {
      const [profileRes, queueRes] = await Promise.all([
        authAPI.getCurrentUser(),
        ticketAPI.list(), // All tickets readable by agent
      ])
      
      setProfile(profileRes.data)
      const allTickets = normalizeList(queueRes.data)
      setQueue(allTickets)
      
      // Select the first ticket or maintain selection
      if (allTickets.length) {
        if (selectId) {
          const match = allTickets.find(t => t.id === selectId)
          if (match) setSelectedTicket(match)
        } else if (!selectedTicket) {
          setSelectedTicket(allTickets[0])
        } else {
          // Keep current selected ticket updated with fresh backend properties
          const match = allTickets.find(t => t.id === selectedTicket.id)
          if (match) setSelectedTicket(match)
        }
      }
    } catch (err) {
      console.error('Failed to fetch agent workspace data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedTicket])

  useEffect(() => {
    fetchAgentData()
    connectNotificationWebSocket()

    return () => {
      if (notificationSocketRef.current) notificationSocketRef.current.close()
      if (chatSocketRef.current) chatSocketRef.current.close()
    }
  }, [])

  // Load chat messages and Copilot insights when ticket changes
  useEffect(() => {
    if (!selectedTicket) return
    
    // Refresh full details including computed fields
    loadTicketDetails(selectedTicket.id)
    fetchCopilotInsights(selectedTicket.id)
    connectChatWebSocket(selectedTicket.id)

    return () => {
      if (chatSocketRef.current) chatSocketRef.current.close()
      setPresenceUsers([])
    }
  }, [selectedTicket?.id])

  const loadTicketDetails = async (ticketId) => {
    try {
      const detailsRes = await ticketAPI.get(ticketId)
      const details = detailsRes.data
      setSelectedTicket(details)
      setMessages(normalizeList(details.messages || []))
    } catch (err) {
      console.error('Failed to load ticket details:', err)
    }
  }

  const fetchCopilotInsights = async (ticketId) => {
    setCopilotLoading(true)
    try {
      const [copilotRes, similarRes] = await Promise.all([
        aiCopilotAPI.getSuggestion(ticketId),
        aiCopilotAPI.getSimilarTickets(ticketId)
      ])
      setCopilot({
        ...copilotRes.data,
        similar: similarRes.data?.similar_tickets || []
      })
    } catch (err) {
      console.error('Failed to fetch AI Copilot insights:', err)
      setCopilot(null)
    } finally {
      setCopilotLoading(false)
    }
  }

  // -------------------------------------------------------------
  // WebSockets Connections
  // -------------------------------------------------------------

  const connectNotificationWebSocket = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = '8000'
    const socket = new WebSocket(`${wsProtocol}//${host}:${port}/ws/notifications/`)

    socket.onopen = () => {
      logger.info('Connected to notifications server')
    }

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'notification') {
        alert(`[${data.notification_type.toUpperCase()}] ${data.title}\n${data.message}`)
        fetchAgentData()
      } else if (data.type === 'ticket_update') {
        fetchAgentData()
      }
    }

    socket.onclose = () => {
      logger.warning('Notifications disconnected. Retrying in 5s...')
      setTimeout(connectNotificationWebSocket, 5000)
    }

    notificationSocketRef.current = socket
  }

  const connectChatWebSocket = (ticketId) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = '8000'
    const socket = new WebSocket(`${wsProtocol}//${host}:${port}/ws/tickets/${ticketId}/chat/`)

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data)
      
      if (data.type === 'chat_message') {
        setMessages((prev) => {
          if (prev.some(m => m.id === data.message_id)) return prev
          return [...prev, {
            id: data.message_id,
            content: data.content,
            is_internal: data.is_internal,
            created_at: data.timestamp,
            author: { email: data.sender_name }
          }]
        })
      } else if (data.type === 'typing_indicator') {
        if (data.is_typing) {
          setPresenceUsers(prev => [...new Set([...prev, data.user_name])])
        } else {
          setPresenceUsers(prev => prev.filter(u => u !== data.user_name))
        }
      }
    }

    chatSocketRef.current = socket
  }

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------

  const handleToggleAvailability = async () => {
    if (!profile) return
    try {
      const updatedValue = !profile.is_available
      await authAPI.updateProfile({ is_available: updatedValue })
      setProfile(prev => ({ ...prev, is_available: updatedValue }))
    } catch (err) {
      console.error('Failed to toggle availability:', err)
    }
  }

  const handleAssignToMe = async () => {
    if (!selectedTicket || !profile) return
    setActionLoading(true)
    try {
      await ticketAPI.assign(selectedTicket.id, profile.id)
      await fetchAgentData(selectedTicket.id)
    } catch (err) {
      console.error('Failed to assign ticket:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolveTicket = () => {
    if (!selectedTicket) return
    setResolveNotes('')
    setResolveModalOpen(true)
  }

  const confirmResolveTicket = async () => {
    if (resolveNotes.trim().length < 5) {
      alert('Resolution notes must be at least 5 characters long')
      return
    }
    
    setResolveModalOpen(false)
    setActionLoading(true)
    try {
      await ticketAPI.resolve(selectedTicket.id, resolveNotes.trim())
      await fetchAgentData(selectedTicket.id)
    } catch (err) {
      console.error('Failed to resolve ticket:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTicket) return
    setActionLoading(true)
    try {
      await ticketAPI.update(selectedTicket.id, { status: newStatus })
      await fetchAgentData(selectedTicket.id)
    } catch (err) {
      console.error('Failed to update ticket status:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const openEscalationModal = () => {
    setEscalationReason('')
    setEscalationModalOpen(true)
  }

  const confirmEscalation = async () => {
    if (!selectedTicket) return
    setEscalationModalOpen(false)
    setActionLoading(true)
    try {
      await ticketAPI.escalate(selectedTicket.id)
      await fetchAgentData(selectedTicket.id)
    } catch (err) {
      console.error('Failed to escalate ticket:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReopen = async () => {
    if (!selectedTicket) return
    setActionLoading(true)
    try {
      await ticketAPI.reopen(selectedTicket.id)
      await fetchAgentData(selectedTicket.id)
    } catch (err) {
      console.error('Failed to reopen ticket:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!selectedTicket || !reply.trim()) return

    if (chatSocketRef.current && chatSocketRef.current.readyState === WebSocket.OPEN) {
      chatSocketRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: reply.trim(),
        is_internal: isInternal
      }))
      setReply('')
      sendTypingStatus(false)
    } else {
      setActionLoading(true)
      try {
        await ticketAPI.addMessage(selectedTicket.id, reply.trim(), isInternal)
        setReply('')
        await loadTicketDetails(selectedTicket.id)
      } catch (err) {
        console.error('Failed to post reply:', err)
      } finally {
        setActionLoading(false)
      }
    }
  }

  const handleTyping = (e) => {
    setReply(e.target.value)
    
    if (!isTyping) {
      sendTypingStatus(true)
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false)
    }, 2000)
  }

  const sendTypingStatus = (status) => {
    setIsTyping(status)
    if (chatSocketRef.current && chatSocketRef.current.readyState === WebSocket.OPEN) {
      chatSocketRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: status
      }))
    }
  }

  const handleApplySuggestedReply = () => {
    if (copilot?.suggested_reply) {
      setReply(copilot.suggested_reply)
      setExpandedSection(null) // Collapse draft section
    }
  }

  // -------------------------------------------------------------
  // Filters for Queue
  // -------------------------------------------------------------

  const getFilteredQueue = () => {
    let list = queue
    if (activeTab === 'assigned') {
      list = queue.filter(t => t.agent?.id === profile?.id && !['resolved', 'closed'].includes(t.status))
    } else if (activeTab === 'unassigned') {
      list = queue.filter(t => !t.agent && t.status === 'new')
    } else if (activeTab === 'sla') {
      list = queue.filter(t => t.agent?.id === profile?.id && t.is_escalated)
    }

    if (ticketSearch) {
      list = list.filter(t => 
        t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) || 
        t.ticket_number.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        (t.customer?.email || '').toLowerCase().includes(ticketSearch.toLowerCase())
      )
    }

    if (priorityFilter) {
      list = list.filter(t => t.priority === priorityFilter)
    }

    return list
  }

  const filteredQueue = getFilteredQueue()

  const statusLabel = selectedTicket ? (selectedTicket.status || 'unknown') : 'no ticket selected'

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 min-h-full flex flex-col gap-6 font-sans">
        <style>{SCOPED_CSS}</style>
        <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200">
          <div className="space-y-2">
            <div className="agd-skeleton h-6 w-48" />
            <div className="agd-skeleton h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="agd-skeleton h-5 w-24" />
              <div className="agd-skeleton h-10 w-full" />
              <div className="agd-skeleton h-16 w-full" />
              <div className="agd-skeleton h-16 w-full" />
            </div>
          </div>
          <div className="xl:col-span-6 bg-white p-6 rounded-xl border border-slate-200 space-y-6">
            <div className="agd-skeleton h-8 w-1/2" />
            <div className="agd-skeleton h-14 w-full" />
            <div className="agd-skeleton h-24 w-full" />
            <div className="agd-skeleton h-32 w-full" />
          </div>
          <div className="xl:col-span-3 bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="agd-skeleton h-5 w-32" />
            <div className="agd-skeleton h-12 w-full" />
            <div className="agd-skeleton h-12 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="p-6 bg-slate-50 min-h-full flex flex-col gap-6 font-sans">
      <style>{SCOPED_CSS}</style>
      
      {/* Workspace Header & Agent Metrics */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" /> Agent Workspace
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Automated queue routing, SLA tracking, and real-time AI resolution copilot.</p>
        </div>
        
        {/* Performance metrics of this Agent */}
        {profile && (
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Expertise Score</p>
                <p className="text-sm font-bold text-slate-900">{profile.expertise_score || '0.0'}/100</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Success Rate</p>
                <p className="text-sm font-bold text-slate-900">{profile.success_rate || '0.0'}%</p>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold ${profile.is_available ? 'text-emerald-600' : 'text-slate-400'}`}>
                {profile.is_available ? 'Available' : 'Unavailable'}
              </span>
              <button
                type="button"
                onClick={handleToggleAvailability}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  profile.is_available ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.is_available ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3-Column Layout: Left (25%), Center (50%), Right (25%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Column 1: Ticket Queue List (25% -> xl:col-span-3) */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Workspace Queues</h2>
            </CardHeader>
            <CardBody className="p-3 space-y-3">
              {/* Tab Navigation */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('assigned')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md text-center transition ${
                    activeTab === 'assigned' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  My Queue
                </button>
                <button
                  onClick={() => setActiveTab('unassigned')}
                  className={`relative flex-1 py-1 text-[11px] font-semibold rounded-md text-center transition ${
                    activeTab === 'unassigned' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Unassigned
                  {queue.filter(t => !t.agent && t.status === 'new').length > 0 && (
                    <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('sla')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md text-center transition ${
                    activeTab === 'sla' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Escalated
                </button>
              </div>

              {/* Filters & Search */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search title, ID, user..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-none"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Ticket Cards */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredQueue.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 font-medium">
                    No active tickets in this queue
                  </div>
                ) : (
                  filteredQueue.map((ticket) => {
                    const isSelected = selectedTicket?.id === ticket.id
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-slate-50 border-indigo-600 ring-1 ring-indigo-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-mono text-slate-400">
                            {ticket.ticket_number}
                          </span>
                          <span className="flex items-center gap-1">
                            {ticket.is_escalated && (
                              <Badge size="sm" variant="danger">Escalated</Badge>
                            )}
                            <Badge
                              size="sm"
                              variant={ticket.priority === 'critical' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'info'}
                              className="text-[8px] uppercase"
                            >
                              {ticket.priority}
                            </Badge>
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-800 text-xs leading-tight line-clamp-1">
                          {ticket.subject}
                        </h4>
                        <div className="flex justify-between items-center mt-2 text-[9px] text-slate-400">
                          <span className="truncate max-w-[120px]">{ticket.customer?.email}</span>
                          <span className="capitalize">{ticket.status?.replace('_', ' ')}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Column 2: Primary Work Area (50% -> xl:col-span-6) */}
        <div className="xl:col-span-6 space-y-4">
          {selectedTicket ? (
            <Card className="shadow-sm border-slate-200 bg-white">
              {/* Header Details */}
              <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{selectedTicket.ticket_number}</span>
                    {selectedTicket.department_name && (
                      <span className="text-[9px] text-indigo-700 font-semibold px-2 py-0.5 bg-indigo-50 rounded-md">
                        {selectedTicket.department_name}
                      </span>
                    )}
                    {selectedTicket.category_name && (
                      <span className="text-[9px] text-slate-600 px-2 py-0.5 bg-slate-100 rounded-md">
                        {selectedTicket.category_name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1 leading-snug truncate">{selectedTicket.subject}</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">Submitted by: <span className="font-medium text-slate-700">{selectedTicket.customer?.email}</span></p>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <Badge variant={selectedTicket.priority === 'critical' ? 'danger' : selectedTicket.priority === 'high' ? 'warning' : 'primary'} className="uppercase text-[9px]">
                    {selectedTicket.priority}
                  </Badge>
                  <Badge variant={selectedTicket.status === 'resolved' ? 'success' : selectedTicket.status === 'closed' ? 'secondary' : 'info'} className="uppercase text-[9px]">
                    {selectedTicket.status?.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>

              <div className="border-t border-slate-100 bg-slate-50 p-3 flex flex-wrap items-center gap-2">
                {selectedTicket.agent?.id !== profile?.id && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <Button size="sm" variant="secondary" onClick={handleAssignToMe} loading={actionLoading}>
                    Assign to Me
                  </Button>
                )}
                {['new', 'assigned'].includes(selectedTicket.status) && (
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('in_progress')} loading={actionLoading}>
                    Start Work
                  </Button>
                )}
                {selectedTicket.status !== 'waiting_customer' && !['resolved', 'closed'].includes(selectedTicket.status) && (
                  <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus('waiting_customer')} loading={actionLoading}>
                    Request Customer Reply
                  </Button>
                )}
                {!selectedTicket.is_escalated && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <Button size="sm" variant="danger" onClick={openEscalationModal} loading={actionLoading}>
                    Escalate
                  </Button>
                )}
                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <Button size="sm" variant="success" onClick={handleResolveTicket} loading={actionLoading}>
                    Resolve
                  </Button>
                )}
                {selectedTicket.status === 'resolved' && (
                  <Button size="sm" variant="outline" onClick={handleReopen} loading={actionLoading}>
                    Reopen
                  </Button>
                )}
              </div>

              <CardBody className="p-4 space-y-4">
                {/* 1. AI Insights (Operational details only, no raw score labels) */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Sentiment</span>
                    <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                      {selectedTicket.sentiment === 'Angry' ? '😡 Angry' : 
                       selectedTicket.sentiment === 'Frustrated' ? '😟 Frustrated' : 
                       selectedTicket.sentiment === 'Concerned' ? '😕 Concerned' : 
                       selectedTicket.sentiment === 'Urgent' ? '⚡ Urgent' : '😐 Neutral'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Urgency</span>
                    <span className={`text-[11px] font-semibold capitalize ${
                      ['critical', 'high', 'Urgent'].includes(selectedTicket.priority) ? 'text-amber-700' : 'text-slate-700'
                    }`}>{['critical', 'high', 'Urgent'].includes(selectedTicket.priority) ? 'High' : 'Medium'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Impact</span>
                    <span className="text-[11px] font-semibold text-slate-800 capitalize">
                      {selectedTicket.priority === 'critical' ? 'Department' : 'Single User'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">SLA Risk</span>
                    <span className={`text-[11px] font-semibold uppercase ${
                      selectedTicket.sla_risk_level === 'critical' || selectedTicket.sla_risk_level === 'high' ? 'text-rose-600' : 'text-slate-600'
                    }`}>{selectedTicket.sla_risk_level || 'Low'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">AI Priority</span>
                    <span className="text-[11px] font-semibold text-slate-800 uppercase">{selectedTicket.priority}</span>
                  </div>
                </div>

                {/* 2. Status (simplified) */}
                <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Status:</span>
                  <span style={{ marginLeft: '8px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{statusLabel}</span>
                </div>

                {/* Issue Description */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issue Description</span>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* 3. Correspondence Thread */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-xs text-slate-800 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-slate-400" /> Correspondence History
                    </h3>
                    {presenceUsers.length > 0 && (
                      <span className="text-[10px] text-slate-400 animate-pulse italic">
                        {presenceUsers.join(', ')} is typing...
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto mb-3 border border-slate-200 rounded-lg p-3 bg-slate-50/30">
                    {messages.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">No correspondence logged</p>
                    ) : (
                      messages.map((msg) => {
                        const isInternalNote = msg.is_internal
                        const isSelf = msg.author?.email === profile?.email
                        return (
                          <div 
                            key={msg.id} 
                            className={`p-2.5 rounded-lg max-w-[85%] border ${
                              isInternalNote 
                                ? 'bg-amber-50/70 border-amber-200 ml-0 mr-auto'
                                : isSelf
                                  ? 'bg-white border-slate-200 ml-auto mr-0'
                                  : 'bg-slate-100 border-slate-200 ml-0 mr-auto'
                            }`}
                          >
                            <div className="flex justify-between items-center gap-4 text-[9px] text-slate-400 mb-1 font-semibold">
                              <span>{isInternalNote ? 'INTERNAL NOTE' : msg.author?.email || 'System'}</span>
                              <span>{formatRelative(msg.created_at)}</span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed">{msg.content}</p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* 4. Response Editor */}
                <form onSubmit={handleSendReply} className="space-y-3">
                  <Textarea 
                    placeholder={isInternal ? "Write a private internal note..." : "Write a reply to the customer..."} 
                    value={reply} 
                    onChange={handleTyping} 
                    rows={3} 
                    className={`rounded-lg text-xs ${isInternal ? 'border-amber-200 focus:ring-amber-500 bg-amber-50/30' : 'border-slate-200'}`}
                  />
                  
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    {/* Internal toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isInternal} 
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" 
                      />
                      <span className="text-[10px] font-semibold text-slate-500">Post as Internal Note</span>
                    </label>

                    {/* 5. Ticket Actions */}
                    <div className="flex gap-2">
                      <Button type="submit" disabled={!reply.trim() || actionLoading} className="rounded-lg">
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                    </div>
                  </div>
                </form>
              </CardBody>
            </Card>
          ) : (
            <div className="bg-white p-12 text-center border border-slate-200 rounded-xl">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No Active Workspace</p>
              <p className="text-[11px] text-slate-400">Choose a support request from the queue to process</p>
            </div>
          )}
        </div>

        {/* Column 3: AI Copilot Recommendations (25% -> xl:col-span-3) */}
        <div className="xl:col-span-3">
          {selectedTicket ? (
            copilotLoading ? (
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardBody className="p-5 space-y-4">
                  <div className="agd-skeleton h-5 w-24" />
                  <div className="agd-skeleton h-12 w-full" />
                  <div className="agd-skeleton h-12 w-full" />
                </CardBody>
              </Card>
            ) : copilot ? (
              <div className="space-y-3">
                {selectedTicket.routing_recommendation && (
                  <Card className="border-indigo-100 bg-indigo-50/20 shadow-sm">
                    <CardHeader className="p-3 border-b border-indigo-100">
                      <h2 className="font-semibold text-xs text-slate-800 uppercase tracking-wide">AI Triage</h2>
                    </CardHeader>
                    <CardBody className="p-3 text-[12px] text-slate-700 space-y-2">
                      <p>{copilot.summary || 'No summary available.'}</p>
                      {copilot.root_cause && (
                        <p className="text-slate-500">Root cause: {copilot.root_cause}</p>
                      )}
                      <div className="text-[11px] text-slate-500 space-y-1">
                        <p><strong>Suggested action:</strong> {copilot.recommended_action || 'Review the draft reply and apply the resolution steps.'}</p>
                        <p><strong>Confidence:</strong> {selectedTicket.routing_recommendation.confidence}%</p>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {selectedTicket.escalation_prediction && selectedTicket.escalation_prediction.risk_level !== 'Low Risk' && (
                  <Card className="border-rose-100 bg-rose-50/20 shadow-sm">
                    <CardHeader className="p-3 border-b border-rose-100">
                      <h2 className="font-semibold text-xs text-slate-800 uppercase tracking-wide">Escalation Risk</h2>
                    </CardHeader>
                    <CardBody className="p-3 text-[12px] text-rose-700 space-y-1">
                      <p className="font-semibold">{selectedTicket.escalation_prediction.risk_level}</p>
                      <p>{selectedTicket.escalation_prediction.reasons?.[0] || 'Urgent attention recommended.'}</p>
                    </CardBody>
                  </Card>
                )}

                <Card className="shadow-sm border-slate-200 bg-white">
                  <CardHeader className="p-3 border-b border-slate-100">
                    <h2 className="font-semibold text-xs text-slate-800 uppercase tracking-wide">Next Best Actions</h2>
                  </CardHeader>
                  <CardBody className="p-3 text-[12px] text-slate-700">
                    {copilot.resolution_recommendations?.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1">
                        {copilot.resolution_recommendations.slice(0, 4).map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No actionable steps found. Use the draft response or escalate if needed.</p>
                    )}
                  </CardBody>
                </Card>

                {copilot.suggested_reply && (
                  <Card className="shadow-sm border-slate-200 bg-white">
                    <CardHeader className="p-3 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-xs text-slate-800 uppercase tracking-wide">Draft Response</span>
                        <Button size="sm" variant="outline" onClick={handleApplySuggestedReply}>
                          Use Draft
                        </Button>
                      </div>
                    </CardHeader>
                    <CardBody className="p-3 text-[12px] text-slate-700 whitespace-pre-wrap">
                      {copilot.suggested_reply}
                    </CardBody>
                  </Card>
                )}

                {(copilot.similar?.length > 0 || copilot.sources?.length > 0) && (
                  <div className="grid gap-3">
                    {copilot.similar?.length > 0 && (
                      <Card className="shadow-sm border-slate-200 bg-white">
                        <CardHeader className="p-3 border-b border-slate-100">
                          <h2 className="font-semibold text-xs text-slate-800 uppercase tracking-wide">Similar Tickets</h2>
                        </CardHeader>
                        <CardBody className="p-3 space-y-2 text-[11px] text-slate-700">
                          {copilot.similar.slice(0, 4).map((t) => (
                            <div key={t.id} className="flex items-center justify-between gap-3 p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTicket(t)}>
                              <span className="truncate">{t.subject}</span>
                              <Badge size="sm" variant={t.status === 'resolved' ? 'success' : 'info'}>{t.status}</Badge>
                            </div>
                          ))}
                        </CardBody>
                      </Card>
                    )}

                    {copilot.sources?.length > 0 && (
                      <Card className="shadow-sm border-slate-200 bg-white">
                        <CardHeader className="p-3 border-b border-slate-100">
                          <h2 className="font-semibold text-xs text-slate-800 uppercase tracking-wide">Knowledge References</h2>
                        </CardHeader>
                        <CardBody className="p-3 space-y-2 text-[11px] text-slate-700">
                          {copilot.sources.slice(0, 4).map((s, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 p-2 rounded border border-slate-200 bg-slate-50">
                              <span className="truncate">{s.source}</span>
                              <Badge size="sm" variant="secondary">{getSourceTypeLabel(s.type)}</Badge>
                            </div>
                          ))}
                        </CardBody>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-5 border border-slate-200 rounded-xl text-center">
                <Sparkles className="w-6 h-6 mx-auto text-slate-300 mb-1 animate-pulse" />
                <p className="text-[11px] text-slate-400">No active Copilot insights for this request</p>
              </div>
            )
          ) : (
            <div className="bg-white p-5 border border-slate-200 rounded-xl text-center">
              <Sparkles className="w-6 h-6 mx-auto text-slate-300 mb-1" />
              <p className="text-[11px] text-slate-400">Select a request to engage Copilot</p>
            </div>
          )}
        </div>

      </div>
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Resolve Issue"
        footer={
          <>
            <Button variant="outline" onClick={() => setResolveModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={confirmResolveTicket} loading={actionLoading}>Confirm Resolve</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Please provide a brief summary of how this issue was resolved. These notes will be saved to the ticket history.</p>
          <Textarea
            label="Resolution Notes"
            placeholder="Steps taken to resolve the issue..."
            rows={4}
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
          />
        </div>
      </Modal>
    </>
  )
}

const logger = {
  info: (msg) => console.log(`[WS-INFO] ${msg}`),
  warning: (msg) => console.warn(`[WS-WARN] ${msg}`)
}