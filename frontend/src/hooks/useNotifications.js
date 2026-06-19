/**
 * useNotifications Hook - Phase 9: Notification Management
 * Global notification state management for toast notifications
 */

import { useState, useCallback, useRef } from 'react';

// Global notification store
let notificationStore = {
  notifications: [],
  listeners: [],
};

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);

  // Subscribe to notification changes
  const subscribe = useCallback(() => {
    const listener = (updatedNotifications) => {
      setNotifications(updatedNotifications);
    };

    notificationStore.listeners.push(listener);

    return () => {
      notificationStore.listeners = notificationStore.listeners.filter(
        (l) => l !== listener
      );
    };
  }, []);

  // Add notification
  const addNotification = useCallback(
    ({ title, message, type = 'info', duration = 5000 }) => {
      const id = ++notificationIdRef.current;
      const notification = {
        id,
        title,
        message,
        type,
      };

      notificationStore.notifications = [
        ...notificationStore.notifications,
        notification,
      ];

      // Notify all listeners
      notificationStore.listeners.forEach((listener) => {
        listener(notificationStore.notifications);
      });

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    []
  );

  // Remove notification
  const removeNotification = useCallback((id) => {
    notificationStore.notifications = notificationStore.notifications.filter(
      (n) => n.id !== id
    );

    // Notify all listeners
    notificationStore.listeners.forEach((listener) => {
      listener(notificationStore.notifications);
    });
  }, []);

  // Notification shortcuts
  const notify = useCallback(
    (message, type = 'info', title = '') => {
      return addNotification({ title, message, type });
    },
    [addNotification]
  );

  const success = useCallback(
    (message, title = 'Success') => {
      return addNotification({ title, message, type: 'success' });
    },
    [addNotification]
  );

  const error = useCallback(
    (message, title = 'Error') => {
      return addNotification({ title, message, type: 'error' });
    },
    [addNotification]
  );

  const warning = useCallback(
    (message, title = 'Warning') => {
      return addNotification({ title, message, type: 'warning' });
    },
    [addNotification]
  );

  const info = useCallback(
    (message, title = 'Info') => {
      return addNotification({ title, message, type: 'info' });
    },
    [addNotification]
  );

  // Initialize subscription
  const unsubscribe = subscribe();

  return {
    notifications,
    addNotification,
    removeNotification,
    notify,
    success,
    error,
    warning,
    info,
  };
}

// Global notification service for use outside of React components
export const NotificationService = {
  notify: (message, type = 'info', title = '') => {
    const id = Date.now();
    const notification = { id, title, message, type };

    notificationStore.notifications = [
      ...notificationStore.notifications,
      notification,
    ];

    notificationStore.listeners.forEach((listener) => {
      listener(notificationStore.notifications);
    });

    return id;
  },

  success: (message, title = 'Success') => {
    return NotificationService.notify(message, 'success', title);
  },

  error: (message, title = 'Error') => {
    return NotificationService.notify(message, 'error', title);
  },

  warning: (message, title = 'Warning') => {
    return NotificationService.notify(message, 'warning', title);
  },

  info: (message, title = 'Info') => {
    return NotificationService.notify(message, 'info', title);
  },

  remove: (id) => {
    notificationStore.notifications = notificationStore.notifications.filter(
      (n) => n.id !== id
    );

    notificationStore.listeners.forEach((listener) => {
      listener(notificationStore.notifications);
    });
  },

  clear: () => {
    notificationStore.notifications = [];

    notificationStore.listeners.forEach((listener) => {
      listener(notificationStore.notifications);
    });
  },
};
