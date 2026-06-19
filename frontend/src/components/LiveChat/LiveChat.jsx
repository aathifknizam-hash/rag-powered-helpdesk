/**
 * LiveChat Component - Phase 9: Real-time Chat & WebSocket
 * Handles real-time ticket communication with typing indicators and read status
 */

import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import './LiveChat.css';

export const LiveChat = ({ ticketId, onlineUsers = [] }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { 
    connected, 
    sendMessage, 
    sendTyping, 
    markMessagesRead 
  } = useWebSocket({
    ticketId,
    onMessageReceived: handleMessageReceived,
    onTypingIndicator: handleTypingIndicator,
    onMessageSent: handleMessageSent,
    onError: handleError,
  });

  useEffect(() => {
    setLoading(!connected);
  }, [connected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ==================== Message Handlers ====================

  function handleMessageReceived(message) {
    setMessages(prev => [...prev, message]);
    
    // Mark message as read if from another user
    if (message.sender_id !== getCurrentUserId()) {
      markMessagesRead([message.message_id]);
    }
  }

  function handleTypingIndicator(data) {
    if (data.is_typing) {
      setTypingUsers(prev => ({
        ...prev,
        [data.user_id]: data.user_name
      }));
    } else {
      setTypingUsers(prev => {
        const updated = { ...prev };
        delete updated[data.user_id];
        return updated;
      });
    }
  }

  function handleMessageSent(data) {
    // Confirm message was sent
    setMessageInput('');
  }

  function handleError(errorMessage) {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  }

  // ==================== Input Handlers ====================

  function handleSendMessage(e) {
    e.preventDefault();
    if (!messageInput.trim() || !connected) return;

    sendMessage({
      type: 'chat_message',
      message: messageInput,
      is_internal: isInternalNote,
    });

    setIsInternalNote(false);
    sendTyping(false); // Stop typing indicator
  }

  function handleInputChange(e) {
    const value = e.target.value;
    setMessageInput(value);

    // Send typing indicator
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      sendTyping(true);
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        sendTyping(false);
      }
    }, 3000);
  }

  function handleKeyDown(e) {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }

  // ==================== Utility Functions ====================

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function getCurrentUserId() {
    // Get from localStorage or context
    return localStorage.getItem('user_id') || 'unknown';
  }

  function formatTime(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  }

  function getTypingText() {
    if (Object.keys(typingUsers).length === 0) return '';
    
    const names = Object.values(typingUsers);
    if (names.length === 1) {
      return `${names[0]} is typing...`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    } else {
      return `${names.length} users are typing...`;
    }
  }

  // ==================== Render ====================

  if (loading) {
    return (
      <div className="live-chat loading">
        <div className="live-chat-spinner"></div>
        <p>Connecting...</p>
      </div>
    );
  }

  return (
    <div className="live-chat-container">
      {/* Header */}
      <div className="live-chat-header">
        <div className="live-chat-title">
          <h3>Live Chat</h3>
          <span className={`live-chat-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● Connected' : '● Offline'}
          </span>
        </div>
        {onlineUsers.length > 0 && (
          <div className="live-chat-online-users">
            <span className="material-symbols-outlined">people</span>
            {onlineUsers.length} online
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="live-chat-error">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {/* Messages Area */}
      <div className="live-chat-messages">
        {messages.length === 0 ? (
          <div className="live-chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`live-chat-message ${
                msg.sender_id === getCurrentUserId() ? 'sent' : 'received'
              } ${msg.is_internal ? 'internal' : ''}`}
            >
              <div className="live-chat-message-avatar">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
              <div className="live-chat-message-content">
                <div className="live-chat-message-header">
                  <span className="live-chat-sender">{msg.sender_name}</span>
                  {msg.is_internal && (
                    <span className="live-chat-internal-badge">Internal</span>
                  )}
                  <span className="live-chat-time">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="live-chat-message-text">{msg.content}</p>
                {msg.is_read && msg.sender_id === getCurrentUserId() && (
                  <span className="live-chat-read-receipt">✓ Read</span>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {getTypingText() && (
          <div className="live-chat-typing">
            <span className="material-symbols-outlined">edit</span>
            <p>{getTypingText()}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="live-chat-input-form">
        <textarea
          className="live-chat-textarea"
          placeholder="Type your message... (Shift+Enter for new line)"
          value={messageInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={!connected}
          rows="3"
        ></textarea>

        <div className="live-chat-footer">
          <label className="live-chat-internal-checkbox">
            <input
              type="checkbox"
              checked={isInternalNote}
              onChange={(e) => setIsInternalNote(e.target.checked)}
              disabled={!connected}
            />
            <span>Internal Note</span>
          </label>
          <button
            type="submit"
            className="live-chat-send-button"
            disabled={!connected || !messageInput.trim()}
          >
            <span className="material-symbols-outlined">send</span>
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
