import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, Sparkles, Ticket, Plus, RotateCcw, ChevronRight } from 'lucide-react'
import { searchAPI } from '../../services/api'
import { CreateTicketModal } from './CreateTicketModal'

/* ─── Scoped CSS ─────────────────────────────────────────────────────────── */
const CSS = `
.ai-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Top bar */
.ai-topbar {
  padding: 14px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
}
.ai-topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ai-topbar-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(37,99,235,0.25);
}
.ai-topbar-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}
.ai-topbar-subtitle {
  font-size: 0.75rem;
  color: #64748b;
  margin: 2px 0 0;
}
.ai-topbar-actions { display: flex; gap: 8px; }
.ai-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.ai-action-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #1e293b;
}

/* Chat column — full width now */
.ai-chat-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Message list */
.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Empty / welcome state */
.ai-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 56px 24px;
  gap: 10px;
}
.ai-welcome-icon {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(37,99,235,0.3);
  margin-bottom: 8px;
}
.ai-welcome h2 {
  font-size: 1.3rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}
.ai-welcome p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  max-width: 380px;
}
.ai-starter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
  max-width: 500px;
  width: 100%;
}
@media (max-width: 600px) {
  .ai-starter-grid { grid-template-columns: 1fr; }
}
.ai-starter-btn {
  text-align: left;
  padding: 11px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  font-family: inherit;
  line-height: 1.4;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ai-starter-btn:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

/* Message bubbles */
.ai-msg-user {
  display: flex;
  justify-content: flex-end;
}
.ai-bubble-user {
  max-width: 76%;
  background: #2563eb;
  color: #fff;
  border-radius: 18px 18px 4px 18px;
  padding: 11px 16px;
  font-size: 0.875rem;
  line-height: 1.55;
  box-shadow: 0 2px 8px rgba(37,99,235,0.2);
}
.ai-msg-assistant {
  display: flex;
  gap: 12px;
  max-width: 88%;
}
.ai-assistant-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  box-shadow: 0 2px 8px rgba(37,99,235,0.2);
}
.ai-bubble-assistant {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px 18px 18px 18px;
  padding: 12px 16px;
  font-size: 0.875rem;
  color: #1e293b;
  white-space: pre-wrap;
  line-height: 1.65;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}

/* Follow-up chips */
.ai-followups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.ai-followup-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 6px;
}
.ai-followup-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 13px;
  border: 1.5px solid #dbeafe;
  border-radius: 999px;
  background: #eff6ff;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1d4ed8;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.ai-followup-btn:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}
.ai-followup-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Create-ticket nudge */
.ai-ticket-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  padding: 6px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.ai-ticket-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #1e293b;
}

/* Typing indicator */
.ai-typing {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.ai-typing-dots {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px 18px 18px 18px;
  padding: 12px 16px;
  display: flex;
  gap: 5px;
  align-items: center;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.ai-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #94a3b8;
  animation: ai-bounce 1.2s infinite ease-in-out;
}
.ai-dot:nth-child(2) { animation-delay: 0.15s; }
.ai-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes ai-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
}

/* Input bar */
.ai-input-bar {
  border-top: 1px solid #e2e8f0;
  padding: 14px 28px;
  background: #fff;
  flex-shrink: 0;
}
.ai-input-inner {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-still-need {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
  font-size: 0.78rem;
}
.ai-still-need span { color: #64748b; font-weight: 500; }
.ai-still-need button {
  color: #2563eb;
  font-weight: 700;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-family: inherit;
}
.ai-input-form {
  display: flex;
  gap: 8px;
}
.ai-input-field {
  flex: 1;
  padding: 11px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #0f172a;
  background: #f8fafc;
  font-family: inherit;
  outline: none;
  transition: all 0.15s;
}
.ai-input-field:focus {
  border-color: #2563eb;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}
.ai-input-field:disabled { opacity: 0.5; }
.ai-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px 18px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: inherit;
  flex-shrink: 0;
}
.ai-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ai-send-btn:not(:disabled):hover { opacity: 0.88; }

/* Welcome input */
.ai-welcome-form {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto 8px;
}
.ai-welcome-input {
  flex: 1;
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #0f172a;
  background: #f8fafc;
  font-family: inherit;
  outline: none;
  transition: all 0.15s;
}
.ai-welcome-input:focus {
  border-color: #2563eb;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}
`

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
  billing: [
    'Where can I view my billing history?',
    'How do I update my payment method?',
    'When is my next billing date?',
    'How do I request a refund?',
  ],
  default: [
    'Can you give me more detail on that?',
    'How do I create a support ticket for this?',
    'Who is the right team to contact?',
    'What is the expected resolution time?',
  ],
}

