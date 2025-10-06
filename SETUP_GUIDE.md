# A20 Core - Complete Setup Guide

## ✅ Prerequisites Check

Your system has:
- ✅ Node.js v22.17.0
- ✅ npm v10.9.2
- ❌ PostgreSQL (needs installation)

## 📋 Installation Steps

### Step 1: Install PostgreSQL

#### Windows
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer (recommended version: PostgreSQL 14 or higher)
3. During installation:
   - Remember the password you set for the `postgres` user
   - Default port: 5432 (keep default)
   - Install pgAdmin (GUI tool)

4. Add PostgreSQL to PATH (if not done automatically):
   ```
   Add to System Environment Variables:
   C:\Program Files\PostgreSQL\14\bin
   ```

5. Verify installation:
   ```bash
   psql --version
   ```

#### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Linux
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In PostgreSQL prompt:
CREATE DATABASE a20core_hub;
\q
```

Or use pgAdmin:
1. Open pgAdmin
2. Right-click "Databases"
3. Create > Database
4. Name: `a20core_hub`

### Step 3: Configure Environment

The `.env` file has been created. Update it with your settings:

```bash
# Edit .env file
notepad .env  # Windows
# or
code .env     # VS Code
```

**Required changes**:
```env
DB_PASSWORD=your_postgres_password_here
JWT_SECRET=change_this_to_a_random_secret_key
```

**Optional changes**:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=a20core_hub
DB_USER=postgres
```

### Step 4: Initialize Database Schema

```bash
# Run schema files
psql -U postgres -d a20core_hub -f database/schemas/01_core_tables.sql
psql -U postgres -d a20core_hub -f database/schemas/02_flexible_data_storage.sql
```

Or using pgAdmin:
1. Select `a20core_hub` database
2. Tools > Query Tool
3. Open and execute `01_core_tables.sql`
4. Open and execute `02_flexible_data_storage.sql`

### Step 5: Verify Installation

Check all dependencies are installed:

```bash
# Hub dependencies
cd /c/Code/A20Core
npm install
# ✅ All dependencies installed successfully

# Dashboard dependencies
cd dashboard
npm install
# ✅ Installed with 2 moderate severity vulnerabilities (non-critical, dev dependencies)

# Demo app dependencies
cd ../micro-apps/demo-text-to-hex
npm install
# ✅ All dependencies installed successfully
```

## 🚀 Running the System

### Terminal 1: Start the Hub

```bash
cd /c/Code/A20Core
npm run dev
```

**Expected output**:
```
╔════════════════════════════════════════╗
║        A20 Core Hub Started            ║
╚════════════════════════════════════════╝

🚀 Server running on port 3000
🌐 Environment: development
📊 API Version: v1
🔗 Base URL: http://localhost:3000

✓ Database connected successfully
```

**If you see errors**:
- `Database connection error` → Check PostgreSQL is running and .env settings
- `Port 3000 already in use` → Change PORT in .env
- `Cannot find module` → Run `npm install` again

### Terminal 2: Start the Dashboard

```bash
cd /c/Code/A20Core/dashboard
npm run dev
```

**Expected output**:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

**If you see errors**:
- `Port 3001 already in use` → Change port in vite.config.js
- `Module not found` → Run `npm install` again

### Terminal 3: Start Demo App

```bash
cd /c/Code/A20Core/micro-apps/demo-text-to-hex
npm run dev
```

**Expected output**:
```
╔════════════════════════════════════════╗
║   Demo Text-to-Hex Converter Started   ║
╚════════════════════════════════════════╝

🚀 Server running on port 3002
🔗 Hub URL: http://localhost:3000
🔑 API Key: Not configured
```

## 🧪 Testing the System

### Test 1: Check Hub Health

```bash
curl http://localhost:3000/api/v1/health
```

**Expected**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Test 2: Register Demo App

First, you need to create an admin user or use API key authentication. For testing, we'll create a simple registration:

```bash
# Note: This requires authentication setup
# For now, you'll need to either:
# 1. Temporarily disable auth in routes.js for testing
# 2. Create an admin JWT token
# 3. Use direct database insertion for first app
```

**Quick test registration (without auth)**:

