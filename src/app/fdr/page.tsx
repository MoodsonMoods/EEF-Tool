'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { usePreferences } from '@/lib/store';
import { FDRCalculator } from '@/lib/fdr-calculator';
import TeamFDRCard from '@/components/TeamFDRCard';
import { Event } from '@/types';

interface TeamFDRData {
  teamId: number;
  teamName: string;
  attackFDR: number;
  defenceFDR: number;
  xGFor: number;
  xGConceded: number;
  rank: number;
}

interface TeamSchedule {
  teamId: number;
  teamName: string;
  fixtures: Array<{
    fixtureId: number;
    event: number;
    kickoffTime: string;
    opponentId: number;
    opponentName: string;
    isHome: boolean;
    opponentAttackFDR: number;
    opponentDefenceFDR: number;
  }>;
  averageAttackFDR: number;
  averageDefenceFDR: number;
  attackFDRRank: number;
  defenceFDRRank: number;
}

type SortField = 'rank' | 'difficulty' | 'xGFor' | 'xGConceded';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function FDRPage() {
  const { language } = usePreferences();
  const [attackFDR, setAttackFDR] = useState<TeamFDRData[]>([]);
  const [defenceFDR, setDefenceFDR] = useState<TeamFDRData[]>([]);
  const [teamSchedules, setTeamSchedules] = useState<TeamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHorizon, setSelectedHorizon] = useState(5);
  const [selectedStartGameweek, setSelectedStartGameweek] = useState(1);
  const [events, setEvents] = useState<Event[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeTab, setActiveTab] = useState<'fdr' | 'schedules'>('fdr');
  const [attackSort, setAttackSort] = useState<SortConfig>({ field: 'rank', direction: 'asc' });
  const [defenceSort, setDefenceSort] = useState<SortConfig>({ field: 'rank', direction: 'asc' });
  const [schedulesSort, setSchedulesSort] = useState<'attack' | 'defence'>('attack');

  useEffect(() => {
    // Fetch events to determine current gameweek
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events/');
        const data = await response.json();
        if (data.success) {
          setEvents(data.data);
          
          // Find the next gameweek (current gameweek)
          const nextEvent = data.data.find((event: Event) => event.isNext);
          const currentGameweek = nextEvent ? nextEvent.id : 1;
          
          // Load saved preferences from localStorage, or use current gameweek as default
          const savedStartGameweek = localStorage.getItem('fdrStartGameweek');
          if (savedStartGameweek) {
            setSelectedStartGameweek(parseInt(savedStartGameweek));
          } else {
            setSelectedStartGameweek(currentGameweek);
            localStorage.setItem('fdrStartGameweek', currentGameweek.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    
    fetchEvents();
  }, []);

  useEffect(() => {
    calculateFDR();
  }, [selectedHorizon, selectedStartGameweek]);

  const calculateFDR = async () => {
    setLoading(true);
    
    try {
      // Fetch FDR data from API using static endpoints
      const fdrResponse = await fetch(`/api/fdr/horizon/${selectedHorizon}`);
      const fdrData = await fdrResponse.json();
      
      if (!fdrData.success) {
        throw new Error('Failed to fetch FDR data');
      }

      setAttackFDR(fdrData.data.attack);
      setDefenceFDR(fdrData.data.defence);

      // Fetch team schedules from API using static endpoints
      const schedulesResponse = await fetch(`/api/schedules/horizon/${selectedHorizon}`);
      const schedulesData = await schedulesResponse.json();
      
      if (!schedulesData.success) {
        throw new Error('Failed to fetch schedules data');
      }

      setTeamSchedules(schedulesData.data.schedules);
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

  const sortData = (data: TeamFDRData[], sortConfig: SortConfig, fdrType: 'attack' | 'defence'): TeamFDRData[] => {
    return [...data].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.field) {
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'difficulty':
          aValue = fdrType === 'attack' ? a.attackFDR : a.defenceFDR;
          bValue = fdrType === 'attack' ? b.attackFDR : b.defenceFDR;
          break;
        case 'xGFor':
          aValue = a.xGFor;
          bValue = b.xGFor;
          break;
        case 'xGConceded':
          aValue = a.xGConceded;
          bValue = b.xGConceded;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  const handleSort = (field: SortField, fdrType: 'attack' | 'defence') => {
    const currentSort = fdrType === 'attack' ? attackSort : defenceSort;
    const setSort = fdrType === 'attack' ? setAttackSort : setDefenceSort;

    setSort({
      field,
      direction: currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSortIcon = (field: SortField, currentSort: SortConfig) => {
    if (currentSort.field !== field) {
      return '↕️';
    }
    return currentSort.direction === 'asc' ? '↑' : '↓';
  };

  const handleStartGameweekChange = (gameweek: number) => {
    // Validate that start gameweek + horizon doesn't exceed 38
    if (gameweek + selectedHorizon - 1 > 38) {
      alert(`Start gameweek ${gameweek} with horizon ${selectedHorizon} would exceed gameweek 38. Please reduce the horizon or choose an earlier start gameweek.`);
      return;
    }
    
    setSelectedStartGameweek(gameweek);
    localStorage.setItem('fdrStartGameweek', gameweek.toString());
  };

  const formatKickoffTime = (kickoffTime: string) => {
    const date = new Date(kickoffTime);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    startGameweek: { en: 'Start GW', nl: 'Start GW' },
    loading: { en: 'Loading FDR data...', nl: 'FDR data laden...' },
    schedules: { en: 'Team Schedules', nl: 'Team Schema\'s' },
    fdr: { en: 'FDR Ratings', nl: 'FDR Beoordelingen' },
    averageAttackFDR: { en: 'Avg Attack FDR', nl: 'Gem Aanval FDR' },
    averageDefenceFDR: { en: 'Avg Defence FDR', nl: 'Gem Verdediging FDR' },
    upcomingFixtures: { en: 'Upcoming Fixtures', nl: 'Aankomende Wedstrijden' },
    opponent: { en: 'Opponent', nl: 'Tegenstander' },
    gameweek: { en: 'GW', nl: 'GW' },
    home: { en: 'H', nl: 'T' },
    away: { en: 'A', nl: 'U' },
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
          <p className="mt-1 text-sm text-gray-500">
            Analyzing gameweeks {selectedStartGameweek} to {Math.min(selectedStartGameweek + selectedHorizon - 1, 38)} ({selectedHorizon} gameweeks)
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
                onChange={(e) => {
                  const newHorizon = Number(e.target.value);
                  // Validate that start gameweek + horizon doesn't exceed 38
                  if (selectedStartGameweek + newHorizon - 1 > 38) {
                    alert(`Start gameweek ${selectedStartGameweek} with horizon ${newHorizon} would exceed gameweek 38. Please reduce the horizon or choose an earlier start gameweek.`);
                    return;
                  }
                  setSelectedHorizon(newHorizon);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={3}>3 GW</option>
                <option value={5}>5 GW</option>
                <option value={8}>8 GW</option>
                <option value={10}>10 GW</option>
              </select>
              
              <label className="text-sm font-medium text-gray-700 ml-4">
                {labels.startGameweek[language]}:
              </label>
              <select
                value={selectedStartGameweek}
                onChange={(e) => handleStartGameweekChange(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                  <option key={gw} value={gw}>GW {gw}</option>
                ))}
              </select>
            </div>
            
            {activeTab === 'fdr' && (
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
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-0 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('fdr')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'fdr'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {labels.fdr[language]}
              </button>
              <button
                onClick={() => setActiveTab('schedules')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'schedules'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {labels.schedules[language]}
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-0">
          {activeTab === 'fdr' ? (
            viewMode === 'table' ? (
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
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('rank', 'attack')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Rank</span>
                          <span className="text-xs">{getSortIcon('rank', attackSort)}</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.team[language]}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('difficulty', 'attack')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{labels.difficulty[language]}</span>
                          <span className="text-xs">{getSortIcon('difficulty', attackSort)}</span>
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('xGFor', 'attack')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{labels.xGFor[language]}</span>
                          <span className="text-xs">{getSortIcon('xGFor', attackSort)}</span>
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('xGConceded', 'attack')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{labels.xGConceded[language]}</span>
                          <span className="text-xs">{getSortIcon('xGConceded', attackSort)}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortData(attackFDR, attackSort, 'attack').map((team, index) => (
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
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('rank', 'defence')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Rank</span>
                          <span className="text-xs">{getSortIcon('rank', defenceSort)}</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.team[language]}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('difficulty', 'defence')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{labels.difficulty[language]}</span>
                          <span className="text-xs">{getSortIcon('difficulty', defenceSort)}</span>
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('xGFor', 'defence')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{labels.xGFor[language]}</span>
                          <span className="text-xs">{getSortIcon('xGFor', defenceSort)}</span>
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('xGConceded', 'defence')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{labels.xGConceded[language]}</span>
                          <span className="text-xs">{getSortIcon('xGConceded', defenceSort)}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortData(defenceFDR, defenceSort, 'defence').map((team, index) => (
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
                  {sortData(attackFDR, attackSort, 'attack').map((team) => (
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
                  {sortData(defenceFDR, defenceSort, 'defence').map((team) => (
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
          )
          ) : (
            /* Team Schedules Section */
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {labels.upcomingFixtures[language]}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <button
                    onClick={() => setSchedulesSort('attack')}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      schedulesSort === 'attack'
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Attack FDR
                  </button>
                  <button
                    onClick={() => setSchedulesSort('defence')}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      schedulesSort === 'defence'
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Defence FDR
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.team[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.averageAttackFDR[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.averageDefenceFDR[language]}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {labels.upcomingFixtures[language]}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamSchedules
                      .sort((a, b) => {
                        if (schedulesSort === 'attack') {
                          return a.averageAttackFDR - b.averageAttackFDR;
                        } else {
                          return a.averageDefenceFDR - b.averageDefenceFDR;
                        }
                      })
                      .map((schedule, index) => (
                      <tr key={schedule.teamId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {schedule.teamName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFDRColorClass(Math.round(schedule.averageAttackFDR))}`}>
                              {getFDRLabel(Math.round(schedule.averageAttackFDR))}
                            </span>
                            <span className="text-sm text-gray-600">
                              {schedule.averageAttackFDR.toFixed(1)} (Rank {schedule.attackFDRRank})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFDRColorClass(Math.round(schedule.averageDefenceFDR))}`}>
                              {getFDRLabel(Math.round(schedule.averageDefenceFDR))}
                            </span>
                            <span className="text-sm text-gray-600">
                              {schedule.averageDefenceFDR.toFixed(1)} (Rank {schedule.defenceFDRRank})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="space-y-1">
                            {schedule.fixtures.length === 0 ? (
                              <span className="text-xs text-gray-500">No upcoming fixtures</span>
                            ) : (
                              schedule.fixtures.slice(0, Math.max(5, selectedHorizon)).map((fixture) => (
                               <div key={fixture.fixtureId} className="flex items-center space-x-2">
                                 <span className="text-xs text-gray-500">
                                   {labels.gameweek[language]} {fixture.event}
                                 </span>
                                 <span className="text-xs font-medium">
                                   {fixture.isHome ? labels.home[language] : labels.away[language]}
                                 </span>
                                 <span className="text-sm">
                                   {fixture.opponentName}
                                 </span>
                                 <span className="text-xs text-gray-500">
                                   {formatKickoffTime(fixture.kickoffTime)}
                                 </span>
                                 <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getFDRColorClass(fixture.opponentAttackFDR)}`}>
                                   A:{fixture.opponentAttackFDR}
                                 </span>
                                 <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getFDRColorClass(fixture.opponentDefenceFDR)}`}>
                                   D:{fixture.opponentDefenceFDR}
                                 </span>
                               </div>
                             ))
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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