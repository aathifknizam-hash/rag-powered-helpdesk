import React, { useState } from 'react'
import { AlertCircle, Mail, Lock } from 'lucide-react'
import { Button, Input, Alert } from '../common/UIComponents'

export function LoginPage({ onLogin, loading: isLoading, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      const result = await onLogin(email, password)
      if (!result?.success) {
        setErrors({ submit: result?.error || 'Login failed' })
      }
    } catch (err) {
      setErrors({ submit: err?.message || 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-md my-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center text-white">
            <div className="inline-block w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Smart Service Desk</h1>
            <p className="text-blue-100">Enterprise Support Platform</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            {error && (
              <Alert variant="danger" title="Login Failed" message={error} className="mb-6" />
            )}
            {errors.submit && !error && (
              <Alert variant="danger" title="Login Failed" message={errors.submit} className="mb-6" />
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                required
              />

              <Button
                type="submit"
                disabled={loading || isLoading}
                loading={loading || isLoading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>Secure enterprise support platform built for modern teams</p>
          </div>
        </div>
      </div>
    </div>
  )
}
