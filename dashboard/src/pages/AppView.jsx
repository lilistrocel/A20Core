import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppsStore } from '../store/appsStore';
import WidgetRenderer from '../components/widgets/WidgetRenderer';
import { AlertCircle } from 'lucide-react';

export default function AppView() {
  const { appId } = useParams();
  const { getAppById, getDisplaySheet, loadDisplaySheet } = useAppsStore();
  const [loading, setLoading] = useState(true);

  const app = getAppById(appId);
  const displaySheet = getDisplaySheet(appId);

  useEffect(() => {
    if (appId && !displaySheet) {
      loadDisplaySheet(appId).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [appId, displaySheet, loadDisplaySheet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900">App Not Found</h2>
        <p className="text-gray-600 mt-2">The requested application does not exist.</p>
      </div>
    );
  }

  if (!displaySheet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900">No Display Configuration</h2>
        <p className="text-gray-600 mt-2">
          This app hasn't defined a display sheet yet. Upload a Display Sheet to see the dashboard.
        </p>
      </div>
    );
  }

  const { display_config } = displaySheet;
  const { theme, widgets = [], actions = [] } = display_config;

  return (
    <div className="space-y-6">
      {/* App Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: theme?.primary_color || '#3B82F6' }}
          >
            <span className="text-white text-2xl font-bold">
              {app.app_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{app.app_name}</h1>
            <p className="text-gray-600">v{app.app_version}</p>
          </div>
        </div>

        {/* Global Actions */}
        {actions.length > 0 && (
          <div className="flex space-x-2">
            {actions.map((action) => (
              <button
                key={action.action_id}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  action.style === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-12 gap-6">
        {widgets.map((widget) => (
          <div
            key={widget.widget_id}
            className={`col-span-${widget.size?.columns || 12}`}
            style={{
              gridColumn: `span ${widget.size?.columns || 12}`,
            }}
          >
            <WidgetRenderer widget={widget} appId={appId} theme={theme} />
          </div>
        ))}
      </div>
    </div>
  );
}
