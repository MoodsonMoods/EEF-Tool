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
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

async function findEredivisie() {
  console.log('🔍 Finding Eredivisie league ID...\n');
  
  try {
    // Generate API key
    const apiKeyResponse = await makeApiRequest('/generate_api_key', {}, null, 'POST');
    const apiKey = apiKeyResponse.api_key;
    console.log('✅ API key generated');
    
    // Get Netherlands country code
    const countriesResponse = await makeApiRequest('/countries', {}, apiKey);
    const netherlands = countriesResponse.data.find(country => 
      country.country.toLowerCase().includes('netherlands')
    );
    
    if (!netherlands) {
      throw new Error('Netherlands not found');
    }
    
    console.log(`✅ Found Netherlands: ${netherlands.country} (${netherlands.country_code})`);
    
    // Now try to get leagues for Netherlands using the country code
    console.log(`\n🔍 Getting leagues for Netherlands (${netherlands.country_code})...`);
    
    try {
      const leaguesResponse = await makeApiRequest('/leagues', { 
        country_code: netherlands.country_code 
      }, apiKey);
      
      console.log(`✅ Found ${leaguesResponse.data?.length || 0} leagues for Netherlands`);
      
      // Debug: Show the actual response structure
      console.log('Leagues response structure:');
      console.log(JSON.stringify(leaguesResponse, null, 2).substring(0, 1000) + '...');
      
      if (leaguesResponse.data) {
        // Show first league structure
        if (leaguesResponse.data.length > 0) {
          console.log('First league structure:');
          console.log(JSON.stringify(leaguesResponse.data[0], null, 2));
        }
        
        // Look for Eredivisie in the nested structure
        let eredivisie = null;
        for (const category of leaguesResponse.data) {
          if (category.leagues) {
            eredivisie = category.leagues.find(league => 
              league.competition_name?.toLowerCase().includes('eredivisie') &&
              league.gender === 'M' // We want the men's league
            );
            if (eredivisie) break;
          }
        }
        
        if (eredivisie) {
          console.log(`🎯 EREDIVISIE FOUND!`);
          console.log(`League ID: ${eredivisie.league_id}`);
          console.log(`Competition Name: ${eredivisie.competition_name}`);
          console.log(`Gender: ${eredivisie.gender}`);
          console.log(`Tier: ${eredivisie.tier}`);
          console.log(`First Season: ${eredivisie.first_season}`);
          console.log(`Last Season: ${eredivisie.last_season}`);
          
          // Now get team stats for Eredivisie
          console.log(`\n📊 Getting team stats for Eredivisie...`);
          const testSeasonId = '2023-2024'; // Use 2023-2024 as it's more likely to have data
          
          try {
            const statsResponse = await makeApiRequest('/team-season-stats', {
              league_id: eredivisie.league_id,
              season_id: testSeasonId
            }, apiKey);
            
            if (statsResponse.data && statsResponse.data.length > 0) {
              const teamNames = statsResponse.data.map(team => team.meta_data?.team_name || 'Unknown');
              console.log(`✅ Found ${statsResponse.data.length} teams in Eredivisie:`, teamNames);
              
              // Show sample stats structure
              const sampleTeam = statsResponse.data[0];
              if (sampleTeam.stats) {
                console.log(`Stats fields: ${Object.keys(sampleTeam.stats).join(', ')}`);
                
                // Look for xG fields
                const xgFields = Object.keys(sampleTeam.stats).filter(key => 
                  key.toLowerCase().includes('xg') || key.toLowerCase().includes('expected')
                );
                console.log(`xG fields found: ${xgFields.join(', ')}`);
                
                // Show sample stats data
                console.log('Sample stats data:');
                console.log(JSON.stringify(sampleTeam.stats, null, 2).substring(0, 1000) + '...');
              }
              
              return { 
                leagueId: eredivisie.league_id, 
                teamNames, 
                data: statsResponse.data,
                leagueInfo: eredivisie
              };
            }
          } catch (error) {
            console.log(`❌ Failed to get team stats for Eredivisie:`, error.message);
          }
                 } else {
           console.log('❌ Eredivisie not found in Netherlands leagues');
           console.log('Available leagues:');
           leaguesResponse.data.forEach(category => {
             console.log(`\n${category.league_type}:`);
             if (category.leagues) {
               category.leagues.forEach(league => {
                 console.log(`- ${league.competition_name} (ID: ${league.league_id}, Gender: ${league.gender}, Tier: ${league.tier})`);
               });
             }
           });
         }
      }
      
    } catch (error) {
      console.log(`❌ Failed to get leagues for Netherlands:`, error.message);
    }
    
    console.log('\n❌ Eredivisie not found in tested league IDs');
    return null;
    
  } catch (error) {
    console.error('\n💥 Error finding Eredivisie:', error.message);
    return null;
  }
}

// Run the search
if (require.main === module) {
  findEredivisie().then(result => {
    if (result) {
      console.log('\n🎉 Successfully found Eredivisie!');
      console.log(`League ID: ${result.leagueId}`);
      console.log(`Teams: ${result.teamNames.join(', ')}`);
    } else {
      console.log('\n💥 Could not find Eredivisie');
    }
  });
} 