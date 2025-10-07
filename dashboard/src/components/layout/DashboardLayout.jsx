import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Box, Settings, LogOut, User, Building2, Users } from 'lucide-react';
import { useAppsStore } from '../../store/appsStore';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { apps } = useAppsStore();
  const { user, organization, isOrgAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A20</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">A20 Core</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <Link
            to="/"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>

          {apps.length > 0 && (
            <div className="pt-4">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Connected Apps
              </h3>
              <div className="mt-2 space-y-1">
                {apps.map((app) => (
                  <Link
                    key={app.app_id}
                    to={`/app/${app.app_id}`}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                  >
                    <Box className="w-5 h-5" />
                    <span>{app.app_name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 mt-4">
            {isOrgAdmin && (
              <>
                <Link
                  to="/user-management"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                >
                  <Users className="w-5 h-5" />
                  <span>User Management</span>
                </Link>
                <Link
                  to="/pending-members"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                >
                  <Users className="w-5 h-5" />
                  <span>Pending Members</span>
                </Link>
              </>
            )}
            <Link
              to="/settings"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </div>
        </nav>

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="mb-2">
            <div className="flex items-center space-x-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 font-medium truncate">
                {organization?.display_name || 'No Organization'}
              </span>
            </div>
            {organization?.role && (
              <span className="ml-6 text-xs text-gray-500 capitalize">
                {organization.role}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm min-w-0 flex-1">
              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-700 truncate">{user?.full_name || user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-2 rounded-lg hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex-shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-200 ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
