import { useState, useEffect } from 'react';
import { Player, Position } from '@/types';
import { FixtureService, PlayerFixture } from '@/lib/fixture-service';
import { getPositionFromElementType } from '@/lib/utils';

interface PlayerFixturePopupProps {
  player: Player | null;
  currentGameweek: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerFixturePopup({ 
  player, 
  currentGameweek, 
  isOpen, 
  onClose 
}: PlayerFixturePopupProps) {
  const [fixtures, setFixtures] = useState<PlayerFixture[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && player) {
      fetchPlayerFixtures();
    }
  }, [isOpen, player, currentGameweek]);

  const fetchPlayerFixtures = async () => {
    if (!player) return;
    
    setLoading(true);
    try {
      const position = getPositionFromElementType(player.elementType);
      const playerFixtures: PlayerFixture[] = [];
      
      // Get next 5 fixtures starting from current gameweek
      for (let i = 0; i < 5; i++) {
        const gameweek = currentGameweek + i;
        
        // Try synchronous version first (uses cache)
        let fixture = FixtureService.getCurrentFixtureForPlayerSync(
          player.team.id, 
          gameweek, 
          position
        );
        
        // Fallback to async version if cache miss
        if (!fixture) {
          fixture = await FixtureService.getCurrentFixtureForPlayer(
            player.team.id, 
            gameweek, 
            position
          );
        }
        
        if (fixture) {
          playerFixtures.push(fixture);
        }
      }
      
      setFixtures(playerFixtures);
    } catch (error) {
      console.error('Error fetching player fixtures:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: PlayerFixture['difficulty']) => {
    switch (difficulty) {
      case 'VERY_EASY': return 'bg-green-100 text-green-800 border-green-200';
      case 'EASY': return 'bg-lime-100 text-lime-800 border-lime-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HARD': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'VERY_HARD': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyText = (difficulty: PlayerFixture['difficulty']) => {
    switch (difficulty) {
      case 'VERY_EASY': return 'Very Easy';
      case 'EASY': return 'Easy';
      case 'MEDIUM': return 'Medium';
      case 'HARD': return 'Hard';
      case 'VERY_HARD': return 'Very Hard';
      default: return 'Unknown';
    }
  };

  const formatKickoffTime = (kickoffTime: string) => {
    const date = new Date(kickoffTime);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{player.webName}</h2>
            <p className="text-sm text-gray-600">{player.team.name} • {getPositionFromElementType(player.elementType)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-md font-medium text-gray-900 mb-3">
            Next 5 Fixtures (from GW{currentGameweek})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming fixtures found for this player.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fixtures.map((fixture, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        GW{fixture.gameweek}
                      </span>
                      <span className="text-sm text-gray-600">
                        {fixture.isHome ? 'vs' : '@'} {fixture.opponent}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(fixture.difficulty)}`}>
                      {getDifficultyText(fixture.difficulty)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatKickoffTime(fixture.kickoffTime)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 