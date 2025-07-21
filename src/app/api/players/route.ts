import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Player, PlayersResponse } from '@/types';

// Load normalized data
function loadNormalizedData() {
  const dataPath = path.join(process.cwd(), 'data', 'internal', 'players.json');
  
  if (!fs.existsSync(dataPath)) {
    throw new Error('Normalized data not found. Run normalize first.');
  }
  
  return JSON.parse(fs.readFileSync(dataPath, 'utf8')) as Player[];
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
    let aValue: any = a[sortBy as keyof Player];
    let bValue: any = b[sortBy as keyof Player];
    
    // Handle numeric values
    if (typeof aValue === 'string' && !isNaN(parseFloat(aValue))) {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
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
    const { searchParams } = new URL(request.url);
    
    // Load players data
    const players = loadNormalizedData();
    
    // Apply filters
    let filteredPlayers = filterPlayers(players, searchParams);
    
    // Apply sorting
    filteredPlayers = sortPlayers(filteredPlayers, searchParams);
    
    // Get total count before pagination
    const totalCount = filteredPlayers.length;
    
    // Apply pagination
    filteredPlayers = paginatePlayers(filteredPlayers, searchParams);
    
    // Create response
    const response: PlayersResponse = {
      data: filteredPlayers,
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      meta: {
        total: totalCount,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '50'),
        totalPages: Math.ceil(totalCount / parseInt(searchParams.get('limit') || '50'))
      }
    };
    
    return NextResponse.json(response);
    
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
      { status: 500 }
    );
  }
} 