function getTopicSuggestions(query = '', apiSuggestions = []) {
  if (apiSuggestions && apiSuggestions.length >= 2) return apiSuggestions.slice(0, 4)
  const q = query.toLowerCase()
  if (q.includes('salary') || q.includes('payslip') || q.includes('payroll')) return TOPIC_SUGGESTIONS.salary
  if (q.includes('leave') || q.includes('annual') || q.includes('vacation')) return TOPIC_SUGGESTIONS.leave
  if (q.includes('password') || q.includes('login') || q.includes('locked')) return TOPIC_SUGGESTIONS.password
  if (q.includes('vpn') || q.includes('remote') || q.includes('network')) return TOPIC_SUGGESTIONS.vpn
  if (q.includes('hardware') || q.includes('laptop') || q.includes('monitor')) return TOPIC_SUGGESTIONS.hardware
  if (q.includes('software') || q.includes('install') || q.includes('application')) return TOPIC_SUGGESTIONS.software
  if (q.includes('ticket') || q.includes('status') || q.includes('request')) return TOPIC_SUGGESTIONS.ticket
  if (q.includes('billing') || q.includes('invoice') || q.includes('payment')) return TOPIC_SUGGESTIONS.billing
  return TOPIC_SUGGESTIONS.default
}

const ISSUE_INTENT_MAP = [
  { type: 'password', keywords: ['password', 'login', 'locked out', 'authenticate', 'mfa', 'sign in', 'sign-in', 'auth'] },
  { type: 'network', keywords: ['vpn', 'wifi', 'network', 'disconnect', 'dns', 'latency', 'router', 'internet', 'connection'] },
  { type: 'hardware', keywords: ['laptop', 'desktop', 'monitor', 'printer', 'battery', 'charging', 'overheat', 'overheating', 'fan', 'keyboard', 'mouse', 'server'] },
  { type: 'software', keywords: ['install', 'update', 'application', 'app', 'software', 'crash', 'error', 'freeze', 'not responding', 'opens', 'opening'] },
  { type: 'billing', keywords: ['billing', 'invoice', 'payment', 'salary', 'payslip', 'payroll', 'refund', 'charge'] },
  { type: 'security', keywords: ['security', 'breach', 'malware', 'virus', 'unauthorized', 'phishing', 'credential', 'data loss', 'compromise'] },
  { type: 'email', keywords: ['outlook', 'email', 'mail', 'exchange', 'inbox', 'sent items'] },
]

function detectIntent(query = '') {
  const text = query.toLowerCase()
  for (const entry of ISSUE_INTENT_MAP) {
    if (entry.keywords.some(keyword => text.includes(keyword))) {
      return entry.type
    }
  }
  return 'general'
}

