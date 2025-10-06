# Display Standards & UI Integration

## Overview

This document defines the Display Standards for creating dynamic, modular UI dashboards in the A20 Core ecosystem. Each micro-app can define how its data should be visually presented through a **Display Sheet**.

## Philosophy

The A20 Core Dashboard is **empty by default** and becomes populated dynamically as micro-apps register and provide Display Sheets. This approach ensures:

- **Modularity**: Each app controls its own UI representation
- **Flexibility**: Apps can update their UI without dashboard changes
- **Scalability**: New apps appear automatically when registered
- **Consistency**: Standard widget types ensure uniform UX

## Display Sheet Structure

### 1. App Metadata
Identifies the app and links to its Communication Sheet.

```yaml
app_metadata:
  app_id: "your-app-id"  # Must match Communication Sheet
  app_name: "Your App Name"
  version: "1.0.0"
  display_sheet_version: "1.0"
```

### 2. Display Configuration

#### Theme
Define the app's visual identity:
```yaml
theme:
  primary_color: "#3B82F6"    # Hex color
  secondary_color: "#10B981"
  icon: "dashboard"            # Icon identifier
  icon_type: "material"        # material | fontawesome | url | custom
```

#### Layout
Configure the grid system:
```yaml
layout:
  default_grid_columns: 12     # Standard 12-column grid
  default_widget_size: "medium" # small | medium | large | full
```

#### Widgets
Define UI components:
```yaml
widgets:
  - widget_id: "unique_id"
    widget_type: "stat"  # See Widget Types below
    title: "Widget Title"
    size:
      columns: 4  # Grid columns (1-12)
      rows: 1     # Grid rows
    data_source:
      type: "api"
      endpoint: "/api/v1/stats"
    rendering:
      # Widget-specific configuration
```

## Widget Types

### 1. Stat Widget
Display key metrics/statistics.

```yaml
widget_type: "stat"
rendering:
  fields:
    - field_name: "total_count"
      label: "Total Items"
      type: "number"
      format: "number"  # number | currency | percentage
```

### 2. Card Widget
Display entity details.

```yaml
widget_type: "card"
rendering:
  fields:
    - field_name: "name"
      label: "Name"
      type: "text"
    - field_name: "status"
      label: "Status"
      type: "status"
      color_map:
        active: "#10B981"
        pending: "#F59E0B"
```

### 3. Table Widget
Display tabular data with sorting/filtering.

```yaml
widget_type: "table"
rendering:
  fields:
    - field_name: "id"
      label: "ID"
      type: "text"
    - field_name: "created_at"
      label: "Created"
      type: "date"
      format: "date"
  table_config:
    sortable: true
    filterable: true
    paginate: true
    page_size: 10
    row_actions:
      - action_id: "edit"
        label: "Edit"
        type: "form"
        form_id: "edit_form"
```

### 4. Chart Widget
Visualize data with charts.

```yaml
widget_type: "chart"
rendering:
  chart_config:
    chart_type: "line"  # line | bar | pie | doughnut | area | scatter
    x_axis: "date"
    series:
      - field: "count"
        label: "Activity Count"
        color: "#3B82F6"
```

### 5. Custom Widget
Implement app-specific functionality.

```yaml
widget_type: "custom"
rendering:
  component: "CustomComponent"  # React component name
  template: |
    <div class="custom-widget">
      <!-- Custom HTML template -->
    </div>
```

## Data Sources

### API Data Source
Fetch data from Hub or app endpoints.

```yaml
data_source:
  type: "api"
  endpoint: "/api/v1/data/Entity"
  method: "GET"
  entity_type: "Entity"
  filters:
    status: "active"
```

### Event Data Source
Listen for real-time events.

```yaml
data_source:
  type: "event"
  event_types:
    - "entity.created"
    - "entity.updated"
```

### Static Data Source
Hardcoded data for simple widgets.

```yaml
data_source:
  type: "static"
  data:
    value: 42
    label: "Answer"
```

### Computed Data Source
Calculate data from other sources.

```yaml
data_source:
  type: "computed"
  transform: "computeTotalFunction"
```

## Interactions

### Forms
Define forms for creating/editing data.

```yaml
interactions:
  forms:
    - form_id: "create_item"
      title: "Create New Item"
      fields:
        - field_name: "name"
          label: "Name"
          type: "text"
          required: true
        - field_name: "status"
          label: "Status"
          type: "select"
          options:
            - value: "active"
              label: "Active"
            - value: "inactive"
              label: "Inactive"
      submit_endpoint: "/api/v1/data"
      submit_method: "POST"
      success_message: "Item created successfully!"
```

### Commands
Define API actions.

```yaml
interactions:
  commands:
    - command_id: "sync_data"
      label: "Sync Data"
      endpoint: "/api/v1/sync"
      method: "POST"
      permissions: ["app.admin"]
```

## Field Types

