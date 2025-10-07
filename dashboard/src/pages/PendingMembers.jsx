import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';
import { AlertCircle, CheckCircle, UserCheck, UserX, Loader2, Users } from 'lucide-react';

export default function PendingMembers() {
  const { organization, isOrgAdmin } = useAuth();
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isOrgAdmin) {
      setError('You must be an organization admin to view this page');
      setLoading(false);
      return;
    }
    loadPendingMembers();
  }, [isOrgAdmin]);

  const loadPendingMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/organization/pending-members');
      setPendingMembers(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load pending members');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (membershipId) => {
    try {
      setProcessing(membershipId);
      setError('');
      setSuccessMessage('');

      await apiClient.post(`/organization/approve-member/${membershipId}`);

      setSuccessMessage('Member approved successfully');
      // Remove from list
      setPendingMembers(pendingMembers.filter((m) => m.membership_id !== membershipId));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve member');
    } finally {
      setProcessing(null);
    }
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
            You must be an organization admin or owner to view pending members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Pending Members</h1>
        </div>
        <p className="text-gray-600">
          Approve or reject membership requests for{' '}
          <span className="font-semibold">{organization?.display_name || 'your organization'}</span>
        </p>
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

      {/* Pending Members List */}
      {pendingMembers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Members</h3>
          <p className="text-gray-600">All membership requests have been processed.</p>
        </div>
      ) : (
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
                  Requested
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingMembers.map((member) => (
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
                    <div className="text-sm text-gray-500">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleApprove(member.membership_id)}
                      disabled={processing === member.membership_id}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === member.membership_id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Approve
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
