'use client';

import { useState } from 'react';
import { UserTeamResponse, SquadSlot, Position } from '@/types';
import { getPositionFromElementType } from '@/lib/utils';

interface UserTeamLoaderProps {
  onLoadTeam: (players: SquadSlot[], budget: number) => void;
  onError: (error: string) => void;
}

export default function UserTeamLoader({ onLoadTeam, onError }: UserTeamLoaderProps) {
  const [showForm, setShowForm] = useState(false);

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="btn-primary flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Import Team
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Import Team from ESPN EEF</h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">Team Import Feature</h4>
          <p className="text-sm text-blue-800 mb-3">
            The automatic team import feature is not available in this version. 
            You can manually build your team by selecting players from the player list below.
          </p>
          <div className="text-xs text-blue-700">
            <p><strong>To manually import your team:</strong></p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Go to the Players page to see all available players</li>
              <li>Use the search and filter options to find your players</li>
              <li>Click on players to add them to your squad</li>
              <li>Arrange them in your preferred formation</li>
            </ol>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(false)}
            className="btn-primary flex-1"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
} 