| Type | Description | Format Options |
|------|-------------|----------------|
| `text` | Plain text | - |
| `number` | Numeric value | `number`, `currency`, `percentage` |
| `date` | Date/timestamp | `date`, `datetime`, `time` |
| `boolean` | True/False | - |
| `status` | Status badge | Requires `color_map` |
| `tag` | Colored tag | Requires `color_map` |
| `link` | Hyperlink | Requires `link_template` |
| `custom` | Custom render | Requires `transform` |

## Actions

### Button Actions
```yaml
actions:
  - action_id: "create_new"
    label: "Create New"
    type: "form"
    icon: "add"
    style: "primary"  # primary | secondary | success | danger | warning
    form_id: "create_form"
    permissions: ["app.create"]
```

### Link Actions
```yaml
actions:
  - action_id: "view_details"
    label: "View"
    type: "link"
    link_template: "/app/{appId}/view/{id}"
```

### API Call Actions
```yaml
actions:
  - action_id: "delete_item"
    label: "Delete"
    type: "api_call"
    endpoint: "/api/v1/data/{id}"
    method: "DELETE"
    confirm_message: "Are you sure?"
    permissions: ["app.delete"]
```

## Permissions

All widgets and actions support permission-based visibility:

```yaml
permissions: ["app.read", "app.admin"]
```

Users without required permissions won't see the widget/action.

## Refresh Strategy

### Auto-Refresh
```yaml
refresh_interval: 30  # Seconds
```

### Event-Driven Refresh
```yaml
data_source:
  event_types: ["entity.updated"]
```

## Best Practices

### 1. Widget Organization
- Use **stat widgets** for KPIs at the top
- Place **primary actions** in prominent positions
- Group **related widgets** together
- Use **full-width widgets** for tables

### 2. Performance
- Set appropriate `refresh_interval` (minimum 10 seconds)
- Use pagination for large datasets (`page_size: 10-50`)
- Limit initial data loads
- Use computed fields for client-side calculations

### 3. User Experience
- Provide meaningful `title` and `description`
- Use `color_map` consistently for status fields
- Include `confirm_message` for destructive actions
- Set sensible `default_value` in forms

### 4. Accessibility
- Use semantic field labels
- Provide placeholder text
- Include field descriptions
- Use appropriate input types

## Dashboard Layout

The dashboard uses a 12-column grid system:

```
┌─────────────────────────────────────────┐
│  Stat (4 cols)  │  Stat (4 cols)  │ ... │  Row 1
├─────────────────────────────────────────┤
│  Chart (6 cols)       │  Card (6 cols)  │  Row 2
├─────────────────────────────────────────┤
│  Table (12 cols - full width)           │  Row 3
└─────────────────────────────────────────┘
```

### Responsive Breakpoints
- **Mobile**: Stacked (1 column)
- **Tablet**: 2-3 columns
- **Desktop**: Full 12-column grid

## Upload Process

### 1. Create Display Sheet
```bash
# Create display-sheet.yaml using template
cp docs/standards/display-sheet-template.yaml my-app/display-sheet.yaml
# Edit with your app's UI definition
```

### 2. Validate Locally
```javascript
const Ajv = require('ajv');
const schema = require('./docs/standards/display-sheet-schema.json');
const displaySheet = require('./my-app/display-sheet.yaml');

const ajv = new Ajv();
const valid = ajv.validate(schema, displaySheet);
console.log(valid ? 'Valid!' : ajv.errors);
```

### 3. Upload to Hub
```bash
curl -X POST http://localhost:3000/api/v1/apps/my-app-id/display-sheet \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d @my-app/display-sheet.yaml
```

### 4. Verify in Dashboard
Navigate to: `http://localhost:3001/app/my-app-id`

## Version Management

Display Sheets follow semantic versioning:

- **Patch** (1.0.1): Bug fixes, style tweaks
- **Minor** (1.1.0): New widgets, fields
- **Major** (2.0.0): Breaking UI changes

### Updating Display Sheets
```yaml
app_metadata:
  version: "1.1.0"  # Increment version
```

Then re-upload. The Hub maintains version history.

## Example: Complete Display Sheet

See:
- [display-sheet-template.yaml](display-sheet-template.yaml) - Full template
- [micro-apps/demo-text-to-hex/display-sheet.yaml](../../micro-apps/demo-text-to-hex/display-sheet.yaml) - Working example

## Troubleshooting

### Widget Not Appearing
1. Check Display Sheet is uploaded: `GET /api/v1/apps/{appId}/display-sheet`
2. Verify permissions in widget definition
3. Check browser console for errors
4. Validate data_source endpoint returns data

### Data Not Loading
1. Verify endpoint is accessible
2. Check API key/authentication
3. Inspect network tab for failed requests
4. Validate data format matches field definitions

### Styling Issues
1. Verify `theme.primary_color` is valid hex
2. Check `size.columns` is between 1-12
3. Ensure icon names are valid for `icon_type`
4. Review browser console for CSS errors

## Resources

- [Display Sheet Schema](display-sheet-schema.json)
- [Display Sheet Template](display-sheet-template.yaml)
- [Demo App Example](../../micro-apps/demo-text-to-hex/)
- [API Standards](API_STANDARDS.md)
- [Data Standards](DATA_STANDARDS.md)
