import { Formation } from '@/types';

interface FormationSelectorProps {
  currentFormation: Formation;
  onFormationChange: (formation: Formation) => void;
  disabled?: boolean;
}

export default function FormationSelector({ 
  currentFormation, 
  onFormationChange, 
  disabled = false 
}: FormationSelectorProps) {
  const handleFormationChange = (position: keyof Formation, value: number) => {
    const newFormation = { ...currentFormation, [position]: value };
    
    // Validate total players = 11
    const total = newFormation.gk + newFormation.def + newFormation.mid + newFormation.fwd;
    if (total !== 11) return;
    
    onFormationChange(newFormation);
  };

  const total = currentFormation.gk + currentFormation.def + currentFormation.mid + currentFormation.fwd;

  return (
    <div className="formation-selector">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Formation</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="formation-control">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Goalkeepers
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFormationChange('gk', Math.max(1, currentFormation.gk - 1))}
              disabled={disabled || currentFormation.gk <= 1}
              className="formation-btn"
            >
              -
            </button>
            <span className="formation-value">{currentFormation.gk}</span>
            <button
              onClick={() => handleFormationChange('gk', Math.min(2, currentFormation.gk + 1))}
              disabled={disabled || currentFormation.gk >= 2}
              className="formation-btn"
            >
              +
            </button>
          </div>
        </div>

        <div className="formation-control">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Defenders
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFormationChange('def', Math.max(3, currentFormation.def - 1))}
              disabled={disabled || currentFormation.def <= 3}
              className="formation-btn"
            >
              -
            </button>
            <span className="formation-value">{currentFormation.def}</span>
            <button
              onClick={() => handleFormationChange('def', Math.min(5, currentFormation.def + 1))}
              disabled={disabled || currentFormation.def >= 5}
              className="formation-btn"
            >
              +
            </button>
          </div>
        </div>

        <div className="formation-control">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Midfielders
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFormationChange('mid', Math.max(3, currentFormation.mid - 1))}
              disabled={disabled || currentFormation.mid <= 3}
              className="formation-btn"
            >
              -
            </button>
            <span className="formation-value">{currentFormation.mid}</span>
            <button
              onClick={() => handleFormationChange('mid', Math.min(5, currentFormation.mid + 1))}
              disabled={disabled || currentFormation.mid >= 5}
              className="formation-btn"
            >
              +
            </button>
          </div>
        </div>

        <div className="formation-control">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Forwards
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFormationChange('fwd', Math.max(1, currentFormation.fwd - 1))}
              disabled={disabled || currentFormation.fwd <= 1}
              className="formation-btn"
            >
              -
            </button>
            <span className="formation-value">{currentFormation.fwd}</span>
            <button
              onClick={() => handleFormationChange('fwd', Math.min(3, currentFormation.fwd + 1))}
              disabled={disabled || currentFormation.fwd >= 3}
              className="formation-btn"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="formation-summary">
        <div className={`total-players ${total === 11 ? 'valid' : 'invalid'}`}>
          Total: {total}/11 players
        </div>
        <div className="formation-display">
          {currentFormation.gk}-{currentFormation.def}-{currentFormation.mid}-{currentFormation.fwd}
        </div>
      </div>

      <style jsx>{`
        .formation-selector {
          @apply bg-white p-4 rounded-lg shadow-sm border;
        }
        
        .formation-control {
          @apply flex flex-col;
        }
        
        .formation-btn {
          @apply w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed;
        }
        
        .formation-value {
          @apply w-8 text-center font-medium text-gray-900;
        }
        
        .formation-summary {
          @apply flex justify-between items-center mt-4 pt-4 border-t border-gray-200;
        }
        
        .total-players {
          @apply text-sm font-medium;
        }
        
        .total-players.valid {
          @apply text-green-600;
        }
        
        .total-players.invalid {
          @apply text-red-600;
        }
        
        .formation-display {
          @apply text-lg font-bold text-gray-900;
        }
      `}</style>
    </div>
  );
} 