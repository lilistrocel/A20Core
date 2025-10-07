import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export default function ForcePasswordChange() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.new_password || !formData.confirm_password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await logout(formData.new_password);

    if (result.success) {
      // Redirect to login
      navigate('/login', {
        state: { message: 'Password changed successfully. Please login with your new password.' },
      });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-xl mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Change Your Password</h1>
          <p className="text-gray-600 mt-2">
            You are required to set a new password before continuing.
          </p>
        </div>

        {/* Password Change Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Security Notice:</strong> You're using a temporary password. Please choose a strong,
              unique password that you haven't used elsewhere.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <span
                    className={`mr-2 ${
                      formData.new_password.length >= 6 ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {formData.new_password.length >= 6 ? '✓' : '○'}
                  </span>
                  At least 6 characters
                </li>
                <li className="flex items-center">
                  <span
                    className={`mr-2 ${
                      formData.new_password === formData.confirm_password &&
                      formData.new_password.length > 0
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {formData.new_password === formData.confirm_password &&
                    formData.new_password.length > 0
                      ? '✓'
                      : '○'}
                  </span>
                  Passwords match
                </li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Changing Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Change Password</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          You will be logged out after changing your password.
        </p>
      </div>
    </div>
  );
}
