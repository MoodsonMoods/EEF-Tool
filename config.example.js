// Example configuration for EEF Tool 2.0
// Copy this file to config.js and update with your settings

module.exports = {
  // ESPN EEF Configuration
  espn: {
    leagueId: '123456', // Your league ID
    season: '2024',
    gameType: 'soccer',
    baseUrl: 'https://fantasy.espngoal.nl/api'
  },
  
  // Data Processing
  data: {
    updateInterval: 7200000, // 2 hours in milliseconds
    maxRetries: 3,
    rawDataRetention: 7 // days
  },
  
  // API Configuration
  api: {
    baseUrl: 'http://localhost:3000/api',
    timeout: 10000,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  
  // Build Configuration
  build: {
    staticExport: true,
    optimizeImages: true,
    compressOutput: true
  }
}; 