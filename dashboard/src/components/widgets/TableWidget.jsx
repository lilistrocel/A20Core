import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function TableWidget({ widget, data, theme }) {
  const { title, rendering } = widget;
  const { fields = [], table_config = {} } = rendering || {};
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const rows = Array.isArray(data) ? data : [];

  const handleSort = (fieldName) => {
    if (!table_config.sortable) return;

    if (sortField === fieldName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldName);
      setSortDirection('asc');
    }
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((value, key) => value?.[key], obj);
  };

  const sortedRows = React.useMemo(() => {
    if (!sortField) return rows;

    return [...rows].sort((a, b) => {
      const aVal = getNestedValue(a, sortField);
      const bVal = getNestedValue(b, sortField);

      if (aVal === bVal) return 0;
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [rows, sortField, sortDirection]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {fields.map((field) => (
                <th
                  key={field.field_name}
                  onClick={() => handleSort(field.field_name)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    table_config.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{field.label}</span>
                    {table_config.sortable && sortField === field.field_name && (
                      <span>
                        {sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {fields.map((field) => {
                  const value = getNestedValue(row, field.field_name);
                  return (
                    <td key={field.field_name} className="px-6 py-4 whitespace-nowrap text-sm">
                      {renderCell(value, field)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedRows.length === 0 && (
        <div className="text-center py-8 text-gray-500">No data available</div>
      )}
    </div>
  );
}

function renderCell(value, field) {
  if (value === null || value === undefined) return '-';

  switch (field.type) {
    case 'date':
      return new Date(value).toLocaleDateString();
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
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'link':
      return (
        <a href={value} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
          Link
        </a>
      );
    default:
      return <span className="text-gray-900">{value}</span>;
  }
}
