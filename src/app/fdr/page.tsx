'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { usePreferences } from '@/lib/store';
import { FDRCalculator } from '@/lib/fdr-calculator';
import TeamFDRCard from '@/components/TeamFDRCard';

interface TeamFDRData {
  teamId: number;
  teamName: string;
  attackFDR: number;
  defenceFDR: number;
  xGFor: number;
  xGConceded: number;
  rank: number;
}

export default function FDRPage() {
  const { language } = usePreferences();
  const [attackFDR, setAttackFDR] = useState<TeamFDRData[]>([]);
  const [defenceFDR, setDefenceFDR] = useState<TeamFDRData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHorizon, setSelectedHorizon] = useState(5);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    calculateFDR();
  }, [selectedHorizon]);

  const calculateFDR = async () => {
    setLoading(true);
    
    try {
      // Fetch FDR data from API
      const fdrResponse = await fetch(`/api/fdr?horizon=${selectedHorizon}`);
      const fdrData = await fdrResponse.json();
      
      if (!fdrData.success) {
        throw new Error('Failed to fetch FDR data');
      }

      setAttackFDR(fdrData.data.attack);
      setDefenceFDR(fdrData.data.defence);
    } catch (error) {
      console.error('Error calculating FDR:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFDRColorClass = (fdr: number) => {
    return FDRCalculator.getFDRColorClass(fdr);
  };

  const getFDRLabel = (fdr: number) => {
    return FDRCalculator.getFDRLabel(fdr);
  };

  const labels = {
    title: { en: 'Fixture Difficulty Rating (FDR)', nl: 'Wedstrijd Moeilijkheidsgraad (FDR)' },
    subtitle: { en: 'Based on 2024-2025 season xG and xGC data', nl: 'Gebaseerd op 2024-2025 seizoen xG en xGC data' },
    attackTitle: { en: 'Attack FDR', nl: 'Aanval FDR' },
    defenceTitle: { en: 'Defence FDR', nl: 'Verdediging FDR' },
    team: { en: 'Team', nl: 'Team' },
    difficulty: { en: 'Difficulty', nl: 'Moeilijkheid' },
    xGFor: { en: 'xG For', nl: 'xG Voor' },
    xGConceded: { en: 'xG Conceded', nl: 'xG Tegen' },
    horizon: { en: 'Horizon', nl: 'Horizon' },
    loading: { en: 'Loading FDR data...', nl: 'FDR data laden...' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">{labels.loading[language]}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">
            {labels.title[language]}
          </h1>
          <p className="mt-2 text-gray-600">
            {labels.subtitle[language]}
          </p>
        </div>

        {/* Controls */}
        <div className="px-4 sm:px-0 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                {labels.horizon[language]}:
              </label>
              <select
                value={selectedHorizon}
                onChange={(e) => setSelectedHorizon(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={3}>3 GW</option>
                <option value={5}>5 GW</option>
                <option value={8}>8 GW</option>
                <option value={10}>10 GW</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  viewMode === 'table'
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  viewMode === 'cards'
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* FDR Content */}
        <div className="px-4 sm:px-0">
          {viewMode === 'table' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Attack FDR */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {labels.attackTitle[language]}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.team[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.difficulty[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.xGFor[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.xGConceded[language]}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attackFDR.map((team, index) => (
                      <tr key={team.teamId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {team.rank}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {team.teamName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFDRColorClass(team.attackFDR)}`}>
                            {getFDRLabel(team.attackFDR)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.xGFor.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.xGConceded.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Defence FDR */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {labels.defenceTitle[language]}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.team[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.difficulty[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.xGFor[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.xGConceded[language]}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {defenceFDR.map((team, index) => (
                      <tr key={team.teamId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {team.rank}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {team.teamName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFDRColorClass(team.defenceFDR)}`}>
                            {getFDRLabel(team.defenceFDR)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.xGFor.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.xGConceded.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Attack FDR Cards */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {labels.attackTitle[language]}
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {attackFDR.map((team) => (
                    <TeamFDRCard
                      key={team.teamId}
                      team={team}
                      type="attack"
                      showDetails={true}
                    />
                  ))}
                </div>
              </div>

              {/* Defence FDR Cards */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {labels.defenceTitle[language]}
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {defenceFDR.map((team) => (
                    <TeamFDRCard
                      key={team.teamId}
                      team={team}
                      type="defence"
                      showDetails={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">FDR Legend</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                  Very Easy
                </span>
                <span className="text-sm text-gray-600">1</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                  Easy
                </span>
                <span className="text-sm text-gray-600">2</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                  Medium
                </span>
                <span className="text-sm text-gray-600">3</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-orange-100 text-orange-800 border-orange-200">
                  Hard
                </span>
                <span className="text-sm text-gray-600">4</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                  Very Hard
                </span>
                <span className="text-sm text-gray-600">5</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 