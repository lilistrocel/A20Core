# Getting Started with the A20 Core Dashboard

## Overview

The A20 Core Dashboard is a **dynamic, modular frontend** that automatically adapts to display micro-apps as they register with the Hub. It starts empty and populates with custom UI components defined by each micro-app's Display Sheet.

## Quick Start

### 1. Start the Hub

```bash
cd A20Core

# Install Hub dependencies
npm install

# Configure environment
cp config/.env.example .env
# Edit .env with database credentials

# Initialize database
createdb a20core_hub
psql -d a20core_hub -f database/schemas/01_core_tables.sql
psql -d a20core_hub -f database/schemas/02_flexible_data_storage.sql

# Start Hub
npm run dev
```

Hub will be running at `http://localhost:3000`

### 2. Start the Dashboard

```bash
cd dashboard

# Install dependencies
npm install

# Start dashboard
npm run dev
```

Dashboard will be running at `http://localhost:3001`

### 3. Try the Demo App

```bash
cd micro-apps/demo-text-to-hex

# Install dependencies
npm install

# Configure
cp .env.example .env
# Add HUB_URL=http://localhost:3000

# Start demo app
npm run dev
```

Demo app will be running at `http://localhost:3002`

### 4. Register the Demo App

```bash
# Register Communication Sheet
curl -X POST http://localhost:3000/api/v1/apps/register \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "Text to Hex Converter (Demo)",
    "app_version": "1.0.0",
    "communication_sheet": '$(cat micro-apps/demo-text-to-hex/communication-sheet.yaml | yq -o json)'
  }'

# Save the API key from the response
# Add it to micro-apps/demo-text-to-hex/.env

# Upload Display Sheet
curl -X POST http://localhost:3000/api/v1/apps/demo-text-to-hex/display-sheet \
  -H "Content-Type: application/json" \
  -d @micro-apps/demo-text-to-hex/display-sheet.yaml
```

### 5. View the Dashboard

Open `http://localhost:3001` in your browser. You should see:
- The demo app listed on the homepage
- Click it to see the dynamic dashboard with:
  - Statistics widget
  - Text-to-hex converter widget
  - Conversion history table

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Browser (Dashboard)                 │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Dynamic Widget Rendering System         │  │
│  │  - Reads Display Sheets from Hub         │  │
│  │  - Renders widgets based on type         │  │
│  │  - Fetches data from endpoints           │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↕ HTTP/REST
┌─────────────────────────────────────────────────┐
│                    Hub API                       │
│                                                  │
│  - App Registry                                  │
│  - Display Sheet Storage                         │
│  - Data Aggregation                              │
│  - Event Routing                                 │
└─────────────────────────────────────────────────┘
                      ↕ HTTP/REST
┌─────────────────────────────────────────────────┐
│                  Micro-Apps                      │
│                                                  │
│  Each app:                                       │
│  - Provides Communication Sheet (API contract)   │
│  - Provides Display Sheet (UI definition)        │
│  - Syncs data to Hub                             │
│  - Publishes/Subscribes to events                │
└─────────────────────────────────────────────────┘
```

## Creating Your First Custom Dashboard

### Step 1: Create Communication Sheet

```yaml
# my-app/communication-sheet.yaml
app_metadata:
  app_id: "my-app"
  app_name: "My Application"
  version: "1.0.0"
  communication_sheet_version: "1.0"

entities:
  - entity_name: "Task"
    schema:
      type: "object"
      required: ["task_id", "title", "status"]
      properties:
        task_id:
          type: "string"
        title:
          type: "string"
        status:
          type: "string"
          enum: ["todo", "in_progress", "done"]

# ... (see docs/standards/communication-sheet-template.yaml)
```

### Step 2: Create Display Sheet

```yaml
# my-app/display-sheet.yaml
app_metadata:
  app_id: "my-app"
  app_name: "My Application"
  version: "1.0.0"
  display_sheet_version: "1.0"

display_config:
  theme:
    primary_color: "#3B82F6"
    icon: "check_circle"
    icon_type: "material"

  widgets:
    - widget_id: "task_stats"
      widget_type: "stat"
      title: "Task Statistics"
      data_source:
        type: "api"
        endpoint: "/api/v1/data/Task"
        method: "GET"
        filters:
          app_id: "my-app"
      rendering:
        fields:
          - field_name: "total"
            label: "Total Tasks"
            type: "number"

    - widget_id: "task_table"
      widget_type: "table"
      title: "Tasks"
      data_source:
        type: "api"
        endpoint: "/api/v1/data/Task"
        method: "GET"
        filters:
          app_id: "my-app"
      rendering:
        fields:
          - field_name: "title"
            label: "Title"
            type: "text"
          - field_name: "status"
            label: "Status"
            type: "status"
            color_map:
              todo: "#6B7280"
              in_progress: "#F59E0B"
              done: "#10B981"

