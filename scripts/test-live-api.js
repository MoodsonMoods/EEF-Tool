#!/usr/bin/env node

const https = require('https');

// Configuration
const ESPN_BASE_URL = 'https://fantasy.espngoal.nl/api';
const ESPN_LEAGUE_ID = process.env.ESPN_LEAGUE_ID || '123456';

// Make HTTPS request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    console.log(`Testing: ${url}`);
    
    const req = https.get(url, (res) => {
      console.log(`  Status: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  Response length: ${data.length} characters`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`  Success! Response preview:`, JSON.stringify(jsonData, null, 2).substring(0, 500) + '...');
          resolve(jsonData);
        } catch (error) {
          console.log(`  Failed to parse JSON: ${error.message}`);
          console.log(`  Raw response: ${data.substring(0, 500)}...`);
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`  Request failed: ${error.message}`);
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test endpoints
const TEST_ENDPOINTS = [
  {
    name: 'bootstrap-static',
    url: `${ESPN_BASE_URL}/bootstrap-static/`,
    description: 'Static data including players, teams, and game settings'
  },
  {
    name: 'fixtures',
    url: `${ESPN_BASE_URL}/fixtures/`,
    description: 'All fixtures for the season'
  },
  {
    name: 'my-team',
    url: `${ESPN_BASE_URL}/my-team/${ESPN_LEAGUE_ID}/`,
    description: 'My team data (using league ID as team ID)'
  },
  {
    name: 'account-info',
    url: `${ESPN_BASE_URL}/me/`,
    description: 'Account information and user data'
  }
];

async function testLiveAPI() {
  console.log('Testing live ESPN EEF API endpoints...\n');
  
  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`\n--- Testing ${endpoint.name} ---`);
    console.log(`Description: ${endpoint.description}`);
    
    try {
      await makeRequest(endpoint.url);
      console.log(`✓ ${endpoint.name} - SUCCESS`);
    } catch (error) {
      console.log(`✗ ${endpoint.name} - FAILED: ${error.message}`);
    }
  }
  
  console.log('\n--- Test Complete ---');
}

// Run the test
testLiveAPI().catch(console.error); 