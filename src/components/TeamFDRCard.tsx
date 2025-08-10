'use client';

import { FDRCalculator } from '@/lib/fdr-calculator';

interface TeamFDRCardProps {
  team: {
    teamId: number;
    teamName: string;
    attackFDR: number;
    defenceFDR: number;
    xGFor: number;
    xGConceded: number;
    rank: number;
  };
  type: 'attack' | 'defence';
  showDetails?: boolean;
}

export default function TeamFDRCard({ team, type, showDetails = false }: TeamFDRCardProps) {
  const fdr = type === 'attack' ? team.attackFDR : team.defenceFDR;
  const roundedFdr = Math.round(fdr);
  const colorClass = FDRCalculator.getFDRColorClass(roundedFdr);
  const label = FDRCalculator.getFDRLabel(roundedFdr);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-700">{team.rank}</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{team.teamName}</h3>
            <p className="text-xs text-gray-500">Rank #{team.rank}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
            {label}
          </span>
          <p className="text-xs text-gray-500 mt-1">FDR {fdr}</p>
        </div>
      </div>

      {showDetails && (
        <div className="border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500">xG For</p>
              <p className="font-medium text-gray-900">{team.xGFor.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">xG Conceded</p>
              <p className="font-medium text-gray-900">{team.xGConceded.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Attack FDR</p>
              <p className="font-medium text-gray-900">{team.attackFDR}</p>
            </div>
            <div>
              <p className="text-gray-500">Defence FDR</p>
              <p className="font-medium text-gray-900">{team.defenceFDR}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 