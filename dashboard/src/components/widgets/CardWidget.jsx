import React from 'react';

export default function CardWidget({ widget, data, theme }) {
  const { title, description, rendering } = widget;
  const { fields = [] } = rendering || {};

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

      <div className="space-y-3">
        {fields.map((field) => {
          const value = data?.[field.field_name];
          return (
            <div key={field.field_name} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{field.label}:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatFieldValue(value, field)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatFieldValue(value, field) {
  if (value === null || value === undefined) return '-';

  switch (field.type) {
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'status':
      return (
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: field.color_map?.[value] || '#E5E7EB',
            color: '#1F2937',
          }}
        >
          {value}
        </span>
      );
    default:
      return value;
  }
}
