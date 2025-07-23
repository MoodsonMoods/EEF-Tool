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

async function testEndpoints() {
  console.log('🧪 Testing FBR API endpoints...\n');
  
  try {
    // Test 1: Generate API key
    console.log('1️⃣ Testing API key generation...');
    const apiKeyResponse = await makeApiRequest('/generate_api_key', {}, null, 'POST');
    console.log('✅ API key generated:', apiKeyResponse.api_key ? 'Success' : 'Failed');
    const apiKey = apiKeyResponse.api_key;
    
    if (!apiKey) {
      throw new Error('Failed to get API key');
    }
    
    console.log('\n2️⃣ Testing documentation endpoint...');
    try {
      const docResponse = await makeApiRequest('/documentation', {}, apiKey);
      console.log('✅ Documentation endpoint works');
    } catch (error) {
      console.log('❌ Documentation endpoint failed (expected - returns HTML):', error.message);
    }
    
    console.log('\n3️⃣ Testing countries endpoint...');
    try {
      const countriesResponse = await makeApiRequest('/countries', {}, apiKey);
      console.log('✅ Countries endpoint works');
      console.log(`Found ${countriesResponse.data?.length || 0} countries`);
      
      // Look for Netherlands
      if (countriesResponse.data) {
        const netherlands = countriesResponse.data.find(country => 
          country.country?.toLowerCase().includes('netherlands')
        );
        if (netherlands) {
          console.log(`✅ Found Netherlands: ${netherlands.country} (${netherlands.country_code})`);
        } else {
          console.log('❌ Netherlands not found in countries list');
        }
      }
    } catch (error) {
      console.log('❌ Countries endpoint failed:', error.message);
    }
    
    console.log('\n4️⃣ Testing leagues endpoint (without country parameter)...');
    try {
      const leaguesResponse = await makeApiRequest('/leagues', {}, apiKey);
      console.log('✅ Leagues endpoint works');
      console.log(`Found ${leaguesResponse.data?.length || 0} leagues`);
      
      // Look for Eredivisie
      if (leaguesResponse.data) {
        const eredivisie = leaguesResponse.data.find(league => 
          league.league_name?.toLowerCase().includes('eredivisie')
        );
        if (eredivisie) {
          console.log(`✅ Found Eredivisie: ${eredivisie.league_name} (ID: ${eredivisie.league_id})`);
        } else {
          console.log('❌ Eredivisie not found in leagues list');
        }
      }
    } catch (error) {
      console.log('❌ Leagues endpoint failed:', error.message);
    }
    
    console.log('\n5️⃣ Testing team-season-stats endpoint with known values...');
    try {
      // Try with some common league IDs
      const testLeagueIds = ['9', '13', '20']; // Premier League, La Liga, Bundesliga
      const testSeasonId = '2023-2024'; // Use 2023-2024 as 2024-2025 might not be available yet
      
      for (const leagueId of testLeagueIds) {
        console.log(`Testing league ID: ${leagueId}`);
        try {
          const statsResponse = await makeApiRequest('/team-season-stats', {
            league_id: leagueId,
            season_id: testSeasonId
          }, apiKey);
          
          if (statsResponse.data && statsResponse.data.length > 0) {
            console.log(`✅ Team stats endpoint works for league ${leagueId}`);
            console.log(`Found ${statsResponse.data.length} teams`);
            
            // Show sample data structure
            const sampleTeam = statsResponse.data[0];
            console.log('Sample team data structure:');
            console.log(Object.keys(sampleTeam));
            
            // Examine the stats object
            if (sampleTeam.stats) {
              console.log('Stats object keys:');
              console.log(Object.keys(sampleTeam.stats));
              
              // Look for xG fields in stats
              const xgFields = Object.keys(sampleTeam.stats).filter(key => 
                key.toLowerCase().includes('xg') || key.toLowerCase().includes('expected')
              );
              console.log('xG-related fields found in stats:', xgFields);
              
              // Show a sample of the stats data
              console.log('Sample stats data:');
              console.log(JSON.stringify(sampleTeam.stats, null, 2).substring(0, 500) + '...');
            }
            
            break; // Found working data, no need to test more
          }
        } catch (error) {
          console.log(`❌ League ${leagueId} failed:`, error.message);
        }
      }
    } catch (error) {
      console.log('❌ Team season stats endpoint failed:', error.message);
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testEndpoints();
} 