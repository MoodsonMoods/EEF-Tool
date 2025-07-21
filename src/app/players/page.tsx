'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { Player, Team, PlayersResponse, TeamsResponse } from '@/types';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [position, setPosition] = useState('');
  const [team, setTeam] = useState('');
  const [sortBy, setSortBy] = useState('totalPoints');
  const [search, setSearch] = useState('');

  // Load teams for filter dropdown
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetch('/api/teams');
        const data: TeamsResponse = await response.json();
        
        if (data.success) {
          setTeams(data.data);
        } else {
          setError('Failed to load teams');
        }
      } catch (err) {
        setError('Failed to load teams');
      }
    };

    loadTeams();
  }, []);

  // Load players with filters
  useEffect(() => {
    const loadPlayers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (position) params.append('position', position);
        if (team) params.append('team', team);
        if (sortBy) params.append('sortBy', sortBy);
        if (search) params.append('search', search);
        
        const response = await fetch(`/api/players?${params.toString()}`);
        const data: PlayersResponse = await response.json();
        
        if (data.success) {
          setPlayers(data.data);
        } else {
          setError('Failed to load players');
        }
      } catch (err) {
        setError('Failed to load players');
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [position, team, sortBy, search]);

  // Get position name from element type
  const getPositionName = (elementType: number) => {
    const positionMap: Record<number, string> = {
      1: 'GK',
      2: 'DEF', 
      3: 'MID',
      4: 'FWD'
    };
    return positionMap[elementType] || 'Unknown';
  };

  // Format price
  const formatPrice = (price: number) => {
    return `€${(price / 10).toFixed(1)}M`;
  };

  // Format percentage
  const formatPercentage = (percent: number) => {
    return `${percent.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Player Analysis</h1>
          <p className="mt-2 text-gray-600">
            Explore player statistics, performance metrics, and advanced analytics
          </p>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-0 mb-6">
          <div className="card">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  id="position"
                  className="input-field"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option value="">All Positions</option>
                  <option value="GK">Goalkeeper</option>
                  <option value="DEF">Defender</option>
                  <option value="MID">Midfielder</option>
                  <option value="FWD">Forward</option>
                </select>
              </div>

              <div>
                <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
                  Team
                </label>
                <select
                  id="team"
                  className="input-field"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                >
                  <option value="">All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  id="sort"
                  className="input-field"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="totalPoints">Total Points</option>
                  <option value="form">Form</option>
                  <option value="nowCost">Price</option>
                  <option value="selectedByPercent">Ownership</option>
                  <option value="valueSeason">Value</option>
                  <option value="pointsPerGame">Points per Game</option>
                  <option value="goalsScored">Goals</option>
                  <option value="assists">Assists</option>
                  <option value="cleanSheets">Clean Sheets</option>
                  <option value="bonus">Bonus</option>
                </select>
              </div>

              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  className="input-field"
                  placeholder="Player name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Player Table */}
        <div className="px-4 sm:px-0">
          <div className="card">
            {error && (
              <div className="text-center py-8">
                <div className="text-red-600 mb-2">Error: {error}</div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="btn-primary"
                >
                  Retry
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Loading player data...</h3>
              </div>
            )}

            {!loading && !error && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Player</th>
                      <th className="table-header">Team</th>
                      <th className="table-header">Position</th>
                      <th className="table-header">Price</th>
                      <th className="table-header">Total Points</th>
                      <th className="table-header">Form</th>
                      <th className="table-header">Ownership</th>
                      <th className="table-header">Goals</th>
                      <th className="table-header">Assists</th>
                      <th className="table-header">Clean Sheets</th>
                      <th className="table-header">Bonus</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {players.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-500">
                                  {player.firstName.charAt(0)}{player.secondName.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{player.webName}</div>
                              <div className="text-sm text-gray-500">{player.firstName} {player.secondName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell text-sm text-gray-900">{player.team.name}</td>
                        <td className="table-cell text-sm text-gray-900">{getPositionName(player.elementType)}</td>
                        <td className="table-cell text-sm text-gray-900">{formatPrice(player.nowCost)}</td>
                        <td className="table-cell text-sm text-gray-900">{player.totalPoints}</td>
                        <td className="table-cell text-sm text-gray-900">{player.form}</td>
                        <td className="table-cell text-sm text-gray-900">{formatPercentage(player.selectedByPercent)}</td>
                        <td className="table-cell text-sm text-gray-900">{player.goalsScored}</td>
                        <td className="table-cell text-sm text-gray-900">{player.assists}</td>
                        <td className="table-cell text-sm text-gray-900">{player.cleanSheets}</td>
                        <td className="table-cell text-sm text-gray-900">{player.bonus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {players.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <h3 className="text-sm font-medium text-gray-900">No players found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your filters.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 