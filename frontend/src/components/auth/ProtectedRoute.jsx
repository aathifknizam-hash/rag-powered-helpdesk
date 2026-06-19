import React from 'react'
import { Navigate } from 'react-router-dom'
import { Loading } from '../common/UIComponents'

export function ProtectedRoute({ children, user, loading }) {
  if (loading) {
    return <Loading text="Loading..." fullscreen />
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return children
}

export function RoleBasedRoute({ children, user, loading, allowedRoles = [] }) {
  if (loading) {
    return <Loading text="Loading..." fullscreen />
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />
  }

  return children
}
