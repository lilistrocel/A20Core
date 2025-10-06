import React from 'react';
import { Package, Plus } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Apps Connected</h2>
      <p className="text-gray-600 mb-8 max-w-md">
        Get started by connecting your first micro-app to the Hub. Once connected, it will
        appear here with its custom dashboard.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl text-left">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Quick Start Guide:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Create a Communication Sheet for your micro-app</li>
          <li>Register your app with the Hub via POST /api/v1/apps/register</li>
          <li>Create a Display Sheet to define the UI</li>
          <li>Upload the Display Sheet via POST /api/v1/apps/{'{appId}'}/display-sheet</li>
          <li>Refresh this page to see your app's dashboard</li>
        </ol>
      </div>
    </div>
  );
}
