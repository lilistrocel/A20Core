# Demo: Text-to-Hex Converter

A simple demonstration micro-app for the A20 Core Hub that converts text strings to hexadecimal format.

## Purpose

This demo app showcases:
- How to create a micro-app that integrates with the Hub
- Communication Sheet implementation
- Display Sheet for custom UI rendering
- Data synchronization with the Hub
- Event publishing

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your Hub API key

# Start the app
npm run dev
```

## Registration with Hub

### 1. Register the App

```bash
curl -X POST http://localhost:3000/api/v1/apps/register \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d @communication-sheet.yaml
```

### 2. Upload Display Sheet

```bash
curl -X POST http://localhost:3000/api/v1/apps/demo-text-to-hex/display-sheet \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d @display-sheet.yaml
```

### 3. Get API Key

Save the API key returned from registration and add it to your `.env` file.

## Usage

### Convert Text to Hex

```bash
curl -X POST http://localhost:3002/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello World"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "conversion_id": "conv_1234567890_abc123",
    "input": "Hello World",
    "output": "48656c6c6f20576f726c64",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "length": 11,
    "hex_length": 22
  }
}
```

### View Conversion History

```bash
curl http://localhost:3002/api/v1/conversions
```

### View Statistics

```bash
curl http://localhost:3002/api/v1/stats
```

## Features

- ✅ Text to hexadecimal conversion
- ✅ Conversion history stored in Hub
- ✅ Statistics tracking
- ✅ Event publishing on conversion
- ✅ Custom dashboard widget
- ✅ Real-time data sync

## Dashboard

Once registered and the Display Sheet is uploaded, the app will appear in the A20 Core Dashboard at:

`http://localhost:3001/app/demo-text-to-hex`

The dashboard includes:
- **Statistics Widget**: Total conversions and characters converted
- **Converter Widget**: Interactive text-to-hex converter
- **History Table**: Recent conversions with sortable columns

## Deletion

This is a temporary demo app. To remove it:

```bash
# Delete from Hub
curl -X DELETE http://localhost:3000/api/v1/apps/demo-text-to-hex \
  -H "Authorization: Bearer <admin-token>"

# Delete local files
cd ../..
rm -rf micro-apps/demo-text-to-hex
```

## Technical Details

- **Port**: 3002
- **Language**: Node.js
- **Framework**: Express
- **Data Storage**: Hub JSONB storage
- **Events**: Publishes `conversion.completed` event

## Files

- `src/server.js` - Main application server
- `communication-sheet.yaml` - API contract definition
- `display-sheet.yaml` - UI/Dashboard definition
- `package.json` - Dependencies and scripts