# ... (see docs/standards/display-sheet-template.yaml)
```

### Step 3: Register with Hub

```bash
# Register app
curl -X POST http://localhost:3000/api/v1/apps/register \
  -H "Content-Type: application/json" \
  -d @my-app/communication-sheet.yaml

# Upload display sheet
curl -X POST http://localhost:3000/api/v1/apps/my-app/display-sheet \
  -H "Content-Type: application/json" \
  -d @my-app/display-sheet.yaml
```

### Step 4: Implement App

```javascript
// my-app/server.js
const express = require('express');
const app = express();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Sync data to Hub
app.post('/api/v1/tasks', async (req, res) => {
  const task = req.body;

  // Save to Hub
  await axios.post('http://localhost:3000/api/v1/data', {
    app_id: 'my-app',
    entity_type: 'Task',
    entity_id: task.task_id,
    schema_version: '1.0',
    data: task
  }, {
    headers: { Authorization: `ApiKey ${API_KEY}` }
  });

  res.json({ success: true, data: task });
});

app.listen(3003, () => {
  console.log('My App running on port 3003');
});
```

### Step 5: View Dashboard

Navigate to `http://localhost:3001/app/my-app` to see your custom dashboard!

## Widget Types Explained

### Stat Widget
Perfect for KPIs and metrics.

**Use Case**: Total users, revenue, orders
```yaml
widget_type: "stat"
```

### Card Widget
Display detailed information.

**Use Case**: User profile, order details
```yaml
widget_type: "card"
```

### Table Widget
List and manage entities.

**Use Case**: Orders list, users list, transactions
```yaml
widget_type: "table"
```

### Chart Widget
Visualize trends.

**Use Case**: Sales over time, user growth
```yaml
widget_type: "chart"
```

### Custom Widget
App-specific functionality.

**Use Case**: Text converter, calculator, custom tools
```yaml
widget_type: "custom"
```

## Common Patterns

### Pattern 1: Dashboard with Stats + Table

```yaml
widgets:
  - widget_id: "stats"
    widget_type: "stat"
    size: { columns: 12 }

  - widget_id: "table"
    widget_type: "table"
    size: { columns: 12 }
```

### Pattern 2: Chart + Details

```yaml
widgets:
  - widget_id: "chart"
    widget_type: "chart"
    size: { columns: 8 }

  - widget_id: "details"
    widget_type: "card"
    size: { columns: 4 }
```

### Pattern 3: Custom Tool

```yaml
widgets:
  - widget_id: "tool"
    widget_type: "custom"
    size: { columns: 6 }

  - widget_id: "history"
    widget_type: "table"
    size: { columns: 6 }
```

## Advanced Features

### Real-Time Updates

Use event-driven data sources:

```yaml
data_source:
  type: "event"
  event_types: ["task.created", "task.updated"]
```

### Form Integration

Add forms for creating/editing:

```yaml
interactions:
  forms:
    - form_id: "create_task"
      fields:
        - field_name: "title"
          type: "text"
          required: true
```

### Permissions

Control who sees what:

```yaml
widgets:
  - widget_id: "admin_panel"
    permissions: ["app.admin"]
```

## Troubleshooting

### Dashboard is Empty
1. Check Hub is running: `http://localhost:3000/api/v1/health`
2. Verify apps are registered: `GET /api/v1/apps`
3. Check Display Sheets exist: `GET /api/v1/apps/{appId}/display-sheet`

### Widget Shows "No Data"
1. Verify endpoint returns data: `curl http://localhost:3000/api/v1/data/Entity?app_id=my-app`
2. Check authentication/API keys
3. Review browser console for errors

### Styling Issues
1. Verify `primary_color` is valid hex
2. Check grid `columns` is 1-12
3. Ensure icon names are correct

## Next Steps

1. **Read the Standards**:
   - [Display Standards](standards/DISPLAY_STANDARDS.md)
   - [API Standards](standards/API_STANDARDS.md)
   - [Data Standards](standards/DATA_STANDARDS.md)

2. **Explore Examples**:
   - [Demo App](../micro-apps/demo-text-to-hex/)
   - [Display Sheet Template](standards/display-sheet-template.yaml)

3. **Build Your App**:
   - Define Communication Sheet
   - Create Display Sheet
   - Implement backend
   - Register with Hub
   - View in Dashboard!

## Resources

- **Hub API**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3001`
- **Documentation**: `docs/`
- **Examples**: `micro-apps/examples/`
- **Templates**: `docs/standards/`

## Support

- Issues: GitHub Issues
- Documentation: `docs/`
- Examples: `micro-apps/demo-text-to-hex/`
