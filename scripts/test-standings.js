#!/usr/bin/env node

const FBR_API_BASE = 'https://fbrapi.com';

// Helper function to make API requests
async function makeApiRequest(endpoint, params = {}, apiKey = null, method = 'GET') {
  const url = new URL(endpoint, FBR_API_BASE);
  
  // Add query parameters for GET requests
  if (method === 'GET') {
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
  }

  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  console.log(`Making ${method} request to: ${url.toString()}`);
  
  try {
    const options = {
      method,
      headers
    };
    
    // Add body for POST requests
    if (method === 'POST' && Object.keys(params).length > 0) {
      options.body = JSON.stringify(params);
    }
    
    const response = await fetch(url.toString(), options);
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making ${method} request to ${endpoint}:`, error.message);
    throw error;
  }
}

async function testStandings() {
  console.log('🧪 Testing league-standings endpoint...\n');
  
  try {
    // Generate API key
    const apiKeyResponse = await makeApiRequest('/generate_api_key', {}, null, 'POST');
    const apiKey = apiKeyResponse.api_key;
    console.log('✅ API key generated');
    
    // Test different approaches
    const testCases = [
      { league_id: '23', season_id: '2024-2025' },
      { league_id: '23', season_id: '2023-2024' },
      { league_id: '23' }, // No season_id
      { league_id: '9', season_id: '2023-2024' }, // Premier League for comparison
      { league_id: '9' } // Premier League without season
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Testing:`, testCase);
      try {
        const response = await makeApiRequest('/league-standings', testCase, apiKey);
        console.log(`✅ Success! Found ${response.data?.length || 0} teams`);
        
        if (response.data && response.data.length > 0) {
          const sampleTeam = response.data[0];
          console.log('Sample team data:');
          console.log(Object.keys(sampleTeam));
          
          // Check for xG fields
          if (sampleTeam.xg !== undefined) {
            console.log(`✅ xG data available: ${sampleTeam.xg}`);
          }
          if (sampleTeam.xga !== undefined) {
            console.log(`✅ xGA data available: ${sampleTeam.xga}`);
          }
          
          // Show first few teams
          console.log('First 3 teams:');
          response.data.slice(0, 3).forEach(team => {
            console.log(`- ${team.team_name}: xG=${team.xg || 'N/A'}, xGA=${team.xga || 'N/A'}`);
          });
          
          break; // Found working data
        }
      } catch (error) {
        console.log(`❌ Failed:`, error.message);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testStandings();
} 