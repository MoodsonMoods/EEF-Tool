#!/usr/bin/env node

/**
 * Test script to verify FDR and schedules APIs work with startGameweek parameter
 */

const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString());
  });
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ ${endpoint} - Success`);
      console.log(`   Params:`, params);
      console.log(`   Response keys:`, Object.keys(data.data || data));
      return data;
    } else {
      console.log(`❌ ${endpoint} - Failed`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error:`, data.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.log(`❌ ${endpoint} - Network error`);
    console.log(`   Error:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing FDR and Schedules APIs with startGameweek parameter\n');
  
  // Test 1: Default parameters (should work as before)
  console.log('Test 1: Default parameters');
  await testAPI('/api/fdr', { horizon: 5 });
  await testAPI('/api/schedules', { horizon: 5 });
  console.log('');
  
  // Test 2: With startGameweek parameter
  console.log('Test 2: With startGameweek parameter');
  await testAPI('/api/fdr', { horizon: 5, startGameweek: 1 });
  await testAPI('/api/schedules', { horizon: 5, startGameweek: 1 });
  console.log('');
  
  // Test 3: Different start gameweek
  console.log('Test 3: Different start gameweek');
  await testAPI('/api/fdr', { horizon: 3, startGameweek: 10 });
  await testAPI('/api/schedules', { horizon: 3, startGameweek: 10 });
  console.log('');
  
  // Test 4: Edge case - late start gameweek
  console.log('Test 4: Late start gameweek');
  await testAPI('/api/fdr', { horizon: 5, startGameweek: 35 });
  await testAPI('/api/schedules', { horizon: 5, startGameweek: 35 });
  console.log('');
  
  // Test 5: Invalid parameters (should handle gracefully)
  console.log('Test 5: Invalid parameters');
  await testAPI('/api/fdr', { horizon: 5, startGameweek: 50 });
  await testAPI('/api/schedules', { horizon: 5, startGameweek: 50 });
  console.log('');
  
  console.log('🏁 Tests completed!');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/events`);
    if (response.ok) {
      console.log('✅ Server is running at', BASE_URL);
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the development server with: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
}

main().catch(console.error); 