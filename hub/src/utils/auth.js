/**
 * Authentication Utilities
 * Handles password hashing, JWT tokens, and license key validation
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Generate a license key for micro-app
 * @param {string} appId - Application ID
 * @param {string} orgId - Organization ID
 * @returns {string} License key
 */
function generateLicenseKey(appId, orgId) {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  const data = `${appId}-${orgId}-${timestamp}-${random}`;
  return `lic_${Buffer.from(data).toString('base64url')}`;
}

/**
 * Hash license key for storage
 * @param {string} licenseKey - Plain license key
 * @returns {string} SHA-256 hash
 */
function hashLicenseKey(licenseKey) {
  return crypto.createHash('sha256').update(licenseKey).digest('hex');
}

/**
 * Verify license key against hash
 * @param {string} licenseKey - Plain license key
 * @param {string} hash - Stored hash
 * @returns {boolean} True if license key matches
 */
function verifyLicenseKey(licenseKey, hash) {
  const computedHash = hashLicenseKey(licenseKey);
  return computedHash === hash;
}

/**
 * Get license key prefix for display (first 12 chars)
 * @param {string} licenseKey - Full license key
 * @returns {string} License key prefix
 */
function getLicenseKeyPrefix(licenseKey) {
  return licenseKey.substring(0, 12) + '...';
}

/**
 * Hash token for session storage
 * @param {string} token - JWT token
 * @returns {string} SHA-256 hash
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate organization name format
 * Organization names must be lowercase alphanumeric with hyphens/underscores
 * @param {string} orgName - Organization name
 * @returns {boolean} True if valid format
 */
function isValidOrgName(orgName) {
  const orgNameRegex = /^[a-z0-9][a-z0-9_-]{2,49}$/;
  return orgNameRegex.test(orgName);
}

/**
 * Normalize organization name (lowercase, replace spaces with hyphens)
 * @param {string} orgName - Organization name
 * @returns {string} Normalized organization name
 */
function normalizeOrgName(orgName) {
  return orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateLicenseKey,
  hashLicenseKey,
  verifyLicenseKey,
  getLicenseKeyPrefix,
  hashToken,
  isValidEmail,
  isValidOrgName,
  normalizeOrgName,
};
