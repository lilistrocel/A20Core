import React, { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import CardWidget from './CardWidget';
import TableWidget from './TableWidget';
import StatWidget from './StatWidget';
import CustomWidget from './CustomWidget';
import { AlertCircle } from 'lucide-react';

export default function WidgetRenderer({ widget, appId, theme }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWidgetData();

    // Auto-refresh if configured
    if (widget.refresh_interval) {
      const interval = setInterval(loadWidgetData, widget.refresh_interval * 1000);
      return () => clearInterval(interval);
    }
  }, [widget]);

  const loadWidgetData = async () => {
    if (widget.data_source.type === 'static') {
      setData(widget.data_source.data);
      setLoading(false);
      return;
    }

    if (widget.data_source.type === 'api') {
      try {
        setLoading(true);
        const endpoint = widget.data_source.endpoint.replace('{appId}', appId);
        const response = await apiClient({
          method: widget.data_source.method || 'GET',
          url: endpoint,
          params: widget.data_source.filters,
        });

        setData(response.data.data || response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">Error loading widget: {error}</p>
        </div>
      </div>
    );
  }

  // Render appropriate widget type
  const widgetProps = { widget, data, theme, appId };

  switch (widget.widget_type) {
    case 'stat':
      return <StatWidget {...widgetProps} />;
    case 'card':
      return <CardWidget {...widgetProps} />;
    case 'table':
      return <TableWidget {...widgetProps} />;
    case 'custom':
      return <CustomWidget {...widgetProps} />;
    default:
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500">Unsupported widget type: {widget.widget_type}</p>
        </div>
      );
  }
}
