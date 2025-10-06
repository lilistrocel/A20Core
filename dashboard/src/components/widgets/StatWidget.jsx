import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatWidget({ widget, data, theme }) {
  const { title, rendering } = widget;
  const { fields = [] } = rendering || {};

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => {
          const value = data?.[field.field_name];
          return (
            <div key={field.field_name} className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{field.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(value, field.format)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatValue(value, format) {
  if (value === null || value === undefined) return '-';

  switch (format) {
    case 'number':
      return new Intl.NumberFormat().format(value);
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(2)}%`;
    default:
      return value;
  }
}
