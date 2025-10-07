import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';
import {
  AlertCircle,
  CheckCircle,
  UserPlus,
  UserX,
  Loader2,
  Users,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Trash2,
} from 'lucide-react';

export default function UserManagement() {
  const { organization, isOrgAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [processing, setProcessing] = useState(null);

  // Create user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    username: '',
    email: '',
    full_name: '',
  });
  const [createdUser, setCreatedUser] = useState(null);
  const [showTempPassword, setShowTempPassword] = useState(false);

  useEffect(() => {
    if (!isOrgAdmin) {
      setError('You must be an organization admin to view this page');
      setLoading(false);
      return;
    }
    loadMembers();
  }, [isOrgAdmin]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/organization/members');
      setMembers(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (membershipId, username) => {
    if (!confirm(`Are you sure you want to revoke access for ${username}?`)) {
      return;
    }

    try {
      setProcessing(membershipId);
      setError('');
      setSuccessMessage('');

      await apiClient.post(`/organization/revoke-member/${membershipId}`);

      setSuccessMessage('Member access revoked successfully');
      // Reload members list
      await loadMembers();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke member');
    } finally {
      setProcessing(null);
    }
  };

  const handleReactivate = async (membershipId, username) => {
    if (!confirm(`Are you sure you want to reactivate access for ${username}?`)) {
      return;
    }

    try {
      setProcessing(membershipId);
      setError('');
      setSuccessMessage('');

      await apiClient.post(`/organization/reactivate-member/${membershipId}`);

      setSuccessMessage('Member access reactivated successfully');
      // Reload members list
      await loadMembers();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reactivate member');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (membershipId, username) => {
    if (!confirm(
      `⚠️ PERMANENT ACTION ⚠️\n\n` +
      `Are you sure you want to permanently delete ${username}?\n\n` +
      `This will:\n` +
      `• Delete the user account\n` +
      `• Remove all sessions\n` +
      `• Free up the username and email for reuse\n\n` +
      `This action CANNOT be undone!`
    )) {
      return;
    }

    try {
      setProcessing(membershipId);
      setError('');
      setSuccessMessage('');

      const response = await apiClient.delete(`/organization/delete-member/${membershipId}`);

      setSuccessMessage(response.data.message || `${username} has been permanently deleted`);
      // Reload members list
      await loadMembers();

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete member');
    } finally {
      setProcessing(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setProcessing('create');
      setError('');
      setSuccessMessage('');

      const response = await apiClient.post('/organization/create-user', createFormData);

      setCreatedUser(response.data.data);
      setSuccessMessage('User created successfully');
      setCreateFormData({ username: '', email: '', full_name: '' });

      // Reload members list
      await loadMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setProcessing(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const closeCreateModal = () => {
    setShowCreateForm(false);
    setCreatedUser(null);
    setCreateFormData({ username: '', email: '', full_name: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isOrgAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">
            You must be an organization admin or owner to manage users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          </div>
          <p className="text-gray-600">
            Manage members of{' '}
            <span className="font-semibold">{organization?.display_name || 'your organization'}</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Create User
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.membership_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {member.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{member.full_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">@{member.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {member.role === 'owner' && <Shield className="w-4 h-4 text-yellow-500 mr-1" />}
                    {member.role === 'admin' && <Shield className="w-4 h-4 text-blue-500 mr-1" />}
                    <span className="text-sm text-gray-900 capitalize">{member.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {member.role !== 'owner' && member.status === 'active' && (
                      <button
                        onClick={() => handleRevoke(member.membership_id, member.username)}
                        disabled={processing === member.membership_id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === member.membership_id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Revoking...
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4 mr-2" />
                            Revoke
                          </>
                        )}
                      </button>
                    )}
                    {member.role !== 'owner' && member.status === 'suspended' && (
                      <>
                        <button
                          onClick={() => handleReactivate(member.membership_id, member.username)}
                          disabled={processing === member.membership_id}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === member.membership_id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Reactivating...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Reactivate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(member.membership_id, member.username)}
                          disabled={processing === member.membership_id}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Permanently delete this user and free up their username/email"
                        >
                          {processing === member.membership_id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
            </div>

            {createdUser ? (
              // Show created user with temp password
              <div className="px-6 py-4">
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                  <p className="text-green-800 text-sm font-medium mb-2">User created successfully!</p>
                  <p className="text-green-700 text-sm">
                    Share the temporary password with the user. They will be required to change it on first
                    login.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={createdUser.user.username}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                      <button
                        onClick={() => copyToClipboard(createdUser.user.username)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temporary Password
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type={showTempPassword ? 'text' : 'password'}
                        value={createdUser.temporary_password}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono"
                      />
                      <button
                        onClick={() => setShowTempPassword(!showTempPassword)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                      >
                        {showTempPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(createdUser.temporary_password)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={closeCreateModal}
                    className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              // Show create user form
              <form onSubmit={handleCreateUser} className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={createFormData.username}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, username: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={createFormData.email}
                      onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={createFormData.full_name}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, full_name: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing === 'create'}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processing === 'create' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
