import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppsStore } from '../store/appsStore';
import EmptyState from '../components/layout/EmptyState';
import { Box, ChevronRight, Activity } from 'lucide-react';

export default function Dashboard() {
  const { apps } = useAppsStore();
  const navigate = useNavigate();

  if (apps.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Connected Applications</h2>
        <p className="text-gray-600 mt-1">
          {apps.length} {apps.length === 1 ? 'application' : 'applications'} registered with the
          Hub
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <div
            key={app.app_id}
            onClick={() => navigate(`/app/${app.app_id}`)}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Box className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{app.app_name}</h3>
                  <p className="text-sm text-gray-500">v{app.app_version}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="mt-4 flex items-center space-x-4 text-sm">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  app.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : app.status === 'suspended'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {app.status}
              </span>
              {app.last_heartbeat && (
                <span className="flex items-center text-gray-500">
                  <Activity className="w-4 h-4 mr-1" />
                  Last seen: {new Date(app.last_heartbeat).toLocaleString()}
                </span>
              )}
            </div>

            {app.metadata?.description && (
              <p className="mt-3 text-sm text-gray-600 line-clamp-2">{app.metadata.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
