import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Player, PlayersResponse } from '@/types';

// Allow dynamic processing for filtering and sorting
export const dynamic = 'force-dynamic';

// Load normalized data
function loadNormalizedData() {
  const dataPath = path.join(process.cwd(), 'data', 'internal', 'players.json');
  
  console.log('🔍 Loading data from:', dataPath);
  console.log('🔍 Current working directory:', process.cwd());
  console.log('🔍 File exists:', fs.existsSync(dataPath));
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Data file not found at:', dataPath);
    throw new Error(`Normalized data not found at ${dataPath}. Run normalize first.`);
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as Player[];
  console.log('✅ Loaded', data.length, 'players');
  console.log('✅ Sample player points:', data.slice(0, 5).map(p => `${p.webName}: ${p.totalPoints}`));
  
  return data;
}

// Filter players based on query parameters
function filterPlayers(players: Player[], searchParams: URLSearchParams): Player[] {
  let filtered = [...players];
  
  // Filter by position
  const position = searchParams.get('position');
  if (position) {
    const positionMap: Record<string, number> = {
      'GK': 1,
      'DEF': 2,
      'MID': 3,
      'FWD': 4
    };
    const elementType = positionMap[position];
    if (elementType) {
      filtered = filtered.filter(player => player.elementType === elementType);
    }
  }
  
  // Filter by team
  const team = searchParams.get('team');
  if (team) {
    const teamId = parseInt(team);
    if (!isNaN(teamId)) {
      filtered = filtered.filter(player => player.team.id === teamId);
    }
  }
  
  // Filter by price range
  const minPrice = searchParams.get('minPrice');
  if (minPrice) {
    const min = parseInt(minPrice);
    if (!isNaN(min)) {
      filtered = filtered.filter(player => player.nowCost >= min);
    }
  }
  
  const maxPrice = searchParams.get('maxPrice');
  if (maxPrice) {
    const max = parseInt(maxPrice);
    if (!isNaN(max)) {
      filtered = filtered.filter(player => player.nowCost <= max);
    }
  }
  
  // Filter by search term
  const search = searchParams.get('search');
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(player => 
      player.firstName.toLowerCase().includes(searchLower) ||
      player.secondName.toLowerCase().includes(searchLower) ||
      player.webName.toLowerCase().includes(searchLower) ||
      player.team.name.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
}

// Sort players
function sortPlayers(players: Player[], searchParams: URLSearchParams): Player[] {
  const sortBy = searchParams.get('sortBy') || 'totalPoints';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  const sorted = [...players].sort((a, b) => {
    const aValue = a[sortBy as keyof Player];
    const bValue = b[sortBy as keyof Player];
    
    // Handle numeric values
    const aNum = typeof aValue === 'number' ? aValue : parseFloat(String(aValue));
    const bNum = typeof bValue === 'number' ? bValue : parseFloat(String(bValue));
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
    // Handle string values
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

// Paginate results
function paginatePlayers(players: Player[], searchParams: URLSearchParams): Player[] {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const start = (page - 1) * limit;
  const end = start + limit;
  
  return players.slice(start, end);
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 API request received:', request.nextUrl.toString());
    
    // Load players data
    const players = loadNormalizedData();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    console.log('🔍 Query params:', Object.fromEntries(searchParams.entries()));
    
    // Apply filters
    let filteredPlayers = filterPlayers(players, searchParams);
    console.log('🔍 After filtering:', filteredPlayers.length, 'players');
    
    // Apply sorting
    filteredPlayers = sortPlayers(filteredPlayers, searchParams);
    console.log('🔍 After sorting, top 3 players:', filteredPlayers.slice(0, 3).map(p => `${p.webName}: ${p.totalPoints}`));
    
    // Apply pagination
    const paginatedPlayers = paginatePlayers(filteredPlayers, searchParams);
    console.log('🔍 After pagination:', paginatedPlayers.length, 'players');
    
    // Create response
    const response: PlayersResponse = {
      data: paginatedPlayers,
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      meta: {
        total: filteredPlayers.length,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '50'),
        totalPages: Math.ceil(filteredPlayers.length / parseInt(searchParams.get('limit') || '50'))
      }
    };
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 