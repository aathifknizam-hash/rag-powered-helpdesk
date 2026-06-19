/**
 * Notifications Component - Phase 9: Real-time Toast Notifications
 * Displays system and ticket update notifications
 */

import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import './Notifications.css';

export const Notifications = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="notifications-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

const Notification = ({ notification, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <div
      className={`notification notification-${notification.type} ${isExiting ? 'exiting' : ''}`}
    >
      <span className="material-symbols-outlined notification-icon">
        {getIcon()}
      </span>

      <div className="notification-content">
        {notification.title && (
          <h4 className="notification-title">{notification.title}</h4>
        )}
        <p className="notification-message">{notification.message}</p>
      </div>

      <button
        className="notification-close"
        onClick={handleClose}
        aria-label="Close notification"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
};

export default Notifications;