function parseContext(query, context) {
  const text = query.toLowerCase()
  const next = { ...context }

  if (!next.issueType) next.issueType = detectIntent(query)

  if (!next.device) {
    const deviceMatch = query.match(/\b(laptop|desktop|tablet|phone|printer|monitor|server|router|workstation|macbook|iphone|android)\b/i)
    if (deviceMatch) next.device = deviceMatch[1]
  }

  if (!next.deviceModel) {
    const deviceModelMatch = query.match(/\b(dell\s+\w+|lenovo\s+\w+|hp\s+\w+|acer\s+\w+|asus\s+\w+|surface\s+\w+|macbook\s+\w+|thinkpad\s+\w+|latitude\s+\w+)\b/i)
    if (deviceModelMatch) next.deviceModel = deviceModelMatch[1]
  }

  if (!next.operatingSystem) {
    const osMatch = query.match(/\b(windows\s?\d+|windows|macos|mac os|mac|ubuntu|linux|android|ios)\b/i)
    if (osMatch) next.operatingSystem = osMatch[1]
  }

  if (!next.application) {
    const appMatch = query.match(/\b(outlook|teams|slack|zoom|skype|jira|salesforce|sap|chrome|edge|firefox|office|word|excel|powerpoint|gmail|exchange)\b/i)
    if (appMatch) next.application = appMatch[1]
  }

  if (!next.software) {
    const softwareMatch = query.match(/\b(win(?:dows)?\s?\d+|macos|mac os|mac|ubuntu|linux|chrome|edge|firefox|outlook|office|teams|slack|zoom|skype|jira|salesforce|sap)\b/i)
    if (softwareMatch) next.software = softwareMatch[1]
  }

  if (!next.environment) {
    const envMatch = query.match(/\b(home|office|remote|vpn|cloud|onsite|on-site|branch|site|work network|home network)\b/i)
    if (envMatch) next.environment = envMatch[1]
  }

  if (!next.error) {
    const errorMatch = query.match(/(['\"][^'\"]+['\"]|error\s*\d+|access denied|permission denied|failed to|cannot connect|unable to connect|timed out|timeout|not responding|crash(?:es|ed)?|unexpected shutdown|blue screen|overheat(?:ing)?|slow|freeze(?:s|d)?|hangs?|hang|not opening|won't open|cannot login|can't login|unable to login|login failed|authentication failed)/i)
    if (errorMatch) next.error = errorMatch[1] || errorMatch[0]
  }

  const attemptPatterns = [
    { regex: /\b(restart(?:ed|s)?|reboot(?:ed|s)?|power cycled?)\b/i, label: 'Restarted the device' },
    { regex: /\b(clear(?:ed)? cache|cache cleared)\b/i, label: 'Cleared cache' },
    { regex: /\b(reinstall(?:ed|s)?|installed again)\b/i, label: 'Reinstalled the app' },
    { regex: /\b(log(?:ged)? out|signed out)\b/i, label: 'Signed out and back in' },
    { regex: /\b(disconnect(?:ed|s)?|reconnect(?:ed|s)?)\b/i, label: 'Reconnected network' },
    { regex: /\b(update(?:d|s)?|patch(?:ed|es)?)\b/i, label: 'Updated software' },
  ]

  for (const attempt of attemptPatterns) {
    if (attempt.regex.test(query) && !next.attempts.includes(attempt.label)) {
      next.attempts = [...next.attempts, attempt.label]
    }
  }

  if (!next.severity) {
    if (/\b(urgent|critical|emergency|blocked|down|unable to work|cannot work|business critical|high impact|outage)\b/i.test(query)) {
      next.severity = 'critical'
    }
  }

  if (!next.impact) {
    const impactMatch = query.match(/\b(cannot work|unable to work|blocked|down|delayed|stopped|stuck|no access|lost access)\b/i)
    if (impactMatch) next.impact = impactMatch[1]
  }

  return next
}

function getClarificationQuestion(context, query) {
  const intent = context.issueType || detectIntent(query)

  if (intent === 'hardware') {
    if (!context.deviceModel) return { field: 'deviceModel', question: 'What laptop or hardware model are you using?' }
    if (!context.operatingSystem) return { field: 'operatingSystem', question: 'Which operating system is installed on that device?' }
    if (!context.error) return { field: 'error', question: 'What exact overheating symptom do you see? For example, does it happen during charging, gaming, or regular work?' }
    if (!context.attempts.length) return { field: 'attempts', question: 'Have you already restarted the device or checked the vents and fans?' }
    return null
  }

  if (intent === 'network') {
    if (!context.application) return { field: 'application', question: 'Which VPN or network client are you using?' }
    if (!context.error) return { field: 'error', question: 'What error message or disconnect notice do you see?' }
    if (!context.environment) return { field: 'environment', question: 'Does this happen on a home network, office network, or while on VPN?' }
    if (!context.attempts.length) return { field: 'attempts', question: 'Have you tried reconnecting, restarting the VPN client, or switching networks?' }
    return null
  }

  if (intent === 'password') {
    if (!context.error) return { field: 'error', question: 'What exact sign-in error or message do you see?' }
    if (!context.application) return { field: 'application', question: 'Which system or application are you trying to log in to?' }
    if (!context.attempts.length) return { field: 'attempts', question: 'Have you tried password reset or checking whether MFA is enabled?' }
    return null
  }

  if (intent === 'email') {
    if (!context.application) return { field: 'application', question: 'Which email application are you using? For example, Outlook or Exchange.' }
    if (!context.error) return { field: 'error', question: 'What error or behavior do you see when the email app opens?' }
    if (!context.attempts.length) return { field: 'attempts', question: 'Have you already restarted the app or the computer?' }
    return null
  }

  if (intent === 'software') {
    if (!context.application) return { field: 'application', question: 'Which application or software is affected by this issue?' }
    if (!context.error) return { field: 'error', question: 'Are you seeing an error message or a crash? Please describe what happens.' }
    if (!context.attempts.length) return { field: 'attempts', question: 'Have you tried restarting the app or updating it?' }
    return null
  }

  if (intent === 'security') {
    if (!context.error) return { field: 'error', question: 'What suspicious behavior or security alert are you seeing?' }
    if (!context.impact) return { field: 'impact', question: 'How is this affecting your ability to work or access systems?' }
    return null
  }

  if (!context.error) return { field: 'error', question: 'Can you describe the exact problem or message you are seeing?' }
  if (!context.attempts.length) return { field: 'attempts', question: 'What have you already tried to resolve this issue?' }
  return null
}

function buildTriageQuery(query, context) {
  const lines = [
    'Support triage request:',
    query,
  ]

  if (context.issueType && context.issueType !== 'general') lines.push(`Issue type: ${context.issueType}`)
  if (context.device) lines.push(`Device: ${context.device}`)
  if (context.deviceModel) lines.push(`Device model: ${context.deviceModel}`)
  if (context.operatingSystem) lines.push(`Operating system: ${context.operatingSystem}`)
  if (context.application) lines.push(`Application: ${context.application}`)
  if (context.software) lines.push(`Software: ${context.software}`)
  if (context.environment) lines.push(`Environment: ${context.environment}`)
  if (context.error) lines.push(`Error details: ${context.error}`)
  if (context.attempts.length) lines.push(`Troubleshooting attempted: ${context.attempts.join('; ')}`)
  if (context.severity) lines.push(`Severity: ${context.severity}`)
  if (context.impact) lines.push(`Impact: ${context.impact}`)

  lines.push(
    'Use available FAQ and knowledge base results first.',
    'Provide troubleshooting guidance before suggesting ticket creation.',
    'Recommend a ticket only if confidence is low, the issue persists, hardware replacement looks likely, a security issue is present, or critical business impact is detected.'
  )

  return lines.join('\n')
}

function shouldRecommendTicket(data, query, context, searchCount) {
  const lowConfidence = typeof data.confidence === 'number' && data.confidence < 0.60
  const noSources = !data.sources?.length
  const persistenceSignal = /\b(still|not fixed|doesn\'t work|doesnt work|keep failing|persistent|continues|unable to|can\'t|cannot|still unable|still cannot)\b/i.test(query)
  const criticalSignal = context.severity === 'critical' || /\b(urgent|critical|emergency|blocked|down|business critical|outage)\b/i.test(query)
  const hardwareOrSecurity = ['hardware', 'security'].includes(context.issueType)

  if (!searchCount) return false
  if (persistenceSignal || criticalSignal) return true
  if (hardwareOrSecurity && lowConfidence && searchCount >= 1) return true
  if (noSources && lowConfidence && searchCount > 1) return true
  return false
}

function summarizeTicketContext(context, messages) {
  const summary = []
  summary.push('Created from Support Assistant.')
  summary.push('')
  summary.push(`Issue type: ${context.issueType || 'General support'}`)
  if (context.device) summary.push(`Device: ${context.device}`)
  if (context.deviceModel) summary.push(`Device model: ${context.deviceModel}`)
  if (context.operatingSystem) summary.push(`Operating system: ${context.operatingSystem}`)
  if (context.application) summary.push(`Application: ${context.application}`)
  if (context.software) summary.push(`Software: ${context.software}`)
  if (context.environment) summary.push(`Environment: ${context.environment}`)
  if (context.error) summary.push(`Error details: ${context.error}`)
  if (context.attempts.length) summary.push(`Troubleshooting attempted: ${context.attempts.join('; ')}`)
  if (context.severity) summary.push(`Severity: ${context.severity}`)
  if (context.impact) summary.push(`Impact: ${context.impact}`)
  summary.push('')
  summary.push('Conversation history:')
  messages.forEach((m, index) => {
    const speaker = m.role === 'user' ? 'User' : 'Support Assistant'
    summary.push(`${speaker} ${index + 1}: ${m.content}`)
  })
  return summary.join('\n')
}

const STARTER_SUGGESTIONS = [
  { label: 'Reset my password', q: 'How do I reset my password?' },
  { label: 'VPN troubleshooting', q: 'How do I troubleshoot VPN issues?' },
  { label: 'Request software install', q: 'How do I request software installation?' },
  { label: 'Submit hardware request', q: 'How do I submit a hardware request?' },
]

function TypingIndicator() {
  return (
    <div className="ai-typing">
      <div className="ai-assistant-icon">
        <Sparkles size={16} color="#fff" />
      </div>
      <div className="ai-typing-dots">
        <span className="ai-dot" />
        <span className="ai-dot" />
        <span className="ai-dot" />
      </div>
    </div>
  )
}

export function AIAssistant() {
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketPrefill, setTicketPrefill] = useState({ subject: '', description: '' })
  const [conversationContext, setConversationContext] = useState({
    device: null,
    deviceModel: null,
    operatingSystem: null,
    application: null,
    software: null,
    error: null,
    environment: null,
    attempts: [],
    severity: null,
    issueType: null,
    impact: null,
  })
  const [clarificationCount, setClarificationCount] = useState(0)
  const [searchAttempts, setSearchAttempts] = useState(0)
  const messagesContainerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const initialQuery = searchParams.get('q')

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isNearBottom = distanceFromBottom < 100

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSend(initialQuery)
    }
  }, [initialQuery])

  const handleSend = async (text) => {
    const query = (text || input).trim()
    if (!query || loading) return

    const userMessage = { id: Date.now(), role: 'user', content: query }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const updatedContext = parseContext(query, conversationContext)
    setConversationContext(updatedContext)

    const clarification = getClarificationQuestion(updatedContext, query)
    if (clarification && clarificationCount < 3) {
      setClarificationCount(prev => prev + 1)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: clarification.question,
        status: 'clarification',
        suggestedAction: null,
        followUps: getTopicSuggestions(query, []),
        userQuery: query,
      }])
      setLoading(false)
      return
    }

    try {
      const searchQuery = buildTriageQuery(query, updatedContext)
      const res = await searchAPI.search(searchQuery)
      const data = res.data
      const nextSearchAttempt = searchAttempts + 1
      setSearchAttempts(nextSearchAttempt)
      const suggestions = getTopicSuggestions(query, data.follow_up_questions || [])
      const shouldCreateTicket = shouldRecommendTicket(data, query, updatedContext, nextSearchAttempt)
      const rawContent = data.response || ''
      const responseContent = shouldCreateTicket
        ? data.response || 'I could not find an answer. Please create a support ticket for further help.'
        : (/ticket/i.test(rawContent) ? 'I did not find a direct FAQ answer. I will continue troubleshooting with the information you provided.' : rawContent || 'I could not find an answer, but I will continue troubleshooting with the details I have.' )
      const suggestedAction = shouldCreateTicket ? 'create_ticket' : (data.suggested_action || 'answer')

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseContent,
        status: data.status,
        suggestedAction,
        followUps: suggestions,
        userQuery: query,
      }])
      setClarificationCount(0)
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error
      const suggestions = getTopicSuggestions(text || input, [])
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: detail
          ? `I ran into a problem: ${detail}. Try again or create a ticket for help.`
          : 'Sorry, something went wrong. Please try again or create a support ticket.',
        suggestedAction: 'create_ticket',
        followUps: suggestions,
        userQuery: text || input,
      }])
    } finally {
      setLoading(false)
    }
  }

  const openCreateTicket = () => {
    const subjectPrefix = conversationContext.issueType === 'password'
      ? 'Password access issue'
      : conversationContext.issueType === 'network'
        ? 'Network connectivity issue'
        : conversationContext.issueType === 'hardware'
          ? 'Hardware issue'
          : conversationContext.issueType === 'security'
            ? 'Security issue'
            : conversationContext.issueType === 'software'
              ? 'Software issue'
              : 'Support request'

    const subject = conversationContext.issueType
      ? `${subjectPrefix}${conversationContext.device ? ` - ${conversationContext.device}` : ''}`
      : null

    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content)
    setTicketPrefill({
      subject: subject || userMessages[0]?.slice(0, 120) || 'Support request from AI chat',
      description: summarizeTicketContext(conversationContext, messages),
    })
    setShowTicketModal(true)
  }

  const resetChat = () => {
    setMessages([])
    setConversationContext({
      device: null,
      deviceModel: null,
      operatingSystem: null,
      application: null,
      software: null,
      error: null,
      environment: null,
      attempts: [],
      severity: null,
      issueType: null,
      impact: null,
    })
    setClarificationCount(0)
    setSearchAttempts(0)
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="ai-root">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="ai-topbar">
          <div className="ai-topbar-brand">
            <div className="ai-topbar-icon">
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <h1 className="ai-topbar-title">Support Assistant</h1>
              <p className="ai-topbar-subtitle">Ask anything — I'll find the answer for you</p>
            </div>
          </div>
          <div className="ai-topbar-actions">
            {messages.length > 0 && (
              <button className="ai-action-btn" onClick={resetChat}>
                <RotateCcw size={13} /> New conversation
              </button>
            )}
            <button className="ai-action-btn" onClick={openCreateTicket}>
              <Ticket size={13} /> Create ticket
            </button>
          </div>
        </div>

        {/* ── Chat column (full width) ─────────────────────────────────────── */}
        <div className="ai-chat-col">
          <div className="ai-messages" ref={messagesContainerRef}>

            {messages.length === 0 ? (
              /* ── Welcome / empty state ── */
              <div className="ai-welcome">
                <div className="ai-welcome-icon">
                  <Sparkles size={32} color="#fff" />
                </div>
                <h2>How can I help you today?</h2>
                <p>Ask about policies, IT issues, tickets, or anything else.</p>

                {/* Welcome search bar */}
                <form
                  className="ai-welcome-form"
                  style={{ marginTop: '20px' }}
                  onSubmit={e => { e.preventDefault(); handleSend() }}
                >
                  <input
                    className="ai-welcome-input"
                    placeholder="e.g. How do I reset my password?"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="ai-send-btn"
                    disabled={loading || !input.trim()}
                  >
                    <Send size={16} />
                  </button>
                </form>

                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '16px', marginBottom: '8px' }}>
                  Try asking
                </p>
                <div className="ai-starter-grid">
                  {STARTER_SUGGESTIONS.map(s => (
                    <button
                      key={s.label}
                      className="ai-starter-btn"
                      onClick={() => handleSend(s.q)}
                    >
                      <span>{s.label}</span>
                      <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>

            ) : (
              /* ── Message thread ── */
              <>
                {messages.map(msg => (
                  <div key={msg.id}>
                    {msg.role === 'user' ? (
                      <div className="ai-msg-user">
                        <div className="ai-bubble-user">{msg.content}</div>
                      </div>
                    ) : (
                      <div className="ai-msg-assistant">
                        <div className="ai-assistant-icon">
                          <Sparkles size={16} color="#fff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Answer */}
                          <div className="ai-bubble-assistant">{msg.content}</div>

                          {/* ── Suggested Follow-Up Chips ── */}
                          {msg.followUps && msg.followUps.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                              <p className="ai-followup-label">Suggested questions</p>
                              <div className="ai-followups">
                                {msg.followUps.map(q => (
                                  <button
                                    key={q}
                                    className="ai-followup-btn"
                                    disabled={loading}
                                    onClick={() => handleSend(q)}
                                  >
                                    <ChevronRight size={11} />
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Create-ticket nudge */}
                          {msg.suggestedAction === 'create_ticket' && msg.status !== 'greeting' && (
                            <button className="ai-ticket-btn" onClick={openCreateTicket}>
                              <Ticket size={13} /> Create support ticket
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar (only shown when chat is active) ── */}
          {messages.length > 0 && (
            <div className="ai-input-bar">
              <div className="ai-input-inner">
                <div className="ai-still-need">
                  <span>Still need help?</span>
                  <button type="button" onClick={openCreateTicket}>
                    <Plus size={12} /> Create Support Ticket
                  </button>
                </div>
                <form className="ai-input-form" onSubmit={e => { e.preventDefault(); handleSend() }}>
                  <input
                    className="ai-input-field"
                    placeholder="Ask a follow-up question…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="ai-send-btn"
                    disabled={loading || !input.trim()}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <CreateTicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          onCreated={() => setShowTicketModal(false)}
          initialValues={ticketPrefill}
        />
      </div>
    </>
  )
}
