/**
 * Demo Micro-App: Text to Hex Converter
 * Simple demonstration of micro-app integration with A20 Core Hub
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;
const APP_ID = process.env.APP_ID || '5ef83f28-897a-4dac-9e81-be5cca3afff6';

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Communication sheet endpoint
app.get('/api/communication-sheet', (req, res) => {
  const fs = require('fs');
  const yaml = require('js-yaml');
  const sheet = yaml.load(fs.readFileSync(__dirname + '/../communication-sheet.yaml', 'utf8'));
  res.json(sheet);
});

// Convert text to hex
app.post('/api/v1/convert', async (req, res) => {
  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input: string required',
      });
    }

    // Convert to hex
    const hexOutput = Buffer.from(input, 'utf8').toString('hex');

    // Store result in Hub
    const result = {
      conversion_id: generateId(),
      input: input,
      output: hexOutput,
      timestamp: new Date().toISOString(),
      length: input.length,
      hex_length: hexOutput.length,
    };

    // Send to Hub
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (API_KEY) {
        headers.Authorization = `ApiKey ${API_KEY}`;
      }

      await axios.post(
        `${HUB_URL}/api/v1/data`,
        {
          app_id: APP_ID,
          entity_type: 'Conversion',
          entity_id: result.conversion_id,
          schema_version: '1.0',
          data: result,
        },
        { headers }
      );

      // Publish event
      await axios.post(
        `${HUB_URL}/api/v1/events`,
        {
          event_type: 'conversion.completed',
          payload: {
            conversion_id: result.conversion_id,
            input_length: input.length,
            output_length: hexOutput.length,
          },
        },
        { headers }
      );
    } catch (hubError) {
      console.error('Error syncing with Hub:', hubError.message);
      // Continue even if Hub sync fails
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get conversion history
app.get('/api/v1/conversions', async (req, res) => {
  try {
    const headers = {};
    if (API_KEY) {
      headers.Authorization = `ApiKey ${API_KEY}`;
    }

    const response = await axios.get(`${HUB_URL}/api/v1/data/Conversion`, {
      params: {
        app_id: APP_ID,
      },
      headers,
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Statistics
app.get('/api/v1/stats', async (req, res) => {
  try {
    const headers = {};
    if (API_KEY) {
      headers.Authorization = `ApiKey ${API_KEY}`;
    }

    const response = await axios.get(`${HUB_URL}/api/v1/data/Conversion`, {
      params: {
        app_id: APP_ID,
      },
      headers,
    });

    const conversions = response.data.data || [];
    const stats = {
      total_conversions: conversions.length,
      total_characters_converted: conversions.reduce(
        (sum, c) => sum + (c.data?.length || 0),
        0
      ),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper function
function generateId() {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Demo Text-to-Hex Converter Started   ║
╚════════════════════════════════════════╝

🚀 Server running on port ${PORT}
🔗 Hub URL: ${HUB_URL}
🔑 API Key: ${API_KEY ? 'Configured' : 'Not configured'}

Endpoints:
  GET  /health                   - Health check
  GET  /api/communication-sheet  - Communication sheet
  POST /api/v1/convert           - Convert text to hex
  GET  /api/v1/conversions       - Get conversion history
  GET  /api/v1/stats             - Get statistics

Ready to convert text to hex!
  `);
});
