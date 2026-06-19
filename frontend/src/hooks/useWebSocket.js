/**
 * useWebSocket Hook - Phase 9: WebSocket Connection Management
 * Manages WebSocket connections for real-time communication
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket({
  ticketId,
  onMessageReceived,
  onTypingIndicator,
  onMessageSent,
  onError,
  onConnect,
  onDisconnect,
}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayRef = useRef(1000);

  // Get WebSocket URL based on current location
  const getWebSocketURL = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/tickets/${ticketId}/chat/`;
  }, [ticketId]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      const wsURL = getWebSocketURL();
      // Cookies are sent automatically for same-origin WebSocket connections.
      const socket = new WebSocket(wsURL);

      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttemptRef.current = 0;
        reconnectDelayRef.current = 1000;
        onConnect?.();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'chat_message') {
            onMessageReceived?.(data);
          } else if (data.type === 'typing_indicator') {
            onTypingIndicator?.(data);
          } else if (data.type === 'message_sent') {
            onMessageSent?.(data);
          } else if (data.type === 'messages_read') {
            // Handle read receipts
            console.log('Messages read:', data.message_ids);
          } else if (data.type === 'error') {
            onError?.(data.message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.('Connection error');
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        onDisconnect?.();

        // Attempt to reconnect
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current += 1;
          console.log(
            `Reconnecting... (Attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})`
          );

          setTimeout(() => {
            connect();
          }, reconnectDelayRef.current);

          // Exponential backoff
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            10000
          );
        } else {
          onError?.(
            'Connection lost. Please refresh the page to reconnect.'
          );
        }
      };

      socketRef.current = socket;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      onError?.('Failed to connect');
    }
  }, [getWebSocketURL, onMessageReceived, onTypingIndicator, onMessageSent, onError, onConnect, onDisconnect]);

  // Send message
  const sendMessage = useCallback((message) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      onError?.('Connection is not open');
      return;
    }

    try {
      socketRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Error sending message:', err);
      onError?.('Failed to send message');
    }
  }, [onError]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping) => {
    sendMessage({
      type: 'typing',
      is_typing: isTyping,
    });
  }, [sendMessage]);

  // Mark messages as read
  const markMessagesRead = useCallback((messageIds) => {
    sendMessage({
      type: 'mark_read',
      message_ids: messageIds,
    });
  }, [sendMessage]);

  // Keep connection alive with ping
  useEffect(() => {
    if (!connected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [connected, sendMessage]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    connected,
    sendMessage,
    sendTyping,
    markMessagesRead,
  };
}
