import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CustomWidget({ widget, data, theme, appId }) {
  const { title, description, rendering } = widget;

  // Handle form-type custom widgets
  if (rendering?.type === 'form') {
    return <FormWidget widget={widget} theme={theme} appId={appId} />;
  }

  // Fallback to basic custom widget
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
      <div className="text-gray-600">
        <p>Custom widget rendering not implemented for this type.</p>
      </div>
    </div>
  );
}

function FormWidget({ widget, theme, appId }) {
  const { title, description, rendering } = widget;
  const {
    fields = [],
    submit_endpoint,
    submit_method = 'POST',
    submit_label = 'Submit',
    show_result = false
  } = rendering;

  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = submit_endpoint.replace('{appId}', appId);
      const response = await apiClient({
        method: submit_method,
        url: endpoint,
        data: formData,
      });

      if (show_result) {
        setResult(response.data.data || response.data);
      }

      // Clear form after successful submission
      setFormData({});

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setResult(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.field_name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.field_name] || ''}
                onChange={(e) => handleChange(field.field_name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <input
                type={field.type || 'text'}
                value={formData[field.field_name] || ''}
                onChange={(e) => handleChange(field.field_name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: theme?.primary_color || '#3B82F6' }}
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Processing...
            </span>
          ) : (
            submit_label
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-800">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="font-medium text-green-800">Conversion Complete!</p>
          </div>
          <div className="bg-white rounded border border-green-200 p-3 mt-2 space-y-2">
            {result.input && (
              <div>
                <span className="text-sm font-medium text-gray-600">Input: </span>
                <span className="text-sm text-gray-800">{result.input}</span>
              </div>
            )}
            {result.output && (
              <div>
                <span className="text-sm font-medium text-gray-600">Hex Output: </span>
                <code className="text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded font-mono">
                  {result.output}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
