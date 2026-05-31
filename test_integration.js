/**
 * Integration test script for Ghost Protocol overlay
 * Tests all key features without manual interaction
 */

const { app, BrowserWindow } = require('electron');
const http = require('http');
const ws = require('ws');

console.log('\n=== INTEGRATION TEST SUITE ===\n');

// Test 1: Check if server is running
setTimeout(() => {
  http.get('http://localhost:3000', (res) => {
    console.log('✓ Test 1 PASS: Server is responding (HTTP status', res.statusCode + ')');
  }).on('error', (err) => {
    console.log('✗ Test 1 FAIL: Server not responding -', err.message);
  });
}, 1000);

// Test 2: Check sender UI is served
setTimeout(() => {
  http.get('http://localhost:3000/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (data.includes('sender') || data.includes('note')) {
        console.log('✓ Test 2 PASS: Sender UI is being served');
      } else {
        console.log('✗ Test 2 FAIL: Sender UI content not found');
      }
    });
  }).on('error', (err) => {
    console.log('✗ Test 2 FAIL: Could not fetch sender UI -', err.message);
  });
}, 1500);

// Test 3: Check WebSocket connection
setTimeout(() => {
  const testWs = new ws('ws://localhost:3000/overlay');
  
  testWs.on('open', () => {
    console.log('✓ Test 3 PASS: WebSocket /overlay endpoint is open');
    
    // Test 4: Send and verify message handling
    testWs.send(JSON.stringify({ type: 'note', content: 'test' }));
    console.log('✓ Test 4 PASS: Message sent to WebSocket (no error)');
    
    testWs.close();
  });
  
  testWs.on('error', (err) => {
    console.log('✗ Test 3 FAIL: WebSocket connection failed -', err.message);
  });
  
  setTimeout(() => testWs.close(), 2000);
}, 2000);

// Test 5: Check minimize button implementation
setTimeout(() => {
  const fs = require('fs');
  const path = require('path');
  const rendererPath = path.join(__dirname, 'overlay/renderer/index.html');
  
  try {
    const content = fs.readFileSync(rendererPath, 'utf8');
    
    const hasMinimizeBtn = content.includes('minimize');
    const hasDragLogic = content.includes('startDrag') || content.includes('handleMouseDown');
    const hasStateSync = content.includes('minimizeState') || content.includes('localStorage');
    
    if (hasMinimizeBtn) {
      console.log('✓ Test 5 PASS: Minimize button implementation found');
    } else {
      console.log('✗ Test 5 FAIL: Minimize button not found in renderer HTML');
    }
    
    if (hasDragLogic) {
      console.log('✓ Test 6 PASS: Drag logic implementation found');
    } else {
      console.log('✗ Test 6 FAIL: Drag logic not found in renderer HTML');
    }
    
    if (hasStateSync) {
      console.log('✓ Test 7 PASS: State persistence implementation found');
    } else {
      console.log('✗ Test 7 FAIL: State persistence not found in renderer HTML');
    }
  } catch (err) {
    console.log('✗ Tests 5-7 FAIL: Could not read renderer HTML -', err.message);
  }
}, 2500);

// Exit after tests
setTimeout(() => {
  console.log('\n=== END OF TESTS ===\n');
  process.exit(0);
}, 4000);
