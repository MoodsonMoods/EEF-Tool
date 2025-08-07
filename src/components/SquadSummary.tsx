import { SquadSlot, Player } from '@/types';
import { formatPrice } from '@/lib/utils';

interface SquadSummaryProps {
  selectedPlayers: SquadSlot[];
  players: Player[];
  availableBudget: number;
  freeTransfers: number;
  transferCount: number;
  currentGameweek: number;
  totalGameweeks: number;
  onNextGameweek: () => void;
  onPreviousGameweek: () => void;
  canGoToNextGameweek: () => boolean;
  canGoToPreviousGameweek: () => boolean;
}

export default function SquadSummary({
  selectedPlayers,
  players,
  availableBudget,
  freeTransfers,
  transferCount,
  currentGameweek,
  totalGameweeks,
  onNextGameweek,
  onPreviousGameweek,
  canGoToNextGameweek,
  canGoToPreviousGameweek
}: SquadSummaryProps) {
  const getPlayerById = (playerId: number): Player | undefined => {
    return players.find(p => p.id === playerId);
  };

  const getTotalCost = () => {
    return selectedPlayers.reduce((total, slot) => {
      const player = getPlayerById(slot.playerId);
      return total + (player?.nowCost || 0);
    }, 0);
  };

  const getTotalPoints = () => {
    return selectedPlayers.reduce((total, slot) => {
      const player = getPlayerById(slot.playerId);
      return total + (player?.totalPoints || 0);
    }, 0);
  };

  const getTeamCounts = () => {
    const teamCounts: { [teamId: number]: number } = {};
    selectedPlayers.forEach(slot => {
      const player = getPlayerById(slot.playerId);
      if (player) {
        teamCounts[player.team.id] = (teamCounts[player.team.id] || 0) + 1;
      }
    });
    return teamCounts;
  };

  const getTeamName = (teamId: number) => {
    const player = players.find(p => p.team.id === teamId);
    return player?.team.name || 'Unknown Team';
  };

  const totalCost = getTotalCost();
  const totalPoints = getTotalPoints();
  const teamCounts = getTeamCounts();
  const remainingBudget = availableBudget - totalCost;

  return (
    <div className="squad-summary">
      <div className="summary-header">
        <h3 className="text-lg font-medium text-gray-900">Squad Summary</h3>
      </div>

      <div className="summary-stats">
        <div className="stat-row">
          <span className="stat-label">Total Cost:</span>
          <span className="stat-value">{formatPrice(totalCost)}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Remaining Budget:</span>
          <span className={`stat-value ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatPrice(remainingBudget)}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total Points:</span>
          <span className="stat-value">{totalPoints}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Players Selected:</span>
          <span className="stat-value">{selectedPlayers.length}/15</span>
        </div>
      </div>

      <div className="gameweek-controls">
        <div className="gameweek-info">
          <span className="gameweek-label">Gameweek:</span>
          <span className="gameweek-value">{currentGameweek}/{totalGameweeks}</span>
        </div>
        <div className="gameweek-buttons">
          <button
            onClick={onPreviousGameweek}
            disabled={!canGoToPreviousGameweek()}
            className="gameweek-btn"
          >
            ← Previous
          </button>
          <button
            onClick={onNextGameweek}
            disabled={!canGoToNextGameweek()}
            className="gameweek-btn"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="transfer-info">
        <div className="transfer-row">
          <span className="transfer-label">Free Transfers:</span>
          <span className="transfer-value">{freeTransfers}</span>
        </div>
        <div className="transfer-row">
          <span className="transfer-label">Transfers Made:</span>
          <span className="transfer-value">{transferCount}</span>
        </div>
      </div>

      {Object.keys(teamCounts).length > 0 && (
        <div className="team-breakdown">
          <h4 className="team-breakdown-title">Team Breakdown:</h4>
          <div className="team-list">
            {Object.entries(teamCounts).map(([teamId, count]) => (
              <div key={teamId} className="team-item">
                <span className="team-name">{getTeamName(parseInt(teamId))}</span>
                <span className="team-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .squad-summary {
          @apply bg-white p-4 rounded-lg shadow-sm border;
        }
        
        .summary-header {
          @apply mb-4 pb-2 border-b border-gray-200;
        }
        
        .summary-stats {
          @apply space-y-2 mb-4;
        }
        
        .stat-row {
          @apply flex justify-between items-center;
        }
        
        .stat-label {
          @apply text-sm text-gray-600;
        }
        
        .stat-value {
          @apply font-medium text-gray-900;
        }
        
        .gameweek-controls {
          @apply mb-4 p-3 bg-gray-50 rounded-lg;
        }
        
        .gameweek-info {
          @apply flex justify-between items-center mb-2;
        }
        
        .gameweek-label {
          @apply text-sm text-gray-600;
        }
        
        .gameweek-value {
          @apply font-medium text-gray-900;
        }
        
        .gameweek-buttons {
          @apply flex space-x-2;
        }
        
        .gameweek-btn {
          @apply px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed;
        }
        
        .transfer-info {
          @apply mb-4 p-3 bg-blue-50 rounded-lg;
        }
        
        .transfer-row {
          @apply flex justify-between items-center;
        }
        
        .transfer-label {
          @apply text-sm text-blue-700;
        }
        
        .transfer-value {
          @apply font-medium text-blue-900;
        }
        
        .team-breakdown {
          @apply pt-4 border-t border-gray-200;
        }
        
        .team-breakdown-title {
          @apply text-sm font-medium text-gray-700 mb-2;
        }
        
        .team-list {
          @apply space-y-1;
        }
        
        .team-item {
          @apply flex justify-between items-center text-sm;
        }
        
        .team-name {
          @apply text-gray-600;
        }
        
        .team-count {
          @apply font-medium text-gray-900;
        }
      `}</style>
    </div>
  );
} 