#!/usr/bin/env node
/**
 * A20 Core Setup Test Script
 * Validates that all components are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 A20 Core Setup Validation\n');
console.log('=' .repeat(50));

const checks = [];
let passCount = 0;
let failCount = 0;

function check(name, test) {
  try {
    const result = test();
    if (result) {
      console.log(`✅ ${name}`);
      passCount++;
      return true;
    } else {
      console.log(`❌ ${name}`);
      failCount++;
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failCount++;
    return false;
  }
}

console.log('\n📦 Checking Dependencies...\n');

check('Node.js installed', () => {
  return process.version;
});

check('Hub package.json exists', () => {
  return fs.existsSync(path.join(__dirname, 'package.json'));
});

check('Hub node_modules exists', () => {
  return fs.existsSync(path.join(__dirname, 'node_modules'));
});

check('Dashboard directory exists', () => {
  return fs.existsSync(path.join(__dirname, 'dashboard'));
});

check('Dashboard package.json exists', () => {
  return fs.existsSync(path.join(__dirname, 'dashboard', 'package.json'));
});

check('Demo app directory exists', () => {
  return fs.existsSync(path.join(__dirname, 'micro-apps', 'demo-text-to-hex'));
});

console.log('\n📁 Checking File Structure...\n');

check('Database schemas exist', () => {
  return fs.existsSync(path.join(__dirname, 'database', 'schemas', '01_core_tables.sql')) &&
         fs.existsSync(path.join(__dirname, 'database', 'schemas', '02_flexible_data_storage.sql'));
});

check('Hub server.js exists', () => {
  return fs.existsSync(path.join(__dirname, 'hub', 'server.js'));
});

check('Display standards exist', () => {
  return fs.existsSync(path.join(__dirname, 'docs', 'standards', 'display-sheet-schema.json')) &&
         fs.existsSync(path.join(__dirname, 'docs', 'standards', 'display-sheet-template.yaml'));
});

check('Communication standards exist', () => {
  return fs.existsSync(path.join(__dirname, 'docs', 'standards', 'communication-sheet-schema.json')) &&
         fs.existsSync(path.join(__dirname, 'docs', 'standards', 'communication-sheet-template.yaml'));
});

console.log('\n⚙️  Checking Configuration...\n');

check('.env file exists', () => {
  return fs.existsSync(path.join(__dirname, '.env'));
});

check('Demo app .env exists', () => {
  return fs.existsSync(path.join(__dirname, 'micro-apps', 'demo-text-to-hex', '.env'));
});

console.log('\n🧩 Testing Module Imports...\n');

check('Express can be loaded', () => {
  require('express');
  return true;
});

check('PostgreSQL client can be loaded', () => {
  require('pg');
  return true;
});

check('Axios can be loaded', () => {
  require('axios');
  return true;
});

check('AJV can be loaded', () => {
  require('ajv');
  return true;
});

check('CORS can be loaded', () => {
  require('cors');
  return true;
});

console.log('\n📋 Checking Models...\n');

check('AppRegistry model exists', () => {
  const AppRegistry = require('./hub/src/models/AppRegistry');
  return typeof AppRegistry === 'function';
});

check('DataStore model exists', () => {
  const DataStore = require('./hub/src/models/DataStore');
  return typeof DataStore === 'function';
});

check('EventManager model exists', () => {
  const EventManager = require('./hub/src/models/EventManager');
  return typeof EventManager === 'function';
});

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);

if (failCount === 0) {
  console.log('✨ All checks passed! Your setup looks good.\n');
  console.log('Next steps:');
  console.log('  1. Install PostgreSQL if not already installed');
  console.log('  2. Create database: createdb a20core_hub');
  console.log('  3. Run schema files (see SETUP_GUIDE.md)');
  console.log('  4. Update .env with your database credentials');
  console.log('  5. Start the Hub: npm run dev');
  console.log('  6. Start the Dashboard: cd dashboard && npm run dev');
  console.log('  7. Start Demo App: cd micro-apps/demo-text-to-hex && npm run dev\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please review the errors above.\n');
  console.log('Common fixes:');
  console.log('  - Run: npm install');
  console.log('  - Run: cd dashboard && npm install');
  console.log('  - Run: cd micro-apps/demo-text-to-hex && npm install');
  console.log('  - Copy: cp config/.env.example .env');
  console.log('  - See: SETUP_GUIDE.md for detailed instructions\n');
  process.exit(1);
}
