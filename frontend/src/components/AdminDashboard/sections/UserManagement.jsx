/**
 * UserManagement Component - Admin User Management
 */

import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/adminApi';
import '../AdminDashboard.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.listUsers();
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const handleLockUser = async (userId) => {
    try {
      await adminAPI.lockUser(userId);
      fetchUsers();
    } catch (err) {
      setError('Failed to lock user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = !filterRole || user.role === filterRole;
    return matchSearch && matchRole;
  });

  if (loading) {
    return <div className="admin-loading"><div className="admin-spinner"></div>Loading users...</div>;
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>User Management</h2>
        <button className="admin-action-button" onClick={() => setShowCreateModal(true)}>
          <span className="material-symbols-outlined">person_add</span>
          Create User
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-filters">
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search users by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="admin-filter-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.first_name} {user.last_name}</td>
                <td><span className="role-badge">{user.role}</span></td>
                <td><span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span></td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="admin-table-button" onClick={() => setSelectedUser(user)}>
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button className="admin-table-button danger" onClick={() => handleLockUser(user.id)}>
                    <span className="material-symbols-outlined">lock</span>
                  </button>
                  <button className="admin-table-button danger" onClick={() => handleDeleteUser(user.id)}>
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="admin-table-info">{filteredUsers.length} of {users.length} users</p>
    </div>
  );
};

export default UserManagement;
