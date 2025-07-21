#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration - can be overridden by environment variables
const ESPN_LEAGUE_ID = process.env.ESPN_LEAGUE_ID || '123456';
const ESPN_SEASON = process.env.ESPN_SEASON || '2024';
const ESPN_GAME_TYPE = process.env.ESPN_GAME_TYPE || 'soccer'; // Eredivisie Fantasy uses soccer game type
const ESPN_BASE_URL = 'https://fantasy.espngoal.nl/api'; // Correct Eredivisie Fantasy API base URL
const DATA_DIR = path.join(__dirname, '..', 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw');

// Create directories if they don't exist
function ensureDirectories() {
  const dirs = [DATA_DIR, RAW_DIR];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Create timestamped directory for this ingestion
function createTimestampedDir() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMM
  const timestampDir = path.join(RAW_DIR, dateStr, timeStr);
  
  if (!fs.existsSync(timestampDir)) {
    fs.mkdirSync(timestampDir, { recursive: true });
  }
  
  return timestampDir;
}

// Make HTTPS request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      console.log(`  Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`  Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  Response length: ${data.length} characters`);
        console.log(`  Response preview: ${data.substring(0, 200)}...`);
        
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}. Response: ${data.substring(0, 500)}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// ESPN EEF endpoints to fetch
const ENDPOINTS = [
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

// Fetch and save endpoint data
async function fetchEndpoint(endpoint, outputDir) {
  console.log(`Fetching ${endpoint.name}...`);
  
  try {
    const data = await makeRequest(endpoint.url);
    const outputPath = path.join(outputDir, `${endpoint.name}.json`);
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✓ Saved ${endpoint.name}.json`);
    
    return {
      name: endpoint.name,
      success: true,
      timestamp: new Date().toISOString(),
      size: fs.statSync(outputPath).size
    };
  } catch (error) {
    console.error(`✗ Failed to fetch ${endpoint.name}: ${error.message}`);
    return {
      name: endpoint.name,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Generate manifest
function generateManifest(results, outputDir) {
  // Count fixtures if fixtures.json exists
  let fixtureCount = 0;
  const fixturesPath = path.join(outputDir, 'fixtures.json');
  if (fs.existsSync(fixturesPath)) {
    try {
      const fixturesData = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
      fixtureCount = Array.isArray(fixturesData) ? fixturesData.length : 0;
    } catch (error) {
      console.warn('Could not parse fixtures.json for counting');
    }
  }

  const manifest = {
    schemaVersion: '1.0.0',
    dataVersion: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    ingestion: {
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      results: results
    },
    counts: {
      players: 0,
      fixtures: fixtureCount,
      teams: 0
    },
    hashes: {
      players: '',
      fixtures: '',
      fdr: ''
    }
  };
  
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✓ Generated manifest.json');
  
  return manifest;
}

// Main ingestion function
async function runIngestion() {
  console.log('🚀 Starting EEF data ingestion...');
  console.log(`📁 Output directory: ${RAW_DIR}`);
  console.log(`⚙️  Configuration:`);
  console.log(`   League ID: ${ESPN_LEAGUE_ID}`);
  console.log(`   Season: ${ESPN_SEASON}`);
  console.log(`   Base URL: ${ESPN_BASE_URL}`);
  
  try {
    // Ensure directories exist
    ensureDirectories();
    
    // Create timestamped directory
    const timestampDir = createTimestampedDir();
    console.log(`📅 Created directory: ${timestampDir}`);
    
    // Fetch all endpoints
    const results = [];
    for (const endpoint of ENDPOINTS) {
      const result = await fetchEndpoint(endpoint, timestampDir);
      results.push(result);
      
      // Add delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate manifest
    const manifest = generateManifest(results, timestampDir);
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n📊 Ingestion Summary:');
    console.log(`✓ Successful: ${successful}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`📁 Data saved to: ${timestampDir}`);
    
    if (failed > 0) {
      console.log('\n⚠️  Some endpoints failed. Check the results above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 Ingestion completed successfully!');
    }
    
  } catch (error) {
    console.error('💥 Ingestion failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runIngestion();
}

module.exports = {
  runIngestion,
  fetchEndpoint,
  generateManifest
}; 