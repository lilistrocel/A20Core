import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Clock, XCircle } from 'lucide-react';

function Limbo() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('pending'); // 'pending' or 'suspended'
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    // Get status from location state or user metadata
    if (location.state?.status) {
      setStatus(location.state.status);
    } else if (user?.membership_status) {
      setStatus(user.membership_status);
    }
    
    // Get organization name from state
    if (location.state?.organizationName) {
      setOrganizationName(location.state.organizationName);
    }
  }, [user, location.state]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatusConfig = () => {
    if (status === 'suspended') {
      return {
        icon: XCircle,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: 'Account Suspended',
        message: 'Your account has been suspended by an administrator.',
        details: 'If you believe this is an error, please contact your organization administrator for assistance.',
      };
    }
    
    // Default to pending
    return {
      icon: Clock,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      title: 'Approval Pending',
      message: 'Your membership request is awaiting approval.',
      details: 'An administrator will review your request shortly. You will receive access once approved.',
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">A64 Core</h1>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            <div className={`rounded-full p-3 ${config.bgColor}`}>
              <Icon className={`w-12 h-12 ${config.iconColor}`} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-4">
            {config.title}
          </h2>

          {/* Status Message */}
          <div className={`rounded-md border ${config.borderColor} ${config.bgColor} p-4 mb-6`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className={`h-5 w-5 ${config.iconColor}`} />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">
                  {config.message}
                </h3>
                <div className="mt-2 text-sm text-gray-700">
                  <p>{config.details}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-gray-50 rounded-md p-4 mb-6">
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Username</dt>
                  <dd className="text-sm text-gray-900">{user.username}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{user.email}</dd>
                </div>
                {user.organization_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Organization</dt>
                    <dd className="text-sm text-gray-900">{user.organization_name}</dd>
                  </div>
                )}
                {organizationName && !user.organization_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Organization</dt>
                    <dd className="text-sm text-gray-900">{organizationName}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Logout Button */}
          <div>
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Logout
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact your administrator at{' '}
              <a href="mailto:support@a64core.com" className="text-blue-600 hover:text-blue-500">
                support@a64core.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Limbo;

