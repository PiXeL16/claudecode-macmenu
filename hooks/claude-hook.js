#!/usr/bin/env node

/**
 * Claude Code Hook Script for claudecode-macmenu
 *
 * This script is called by Claude Code hooks and sends notifications
 * to the claudecode-macmenu app via a Unix socket.
 *
 * Usage: Set this as a hook in ~/.claude/settings.json
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Socket path where the menu bar app listens
const SOCKET_PATH = path.join(os.tmpdir(), 'claudecode-macmenu.sock');

// Read stdin to get hook data
let inputData = '';

process.stdin.on('data', (chunk) => {
  inputData += chunk.toString();
});

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(inputData);

    // Determine the event type from the hook data
    const eventName = hookData.hook_event_name || 'Unknown';

    // Create a message to send to the app
    const message = {
      event: eventName,
      sessionId: hookData.session_id,
      timestamp: new Date().toISOString(),
      data: hookData
    };

    // Send message to the socket
    sendToSocket(message);
  } catch (error) {
    // Silently fail - don't interrupt Claude Code
    // Log to stderr for debugging
    console.error('Hook error:', error.message);
    process.exit(0); // Exit successfully even on error
  }
});

function sendToSocket(message) {
  // Check if socket exists
  if (!fs.existsSync(SOCKET_PATH)) {
    // Menu bar app not running, exit silently
    process.exit(0);
    return;
  }

  const client = net.createConnection(SOCKET_PATH, () => {
    // Send the message as JSON
    client.write(JSON.stringify(message) + '\n');
    client.end();
  });

  client.on('error', (err) => {
    // Silently fail if can't connect
    process.exit(0);
  });

  client.on('end', () => {
    process.exit(0);
  });

  // Timeout after 1 second
  setTimeout(() => {
    client.destroy();
    process.exit(0);
  }, 1000);
}

// Start reading stdin
process.stdin.resume();
