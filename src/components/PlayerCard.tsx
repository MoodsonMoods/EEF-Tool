import { SquadSlot, Player } from '@/types';

interface PlayerCardProps {
  slot: SquadSlot;
  player?: Player;
  isBench?: boolean;
  onRemove?: (playerId: number) => void;
  onSetCaptain?: (playerId: number) => void;
  onSetViceCaptain?: (playerId: number) => void;
  onMoveToBench?: (playerId: number) => void;
  onMoveToStartingXI?: (playerId: number) => void;
  onViewFixtures?: (player: Player) => void;
  fixture?: any;
}

export default function PlayerCard({ 
  slot, 
  player, 
  isBench = false, 
  onRemove,
  onSetCaptain,
  onSetViceCaptain,
  onMoveToBench,
  onMoveToStartingXI,
  onViewFixtures,
  fixture
}: PlayerCardProps) {
  if (!player) {
    return (
      <div className={`player-slot ${isBench ? 'bench-slot' : 'starting-slot'} empty`}>
        <div className="empty-slot">
          <span className="position-label">{slot.position}</span>
          <span className="empty-text">Empty</span>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'VERY_EASY': return 'bg-green-100 text-green-800';
      case 'EASY': return 'bg-lime-100 text-lime-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HARD': return 'bg-orange-100 text-orange-800';
      case 'VERY_HARD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'VERY_EASY': return 'Very Easy';
      case 'EASY': return 'Easy';
      case 'MEDIUM': return 'Medium';
      case 'HARD': return 'Hard';
      case 'VERY_HARD': return 'Very Hard';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`player-card ${isBench ? 'bench-player' : 'starting-player'}`}>
      <div className="player-header">
        <div className="player-info">
          <div className="player-name">
            {player.webName}
            {slot.isCaptain && <span className="captain-badge">C</span>}
            {slot.isViceCaptain && <span className="vice-captain-badge">VC</span>}
          </div>
          <div className="player-details">
            <span className="team-name">{player.team.name}</span>
            <span className="position">{slot.position}</span>
          </div>
        </div>
        <div className="player-actions">
          {onRemove && (
            <button 
              onClick={() => onRemove(player.id)}
              className="remove-btn"
              title="Remove player"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      <div className="player-stats">
        <div className="stat-row">
          <span className="stat-label">Price:</span>
          <span className="stat-value">€{(player.nowCost / 10).toFixed(1)}M</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Points:</span>
          <span className="stat-value">{player.totalPoints}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Form:</span>
          <span className="stat-value">{player.form}</span>
        </div>
      </div>

      {fixture && (
        <div className="fixture-info">
          <div className={`difficulty-badge ${getDifficultyColor(fixture.difficulty)}`}>
            {getDifficultyText(fixture.difficulty)}
          </div>
          <div className="fixture-details">
            <span className="opponent">
              {fixture.isHome ? 'vs' : '@'} {fixture.opponent}
            </span>
            <span className="gameweek">GW{fixture.gameweek}</span>
          </div>
        </div>
      )}

      {!isBench && onMoveToBench && (
        <button 
          onClick={() => onMoveToBench(player.id)}
          className="move-btn"
          title="Move to bench"
        >
          ↓ Bench
        </button>
      )}
      
      {isBench && onMoveToStartingXI && (
        <button 
          onClick={() => onMoveToStartingXI(player.id)}
          className="move-btn"
          title="Move to starting XI"
        >
          ↑ Starting XI
        </button>
      )}

      {!slot.isCaptain && !slot.isViceCaptain && onSetCaptain && (
        <button 
          onClick={() => onSetCaptain(player.id)}
          className="captain-btn"
          title="Set as captain"
        >
          Set Captain
        </button>
      )}

      {!slot.isCaptain && !slot.isViceCaptain && onSetViceCaptain && (
        <button 
          onClick={() => onSetViceCaptain(player.id)}
          className="vice-captain-btn"
          title="Set as vice captain"
        >
          Set VC
        </button>
      )}

      {onViewFixtures && (
        <button 
          onClick={() => onViewFixtures(player)}
          className="fixtures-btn"
          title="View upcoming fixtures"
        >
          View Fixtures
        </button>
      )}
    </div>
  );
} 