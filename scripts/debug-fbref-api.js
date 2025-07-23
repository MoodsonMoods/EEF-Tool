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

async function debugApi() {
  console.log('🔍 Debugging FBR API...\n');
  
  try {
    // Generate API key
    console.log('1️⃣ Generating API key...');
    const apiKeyResponse = await makeApiRequest('/generate_api_key', {}, null, 'POST');
    const apiKey = apiKeyResponse.api_key;
    console.log('✅ API key generated');
    
    // Test different endpoints and parameters
    const endpoints = [
      '/countries',
      '/leagues',
      '/league-seasons',
      '/teams',
      '/players'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n2️⃣ Testing ${endpoint}...`);
      try {
        const response = await makeApiRequest(endpoint, {}, apiKey);
        console.log(`✅ ${endpoint} works`);
        console.log(`Data structure:`, Object.keys(response));
        if (response.data) {
          console.log(`Data length: ${response.data.length}`);
          if (response.data.length > 0) {
            console.log(`Sample item keys:`, Object.keys(response.data[0]));
          }
        }
      } catch (error) {
        console.log(`❌ ${endpoint} failed:`, error.message);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Test team-season-stats with different parameters
    console.log('\n3️⃣ Testing team-season-stats with different parameters...');
    const testParams = [
      { league_id: '9', season_id: '2023-2024' },
      { league_id: '9', season_id: '2022-2023' },
      { league_id: '13', season_id: '2023-2024' },
      { league_id: '20', season_id: '2023-2024' },
      { league_id: '1', season_id: '2023-2024' },
      { league_id: '2', season_id: '2023-2024' }
    ];
    
    for (const params of testParams) {
      console.log(`Testing with params:`, params);
      try {
        const response = await makeApiRequest('/team-season-stats', params, apiKey);
        console.log(`✅ Team stats works with params:`, params);
        console.log(`Data length: ${response.data?.length || 0}`);
        if (response.data && response.data.length > 0) {
          console.log(`Sample team structure:`, Object.keys(response.data[0]));
        }
        break; // Found working params
      } catch (error) {
        console.log(`❌ Failed with params:`, params, error.message);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } catch (error) {
    console.error('\n💥 Debug failed:', error.message);
  }
}

// Run the debug
if (require.main === module) {
  debugApi();
} 