Edit `hub/src/api/routes.js` temporarily:
```javascript
// Change this line:
router.post('/apps/register', authMiddleware.requireAdmin, auditMiddleware.log, async (req, res) => {

// To this (TESTING ONLY):
router.post('/apps/register', async (req, res) => {
```

Then register:
```bash
curl -X POST http://localhost:3000/api/v1/apps/register \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "Text to Hex Converter (Demo)",
    "app_version": "1.0.0",
    "communication_sheet": {
      "app_metadata": {
        "app_id": "demo-text-to-hex",
        "app_name": "Text to Hex Converter (Demo)",
        "version": "1.0.0",
        "communication_sheet_version": "1.0"
      }
    },
    "metadata": {
      "description": "Demo text-to-hex converter"
    }
  }'
```

### Test 3: View Dashboard

1. Open browser: `http://localhost:3001`
2. You should see:
   - Empty state if no apps registered
   - OR list of registered apps

### Test 4: Test Demo App Functionality

```bash
curl -X POST http://localhost:3002/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello World"}'
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "conversion_id": "conv_xxx",
    "input": "Hello World",
    "output": "48656c6c6f20576f726c64",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "length": 11,
    "hex_length": 22
  }
}
```

## 🐛 Common Issues & Solutions

### Issue: "Database connection error"

**Solution**:
1. Check PostgreSQL is running:
   ```bash
   # Windows
   services.msc (look for postgresql service)

   # macOS/Linux
   pg_ctl status
   ```

2. Verify credentials in `.env`:
   ```env
   DB_USER=postgres
   DB_PASSWORD=your_actual_password
   DB_NAME=a20core_hub
   ```

3. Test connection:
   ```bash
   psql -U postgres -d a20core_hub -c "SELECT NOW();"
   ```

### Issue: "Port already in use"

**Solution**:
```bash
# Find what's using the port
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # macOS/Linux

# Change port in .env or vite.config.js
```

### Issue: "Module not found"

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Cannot find module 'ajv'"

**Solution**:
```bash
npm install ajv --save
```

### Issue: "CORS error in browser"

**Solution**: Update `hub/server.js`:
```javascript
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
```

## 📊 System Status Checklist

After setup, verify:

- [ ] PostgreSQL installed and running
- [ ] Database `a20core_hub` created
- [ ] Schema tables created (run SQL files)
- [ ] `.env` configured with correct credentials
- [ ] Hub running on port 3000
- [ ] Dashboard running on port 3001
- [ ] Demo app running on port 3002
- [ ] Hub health check responds: `curl http://localhost:3000/api/v1/health`
- [ ] Dashboard loads in browser: `http://localhost:3001`

## 🎯 Next Steps

Once everything is running:

1. **Register the demo app** (see Test 2 above)
2. **Upload Display Sheet** for demo app
3. **View dashboard** at `http://localhost:3001`
4. **Create your own micro-app** using templates in `docs/standards/`

## 📚 Documentation

- [Getting Started with Dashboard](docs/GETTING_STARTED_DASHBOARD.md)
- [Display Standards](docs/standards/DISPLAY_STANDARDS.md)
- [API Standards](docs/standards/API_STANDARDS.md)
- [System Overview](docs/architecture/SYSTEM_OVERVIEW.md)

## 💡 Quick Commands Reference

```bash
# Start Hub
npm run dev

# Start Dashboard
cd dashboard && npm run dev

# Start Demo App
cd micro-apps/demo-text-to-hex && npm run dev

# Run tests
npm test

# Check health
curl http://localhost:3000/api/v1/health

# View logs
# Check terminal output or logs/ directory
```

## 🆘 Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review terminal output for error messages
3. Check `CLAUDE.md` for architecture details
4. Verify all prerequisites are installed
5. Ensure all dependencies are up to date: `npm install`

## ✨ Success Indicators

You'll know everything is working when:

1. ✅ Hub starts without errors and shows "Database connected successfully"
2. ✅ Dashboard loads and shows "No Apps Connected" (initially)
3. ✅ Demo app starts and shows connection to Hub
4. ✅ You can convert text to hex via API
5. ✅ Dashboard populates with apps after registration
