import { useState, useMemo } from 'react';
import React from 'react';
import { Player, Position } from '@/types';
import { getPositionFromElementType, formatPrice } from '@/lib/utils';

interface PlayerListProps {
  players: Player[];
  selectedPosition: Position | 'ALL';
  searchTerm: string;
  onPlayerSelect: (player: Player) => void;
  onViewFixtures?: (player: Player) => void;
  selectedPlayerIds: number[];
}

function PlayerList({ 
  players, 
  selectedPosition, 
  searchTerm, 
  onPlayerSelect,
  onViewFixtures,
  selectedPlayerIds 
}: PlayerListProps) {
  const [sortBy, setSortBy] = useState<'totalPoints' | 'nowCost' | 'form' | 'webName'>('totalPoints');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players.filter(player => {
      const matchesPosition = selectedPosition === 'ALL' || 
        getPositionFromElementType(player.elementType) === selectedPosition;
      
      const matchesSearch = player.webName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.secondName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesPosition && matchesSearch;
    });

    // Sort players
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [players, selectedPosition, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const isPlayerSelected = (playerId: number) => selectedPlayerIds.includes(playerId);

  return (
    <div className="player-list">
      <div className="player-list-header">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Players</h3>
        
        <div className="sort-controls mb-4">
          <div className="flex space-x-2">
            {(['totalPoints', 'nowCost', 'form', 'webName'] as const).map(field => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`sort-btn ${sortBy === field ? 'active' : ''}`}
              >
                {field === 'totalPoints' ? 'Points' : 
                 field === 'nowCost' ? 'Price' : 
                 field === 'form' ? 'Form' : 'Name'} {getSortIcon(field)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="player-grid">
        {filteredAndSortedPlayers.map(player => (
          <div
            key={player.id}
            className={`player-item ${isPlayerSelected(player.id) ? 'selected' : ''}`}
            onClick={() => onPlayerSelect(player)}
          >
            <div className="player-header">
              <div className="player-name">{player.webName}</div>
              <div className="player-position">{getPositionFromElementType(player.elementType)}</div>
            </div>
            
            <div className="player-team">{player.team.name}</div>
            
            <div className="player-stats">
              <div className="stat">
                <span className="stat-label">Price:</span>
                <span className="stat-value">{formatPrice(player.nowCost)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Points:</span>
                <span className="stat-value">{player.totalPoints}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Form:</span>
                <span className="stat-value">{player.form}</span>
              </div>
            </div>

            {isPlayerSelected(player.id) && (
              <div className="selected-indicator">✓ Selected</div>
            )}
            
            {onViewFixtures && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewFixtures(player);
                }}
                className="view-fixtures-btn"
                title="View upcoming fixtures"
              >
                View Fixtures
              </button>
            )}
          </div>
        ))}
      </div>

      {filteredAndSortedPlayers.length === 0 && (
        <div className="no-players">
          <p className="text-gray-500 text-center py-8">
            No players found matching your criteria.
          </p>
        </div>
      )}

      <style jsx>{`
        .player-list {
          @apply bg-white rounded-lg shadow-sm border;
        }
        
        .player-list-header {
          @apply p-4 border-b border-gray-200;
        }
        
        .sort-controls {
          @apply flex flex-wrap gap-2;
        }
        
        .sort-btn {
          @apply px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50;
        }
        
        .sort-btn.active {
          @apply bg-blue-50 border-blue-300 text-blue-700;
        }
        
        .player-grid {
          @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-h-96 overflow-y-auto;
        }
        
        .player-item {
          @apply p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all;
        }
        
        .player-item.selected {
          @apply border-blue-500 bg-blue-50;
        }
        
        .player-header {
          @apply flex justify-between items-start mb-2;
        }
        
        .player-name {
          @apply font-medium text-gray-900;
        }
        
        .player-position {
          @apply text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded;
        }
        
        .player-team {
          @apply text-sm text-gray-600 mb-2;
        }
        
        .player-stats {
          @apply space-y-1;
        }
        
        .stat {
          @apply flex justify-between text-sm;
        }
        
        .stat-label {
          @apply text-gray-500;
        }
        
        .stat-value {
          @apply font-medium text-gray-900;
        }
        
        .selected-indicator {
          @apply mt-2 text-sm text-blue-600 font-medium text-center;
        }
        
        .view-fixtures-btn {
          @apply mt-2 w-full px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors;
        }
        
        .no-players {
          @apply p-8;
        }
      `}</style>
    </div>
  );
}

export default React.memo(PlayerList); 