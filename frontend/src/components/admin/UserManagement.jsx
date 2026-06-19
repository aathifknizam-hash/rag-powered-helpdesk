import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, ShieldCheck } from 'lucide-react'
import { Card, CardBody, Button, Badge } from '../common/UIComponents'
import { PageHeader, Modal } from '../common/Layout'
import { userService } from '../../services/userService'
import { normalizeList } from '../../utils/apiHelpers'

const CSS = `
.um-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  background: var(--surface);
}
.um-table th {
  text-align: left;
  padding: 12px 16px;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.um-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}
.um-table tr:hover td {
  background: var(--bg);
}
.um-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
}
.um-menu-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px;
  border-radius: 4px;
}
.um-menu-btn:hover {
  background: var(--border);
  color: var(--text-primary);
}
.um-action-menu {
  position: absolute;
  right: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  min-width: 120px;
}
.um-action-item {
  background: transparent;
  border: none;
  text-align: left;
  padding: 8px 12px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  cursor: pointer;
  width: 100%;
}
.um-action-item:hover {
  background: var(--bg);
  color: var(--text-primary);
}
`

export function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'customer',
    is_active: true,
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleEditClick = (user) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      password: '',
    })
    setError('')
    setShowModal(true)
    setActiveMenuId(null)
  }

  const handleAddClick = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'customer',
      is_active: true,
      password: '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validation for first and last name (letters, spaces, hyphens only)
    const nameRegex = /^[A-Za-z\s\-]+$/
    if (formData.first_name && !nameRegex.test(formData.first_name)) {
      setError('First name cannot contain numbers or special characters')
      return
    }
    if (formData.last_name && !nameRegex.test(formData.last_name)) {
      setError('Last name cannot contain numbers or special characters')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        const updateData = { ...formData }
        if (!updateData.password) {
          delete updateData.password
        }
        await userService.update(editingUser.id, updateData)
      } else {
        if (!formData.password) {
          setError('Password is required for new users')
          setSaving(false)
          return
        }
        await userService.create(formData)
      }
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      console.error('Failed to save user:', err)
      const errorMsg = err.response?.data?.email?.[0] || 
                       err.response?.data?.password?.[0] || 
                       err.response?.data?.detail || 
                       err.response?.data?.error || 
                       'Failed to save user';
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [search, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await userService.list()
      let filtered = normalizeList(response.data)
      
      if (search) {
        filtered = filtered.filter(u =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.first_name.toLowerCase().includes(search.toLowerCase()) ||
          u.last_name.toLowerCase().includes(search.toLowerCase())
        )
      }
      if (roleFilter) {
        filtered = filtered.filter(u => u.role === roleFilter)
      }
      if (statusFilter) {
        const isActiveVal = statusFilter === 'active'
        filtered = filtered.filter(u => u.is_active === isActiveVal)
      }
      
      setUsers(filtered)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId) => {
    if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      try {
        await userService.delete(userId)
        setUsers(users.filter(u => u.id !== userId))
        setActiveMenuId(null)
      } catch (err) {
        console.error('Failed to delete user:', err)
      }
    }
  }

  const roleColors = {
    customer: 'info',
    agent: 'success',
    admin: 'danger',
  }

  const roleLabel = (role) => (role === 'customer' ? 'User' : role)

  return (
    <div className="p-6 bg-slate-50 min-h-full font-sans">
      <style>{CSS}</style>

      {/* 1. Page Title, 2. Description, and 3. Primary Actions */}
      <PageHeader
        title="User Management"
        subtitle="Provision and govern permissions for customer profiles, agents, and administrators"
        action={
          <Button onClick={handleAddClick} className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add User
          </Button>
        }
      />

      {/* 4. Filters & Search */}
      <Card className="mb-4 border-slate-200 bg-white">
        <CardBody className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="customer">User</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* 5. Main Content (Users Table) */}
      <Card className="border-slate-200 bg-white overflow-visible">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
              <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
              <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Filter className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No users found.</p>
              <p className="text-[11px] text-slate-400 mt-1">Add a new user manually or update search parameters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-visible">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="w-10 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` || user.email?.[0] || 'U'
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="um-avatar">{initials.toUpperCase()}</div>
                            <span className="font-semibold text-slate-900">{user.first_name} {user.last_name}</span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <Badge variant={roleColors[user.role]} size="sm" className="capitalize">
                            {roleLabel(user.role)}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={user.is_active ? 'success' : 'danger'} size="sm">
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                        <td className="text-right overflow-visible relative">
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                            className="um-menu-btn"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {activeMenuId === user.id && (
                            <div className="um-action-menu">
                              <button 
                                onClick={() => handleEditClick(user)} 
                                className="um-action-item flex items-center gap-1.5"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                              </button>
                              <button 
                                onClick={() => handleDelete(user.id)} 
                                className="um-action-item text-red-600 hover:text-red-750 flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete User
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* User Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
              <input
                type="text"
                required
                placeholder="John"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
              <input
                type="text"
                required
                placeholder="Doe"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password {editingUser && '(Leave blank to keep current)'}</label>
            <input
              type="password"
              required={!editingUser}
              placeholder="••••••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-none"
              >
                <option value="customer">User</option>
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-none"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
