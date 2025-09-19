#!/usr/bin/env node

const https = require('https');

// Configuration
const ESPN_BASE_URL = 'https://fantasy.espngoal.nl/api';

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
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
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

async function testTeamById() {
  console.log('Testing team by ID from live ESPN API...\n');
  
  try {
    // First, get the bootstrap-static data to see available teams
    console.log('1. Fetching bootstrap-static data to get team information...');
    const bootstrapData = await makeRequest(`${ESPN_BASE_URL}/bootstrap-static/`);
    
    if (bootstrapData.teams && bootstrapData.teams.length > 0) {
      console.log(`✓ Found ${bootstrapData.teams.length} teams in the data`);
      
      // Show first few teams
      console.log('\nFirst 5 teams:');
      bootstrapData.teams.slice(0, 5).forEach(team => {
        console.log(`  ID: ${team.id}, Name: ${team.name}, Short: ${team.short_name}`);
      });
      
      // Test fetching a specific team by ID
      const testTeamId = bootstrapData.teams[0].id;
      console.log(`\n2. Testing fetch for team ID ${testTeamId} (${bootstrapData.teams[0].name})...`);
      
      // Try to fetch the team directly (if such endpoint exists)
      try {
        const teamData = await makeRequest(`${ESPN_BASE_URL}/teams/${testTeamId}/`);
        console.log('✓ Team endpoint exists!');
        console.log('Team data:', JSON.stringify(teamData, null, 2));
      } catch (error) {
        console.log('✗ Direct team endpoint not available');
        console.log('  Error:', error.message);
        
        // Show the team data from bootstrap-static instead
        console.log('\n3. Team data from bootstrap-static:');
        const team = bootstrapData.teams.find(t => t.id === testTeamId);
        if (team) {
          console.log(JSON.stringify(team, null, 2));
        }
      }
      
      // Test our local API endpoint
      console.log('\n4. Testing our local API endpoint...');
      try {
        const localResponse = await fetch(`http://localhost:3000/api/teams/${testTeamId}`);
        const localData = await localResponse.json();
        console.log('✓ Local API response:');
        console.log(JSON.stringify(localData, null, 2));
      } catch (error) {
        console.log('✗ Local API test failed:', error.message);
      }
      
    } else {
      console.log('✗ No teams found in bootstrap-static data');
    }
    
  } catch (error) {
    console.log('✗ Failed to fetch bootstrap-static data:', error.message);
  }
}

// Run the test
testTeamById().catch(console.error); 