#!/usr/bin/env node
/**
 * MCP SSE Bridge
 *
 * Bridges Antigravity IDE's stdio-based MCP protocol to Serena's SSE server.
 * This allows multiple IDE sessions to share a single Serena server instance.
 *
 * Usage:
 *   node mcp-sse-bridge.js [SSE_URL]
 *
 * Default SSE URL: http://localhost:12341/sse
 */

const http = require('http');
const https = require('https');

const SSE_URL = process.argv[2] || 'http://localhost:12341/sse';
const MCP_ENDPOINT = SSE_URL.replace('/sse', '/mcp');

let requestId = 0;
const pendingRequests = new Map();

// Parse SSE URL
const url = new URL(SSE_URL);
const httpModule = url.protocol === 'https:' ? https : http;

// Connect to SSE stream for server-to-client messages
function connectSSE() {
  const req = httpModule.request(SSE_URL, {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  }, (res) => {
    if (res.statusCode !== 200) {
      console.error(`SSE connection failed: ${res.statusCode}`);
      process.exit(1);
    }

    let buffer = '';

    res.on('data', (chunk) => {
      buffer += chunk.toString();

      // Parse SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = 'message';
      let eventData = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          eventData = line.slice(5).trim();
        } else if (line === '' && eventData) {
          // End of event
          handleSSEEvent(eventType, eventData);
          eventType = 'message';
          eventData = '';
        }
      }
    });

    res.on('end', () => {
      console.error('SSE connection closed, reconnecting...');
      setTimeout(connectSSE, 1000);
    });

    res.on('error', (err) => {
      console.error('SSE error:', err.message);
      setTimeout(connectSSE, 1000);
    });
  });

  req.on('error', (err) => {
    console.error('SSE connection error:', err.message);
    setTimeout(connectSSE, 1000);
  });

  req.end();
}

function handleSSEEvent(eventType, data) {
  try {
    if (eventType === 'message' || eventType === 'endpoint') {
      // Ignore endpoint messages
      return;
    }

    const parsed = JSON.parse(data);

    // Forward to stdout (IDE)
    process.stdout.write(JSON.stringify(parsed) + '\n');
  } catch (err) {
    // Not JSON, might be keepalive or other message
  }
}

// Handle stdin (messages from IDE)
let stdinBuffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  stdinBuffer += chunk;

  // Process complete lines
  const lines = stdinBuffer.split('\n');
  stdinBuffer = lines.pop() || '';

  for (const line of lines) {
    if (line.trim()) {
      handleIDEMessage(line.trim());
    }
  }
});

function handleIDEMessage(message) {
  try {
    const parsed = JSON.parse(message);

    // Send to Serena MCP endpoint
    const postData = JSON.stringify(parsed);

    const mcpUrl = new URL(MCP_ENDPOINT);

    const req = httpModule.request({
      hostname: mcpUrl.hostname,
      port: mcpUrl.port,
      path: mcpUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      }
    }, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (responseData.trim()) {
          // Forward response to IDE
          process.stdout.write(responseData + '\n');
        }
      });
    });

    req.on('error', (err) => {
      // Send error response back to IDE
      const errorResponse = {
        jsonrpc: '2.0',
        id: parsed.id,
        error: {
          code: -32603,
          message: `Bridge error: ${err.message}`
        }
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.error('Failed to parse IDE message:', err.message);
  }
}

// Start SSE connection
connectSSE();

// Keep process alive
process.stdin.resume();

// Handle graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
