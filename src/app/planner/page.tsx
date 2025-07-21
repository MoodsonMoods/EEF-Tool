'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { usePlanner, useScenarios } from '@/lib/store';
import ScenarioList from '@/components/ScenarioList';
import { Player, Position, SquadSlot, Event, Team } from '@/types';
import { FormationValidator } from '@/lib/formation-validator';
import { FixtureService, PlayerFixture } from '@/lib/fixture-service';

export default function SquadPlanner() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<Position | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);
  const [fixtureServiceReady, setFixtureServiceReady] = useState(false);

  const {
    currentFormation,
    selectedPlayers,
    availableBudget,
    transferCount,
    currentGameweek,
    freeTransfers,
    transferHistory,
    setFormation,
    addPlayer,
    removePlayer,
    setCaptain,
    setViceCaptain,
    moveToBench,
    moveToStartingXI,
    setBudget,
    setTransferCount,
    setCurrentGameweek,
    nextGameweek,
    previousGameweek,
    validateSquad,
    autoPickTeam,
    makeTransfer,
    getFreeTransfersForGameweek,
    getTransferCost
  } = usePlanner();

  const { addScenario, loadScenario, updateScenario, scenarios, activeScenarioId } = useScenarios();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Set the current gameweek based on the events data once it's loaded
    if (events.length > 0 && fixtureServiceReady && currentGameweek === 1) {
      const nextEvent = events.find(event => event.isNext);
      if (nextEvent) {
        setCurrentGameweek(nextEvent.id);
      }
    }
  }, [events, fixtureServiceReady, currentGameweek, setCurrentGameweek]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch players, events, and teams in parallel
      const [playersResponse, eventsResponse, teamsResponse] = await Promise.all([
        fetch('/api/players/?limit=1000'),
        fetch('/api/events/'),
        fetch('/api/teams/')
      ]);

      const playersData = await playersResponse.json();
      const eventsData = await eventsResponse.json();
      const teamsData = await teamsResponse.json();

      if (playersData.success) {
        setPlayers(playersData.data);
      } else {
        console.error('Failed to fetch players:', playersData);
      }
      
      if (eventsData.success) {
        setEvents(eventsData.data);
      } else {
        console.error('Failed to fetch events:', eventsData);
      }
      
      if (teamsData.success) {
        setTeams(teamsData.data);
      } else {
        console.error('Failed to fetch teams:', teamsData);
      }

      // Initialize fixture service
      try {
        await FixtureService.initialize();
        setFixtureServiceReady(true);
      } catch (error) {
        console.error('Failed to initialize fixture service:', error);
        setFixtureServiceReady(true); // Set to true even on error to prevent infinite loading
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const getPositionFromElementType = (elementType: number): Position => {
    switch (elementType) {
      case 1: return 'GK';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'MID';
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesPosition = selectedPosition === 'ALL' || 
      getPositionFromElementType(player.elementType) === selectedPosition;
    const matchesSearch = player.webName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.secondName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  const getPositionName = (position: Position): string => {
    switch (position) {
      case 'GK': return 'Goalkeeper';
      case 'DEF': return 'Defender';
      case 'MID': return 'Midfielder';
      case 'FWD': return 'Forward';
    }
  };

  const getPlayerById = (playerId: number): Player | undefined => {
    return players.find(p => p.id === playerId);
  };

  const getStartingXI = () => selectedPlayers.filter(p => !p.isOnBench);
  const getBench = () => selectedPlayers.filter(p => p.isOnBench).sort((a, b) => (a.benchOrder || 0) - (b.benchOrder || 0));

  const getPlayersByPosition = (position: Position) => {
    return selectedPlayers.filter(p => p.position === position && !p.isOnBench);
  };

  const getBenchPlayersByPosition = (position: Position) => {
    return selectedPlayers.filter(p => p.position === position && p.isOnBench);
  };

  const handleAddPlayer = (player: Player) => {
    const position = getPositionFromElementType(player.elementType);
    
    // Check if we need to add to bench or starting XI
    const isOnBench = selectedPlayers.length >= 11;
    
    let benchOrder: number | undefined;
    if (isOnBench) {
      // Find the next available bench order
      const usedOrders = selectedPlayers.filter(p => p.isOnBench).map(p => p.benchOrder || 0);
      const availableOrder = [1, 2, 3, 4].find(order => !usedOrders.includes(order)) || 1;
      benchOrder = availableOrder;
    }
    
    const squadSlot: SquadSlot = {
      playerId: player.id,
      position,
      isCaptain: false,
      isViceCaptain: false,
      isOnBench,
      benchOrder
    };
    addPlayer(squadSlot);
  };

  const handleRemovePlayer = (playerId: number) => {
    removePlayer(playerId);
  };

  const handleSetCaptain = (playerId: number) => {
    setCaptain(playerId);
  };

  const handleSetViceCaptain = (playerId: number) => {
    setViceCaptain(playerId);
  };

  const handleMoveToBench = (playerId: number) => {
    const bench = getBench();
    // Find the first available bench order (1-4)
    const usedOrders = bench.map(p => p.benchOrder || 0);
    const availableOrder = [1, 2, 3, 4].find(order => !usedOrders.includes(order)) || 1;
    moveToBench(playerId, availableOrder);
  };

  const handleMoveToStartingXI = (playerId: number) => {
    moveToStartingXI(playerId);
  };

  const handleTransfer = (playerOutId: number) => {
    setSelectedPlayerForModal(players.find(p => p.id === playerOutId) || null);
    setShowPlayerModal(true);
  };

  const handleConfirmTransfer = (playerInId: number) => {
    if (!selectedPlayerForModal) return;
    
    const result = makeTransfer(selectedPlayerForModal.id, playerInId);
    
    if (result.success) {
      // Find the slot of the player being transferred out
      const playerOutSlot = selectedPlayers.find(slot => slot.playerId === selectedPlayerForModal.id);
      
      // Remove the old player
      removePlayer(selectedPlayerForModal.id);
      
      // Add the new player in the same slot
      const newPlayer = players.find(p => p.id === playerInId);
      if (newPlayer && playerOutSlot) {
        const position = getPositionFromElementType(newPlayer.elementType);
        const squadSlot: SquadSlot = {
          playerId: newPlayer.id,
          position,
          isCaptain: playerOutSlot.isCaptain,
          isViceCaptain: playerOutSlot.isViceCaptain,
          isOnBench: playerOutSlot.isOnBench,
          benchOrder: playerOutSlot.benchOrder
        };
        addPlayer(squadSlot);
      }
      
      alert(`${result.message} - Transfer completed!`);
    } else {
      alert(`Transfer failed: ${result.message}`);
    }
    
    setShowPlayerModal(false);
    setSelectedPlayerForModal(null);
  };

  const handleFormationChange = (newFormation: { gk: number; def: number; mid: number; fwd: number }) => {
    setFormation(newFormation);
  };

  const getTotalCost = () => {
    return selectedPlayers.reduce((total, slot) => {
      const player = getPlayerById(slot.playerId);
      return total + (player?.nowCost || 0);
    }, 0) / 10; // Convert from pence to pounds
  };

  const getTotalPoints = () => {
    return selectedPlayers.reduce((total, slot) => {
      const player = getPlayerById(slot.playerId);
      return total + (player?.totalPoints || 0);
    }, 0);
  };

  const getTeamCounts = () => {
    const teamCounts: { [key: number]: number } = {};
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
    return player?.team.name || 'Unknown';
  };

  const getCurrentFixtureForPlayer = (playerId: number): PlayerFixture | null => {
    const player = players.find(p => p.id === playerId);
    if (!player) return null;
    
    // Check if fixture service is initialized
    if (!FixtureService.isInitialized()) {
      return null;
    }
    
    const fixture = FixtureService.getCurrentFixtureForPlayer(player.team.id, currentGameweek);
    return fixture;
  };

  const getCurrentGameweekName = () => {
    const event = events.find(e => e.id === currentGameweek);
    return event?.name || `Gameweek ${currentGameweek}`;
  };

  const getTotalGameweeks = () => {
    return events.length;
  };

  const canGoToNextGameweek = () => {
    return currentGameweek < getTotalGameweeks();
  };

  const canGoToPreviousGameweek = () => {
    return currentGameweek > 1;
  };

  const getDifficultyColor = (difficulty: PlayerFixture['difficulty']) => {
    switch (difficulty) {
      case 'VERY_EASY': return 'text-green-600 bg-green-100';
      case 'EASY': return 'text-green-700 bg-green-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HARD': return 'text-orange-600 bg-orange-100';
      case 'VERY_HARD': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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

  const validation = validateSquad();
  const totalCost = getTotalCost();
  const totalPoints = getTotalPoints();
  const teamCounts = getTeamCounts();
  const budgetRemaining = availableBudget - totalCost;

  const handleSaveScenario = () => {
    const scenarioName = prompt('Enter scenario name:');
    if (scenarioName) {
      const startingXI = getStartingXI();
      const bench = getBench();
      
      // Check if a scenario with this name already exists
      const existingScenario = scenarios.find(s => s.name === scenarioName);
      
      if (existingScenario) {
        const shouldOverwrite = confirm(
          `A scenario named "${scenarioName}" already exists. Do you want to overwrite it?`
        );
        
        if (shouldOverwrite) {
          updateScenario(existingScenario.id, {
            formation: currentFormation,
            startingXI,
            bench,
            budget: availableBudget,
            transferCount,
            updatedAt: new Date().toISOString()
          });
          alert('Scenario updated successfully!');
          return;
        } else {
          // User chose not to overwrite, so we'll create a new one with a unique name
          const newName = `${scenarioName} (${new Date().toLocaleDateString()})`;
          addScenario({
            id: Date.now().toString(),
            name: newName,
            formation: currentFormation,
            startingXI,
            bench,
            budget: availableBudget,
            transferCount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          alert(`Scenario saved as "${newName}"!`);
          return;
        }
      }
      
      // No existing scenario with this name, create new one
      addScenario({
        id: Date.now().toString(),
        name: scenarioName,
        formation: currentFormation,
        startingXI,
        bench,
        budget: availableBudget,
        transferCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('Scenario saved successfully!');
    }
  };

  const handleUpdateScenario = () => {
    if (!activeScenarioId) {
      alert('No active scenario to update. Please save a scenario first.');
      return;
    }

    const startingXI = getStartingXI();
    const bench = getBench();
    
    updateScenario(activeScenarioId, {
      formation: currentFormation,
      startingXI,
      bench,
      budget: availableBudget,
      transferCount,
      updatedAt: new Date().toISOString()
    });
    
    alert('Scenario updated successfully!');
  };

  const PlayerCard = ({ slot, isBench = false }: { slot: SquadSlot; isBench?: boolean }) => {
    const player = getPlayerById(slot.playerId);
    if (!player) return null;

    const currentFixture = getCurrentFixtureForPlayer(slot.playerId);

    return (
      <div className="bg-white rounded-lg p-3 border border-gray-200 hover:border-primary-300 transition-colors">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{player.webName}</div>
            <div className="text-xs text-gray-500">{player.team.name}</div>
            {currentFixture && (
              <div className="mt-1">
                <div className="text-xs text-gray-600">
                  GW{currentFixture.gameweek}: {currentFixture.isHome ? 'H' : 'A'} vs {currentFixture.opponent}
                </div>
                <div className={`text-xs px-1 py-0.5 rounded inline-block ${getDifficultyColor(currentFixture.difficulty)}`}>
                  {getDifficultyText(currentFixture.difficulty)}
                </div>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-medium text-sm">£{(player.nowCost / 10).toFixed(1)}</div>
            <div className="text-xs text-gray-500">{player.totalPoints} pts</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {slot.isCaptain && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">C</span>
            )}
            {slot.isViceCaptain && (
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">VC</span>
            )}
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {getPositionName(slot.position)}
            </span>
          </div>
          
          <div className="flex space-x-1">
            {!isBench && !slot.isCaptain && (
              <button
                onClick={() => handleSetCaptain(slot.playerId)}
                className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200"
              >
                Set C
              </button>
            )}
            {!isBench && !slot.isViceCaptain && (
              <button
                onClick={() => handleSetViceCaptain(slot.playerId)}
                className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200"
              >
                Set VC
              </button>
            )}
            {!isBench && (
              <button
                onClick={() => handleMoveToBench(slot.playerId)}
                className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded hover:bg-orange-200"
              >
                Bench
              </button>
            )}
            {isBench && (
              <button
                onClick={() => handleMoveToStartingXI(slot.playerId)}
                className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
              >
                Start
              </button>
            )}
            <button
              onClick={() => handleTransfer(slot.playerId)}
              className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200"
            >
              Transfer
            </button>
            <button
              onClick={() => handleRemovePlayer(slot.playerId)}
              className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading || !fixtureServiceReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {loading ? 'Loading players...' : 'Loading fixtures...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Squad Planner</h1>
              <p className="mt-2 text-gray-600">Build and optimize your fantasy squad</p>
              {activeScenarioId && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active: {scenarios.find(s => s.id === activeScenarioId)?.name || 'Unknown Scenario'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleSaveScenario}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Scenario
              </button>
              <button
                onClick={handleUpdateScenario}
                disabled={!activeScenarioId}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeScenarioId
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Update Scenario
              </button>
            </div>
          </div>
          
          {/* Gameweek Navigation */}
          <div className="mt-4 flex items-center justify-center space-x-4">
            <button
              onClick={previousGameweek}
              disabled={!canGoToPreviousGameweek()}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                canGoToPreviousGameweek()
                  ? 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              ← Previous
            </button>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{getCurrentGameweekName()}</div>
              <div className="text-sm text-gray-500">Gameweek {currentGameweek} of {getTotalGameweeks()}</div>
            </div>
            
            <button
              onClick={nextGameweek}
              disabled={!canGoToNextGameweek()}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                canGoToNextGameweek()
                  ? 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          </div>

          {/* Free Transfers Display */}
          <div className="mt-4 flex justify-center">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {getFreeTransfersForGameweek(currentGameweek) === Infinity ? 'Unlimited' : getFreeTransfersForGameweek(currentGameweek)}
                </div>
                <div className="text-sm text-gray-600">Free Transfers</div>
                <div className="text-xs text-gray-500 mt-1">
                  {getTransferCost(currentGameweek) === 0 ? 'Next transfer is free' : 'Next transfer costs 4 points'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-4 sm:px-0">
          {/* Left Panel - Squad Builder */}
          <div className="lg:col-span-3">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Squad Builder</h2>
              
              {/* Formation Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Formation</h3>
                <div className="flex flex-wrap gap-2">
                  {FormationValidator.getValidFormations().map((formation, index) => (
                    <button
                      key={index}
                      onClick={() => handleFormationChange(formation)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        JSON.stringify(formation) === JSON.stringify(currentFormation)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                      }`}
                    >
                      {FormationValidator.getFormationString(formation)}
                    </button>
                  ))}
                </div>
                
                {/* Auto-Pick Button */}
                <div className="mt-4">
                  <button
                    onClick={() => autoPickTeam(players, availableBudget * 10)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    🎯 Auto-Pick Team
                  </button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Automatically selects the best team within budget and formation
                  </p>
                </div>
              </div>

              {/* Squad Stats */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">£{totalCost.toFixed(1)}</div>
                  <div className="text-sm text-blue-500">Total Cost</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{totalPoints}</div>
                  <div className="text-sm text-green-500">Total Points</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedPlayers.length}/15</div>
                  <div className="text-sm text-purple-500">Players</div>
                </div>
                <div className={`rounded-lg p-4 text-center ${
                  budgetRemaining >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className={`text-2xl font-bold ${
                    budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    £{budgetRemaining.toFixed(1)}
                  </div>
                  <div className={`text-sm ${
                    budgetRemaining >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    Budget Left
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{transferCount}</div>
                  <div className="text-sm text-orange-500">Transfers Made</div>
                </div>
              </div>

              {/* Starting XI */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Starting XI</h3>
                <div className="space-y-6">
                  {/* Goalkeepers Section */}
                  <div>
                    <h4 className="text-md font-medium text-blue-700 mb-2 border-b border-blue-200 pb-1 bg-blue-50 px-3 py-2 rounded-t">
                      Goalkeepers ({getPlayersByPosition('GK').length}/2)
                    </h4>
                    <div className="space-y-3">
                      {getPlayersByPosition('GK').map(slot => (
                        <PlayerCard key={slot.playerId} slot={slot} />
                      ))}
                      {getPlayersByPosition('GK').length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No goalkeepers selected
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Defenders Section */}
                  <div>
                    <h4 className="text-md font-medium text-green-700 mb-2 border-b border-green-200 pb-1 bg-green-50 px-3 py-2 rounded-t">
                      Defenders ({getPlayersByPosition('DEF').length}/5)
                    </h4>
                    <div className="space-y-3">
                      {getPlayersByPosition('DEF').map(slot => (
                        <PlayerCard key={slot.playerId} slot={slot} />
                      ))}
                      {getPlayersByPosition('DEF').length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No defenders selected
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Midfielders Section */}
                  <div>
                    <h4 className="text-md font-medium text-yellow-700 mb-2 border-b border-yellow-200 pb-1 bg-yellow-50 px-3 py-2 rounded-t">
                      Midfielders ({getPlayersByPosition('MID').length}/5)
                    </h4>
                    <div className="space-y-3">
                      {getPlayersByPosition('MID').map(slot => (
                        <PlayerCard key={slot.playerId} slot={slot} />
                      ))}
                      {getPlayersByPosition('MID').length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No midfielders selected
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Forwards Section */}
                  <div>
                    <h4 className="text-md font-medium text-red-700 mb-2 border-b border-red-200 pb-1 bg-red-50 px-3 py-2 rounded-t">
                      Forwards ({getPlayersByPosition('FWD').length}/3)
                    </h4>
                    <div className="space-y-3">
                      {getPlayersByPosition('FWD').map(slot => (
                        <PlayerCard key={slot.playerId} slot={slot} />
                      ))}
                      {getPlayersByPosition('FWD').length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No forwards selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bench */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Bench</h3>
                <div className="space-y-4">
                  {/* Bench Goalkeepers */}
                  <div>
                    <h4 className="text-sm font-medium text-blue-600 mb-2 bg-blue-50 px-2 py-1 rounded">
                      Goalkeepers ({getBenchPlayersByPosition('GK').length})
                    </h4>
                    <div className="space-y-2">
                      {getBenchPlayersByPosition('GK').map(slot => (
                        <PlayerCard key={slot.playerId} slot={slot} isBench={true} />
                      ))}
                    </div>
                  </div>

                  {/* Bench Defenders */}
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-2 bg-green-50 px-2 py-1 rounded">
                      Defenders ({getBenchPlayersByPosition('DEF').length})
                    </h4>
                    <div className="space-y-2">
                      {getBenchPlayersByPosition('DEF').map(slot => (
                        <PlayerCard key={slot.playerId} slot={slot} isBench={true} />
                      ))}
                    </div>
                  </div>

                  {/* Bench Midfielders */}
                  <div>
                    <h4 className="text-sm font-medium text-yellow-600 mb-2 bg-yellow-50 px-2 py-1 rounded">
                      Midfielders ({getBenchPlayersByPosition('MID').length})
                    </h4>
                    <div className="space-y-2">
                      {getBenchPlayersByPosition('MID').map(slot => (
                        <PlayerCard key={slot.playerId} slot={slot} isBench={true} />
                      ))}
                    </div>
                  </div>

                  {/* Bench Forwards */}
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2 bg-red-50 px-2 py-1 rounded">
                      Forwards ({getBenchPlayersByPosition('FWD').length})
                    </h4>
                    <div className="space-y-2">
                      {getBenchPlayersByPosition('FWD').map(slot => (
                        <PlayerCard key={slot.playerId} slot={slot} isBench={true} />
                      ))}
                    </div>
                  </div>

                  {getBench().length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No players on bench.
                    </div>
                  )}
                </div>
              </div>

              {/* Team Distribution */}
              {Object.keys(teamCounts).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Team Distribution</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(teamCounts).map(([teamId, count]) => (
                      <div key={teamId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{getTeamName(Number(teamId))}</span>
                        <span className="text-sm text-gray-600">{count}/3</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfer History */}
              {transferHistory.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Transfer History</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transferHistory
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 10)
                      .map((transfer) => {
                        const playerOut = getPlayerById(transfer.playerOut);
                        const playerIn = getPlayerById(transfer.playerIn);
                        
                        return (
                          <div key={transfer.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                            <div className="flex-1">
                              <div className="font-medium">
                                GW{transfer.gameweek}: {playerOut?.webName || 'Unknown'} → {playerIn?.webName || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(transfer.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded ${
                              transfer.cost === 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transfer.cost === 0 ? 'Free' : `-${transfer.cost} pts`}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}



              {/* Validation */}
              {!validation.isValid && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Squad Issues:</h4>
                  <ul className="text-sm text-red-700">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.isValid && selectedPlayers.length === 15 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">✓ Squad is valid!</h4>
                  <p className="text-sm text-green-700">
                    Your squad meets all requirements and is ready to save.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Player Selection */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Add Players</h2>
              
              {/* Position Filter */}
              <div className="mb-4">
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value as Position | 'ALL')}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="ALL">All Positions</option>
                  <option value="GK">Goalkeepers</option>
                  <option value="DEF">Defenders</option>
                  <option value="MID">Midfielders</option>
                  <option value="FWD">Forwards</option>
                </select>
              </div>

              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Player List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPlayers.slice(0, 50).map((player) => {
                  const isSelected = selectedPlayers.some(slot => slot.playerId === player.id);
                  const position = getPositionFromElementType(player.elementType);
                  const currentFixture = getCurrentFixtureForPlayer(player.id);
                  
                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary-50 border-primary-200'
                          : 'bg-white border-gray-300 hover:border-primary-300'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          handleRemovePlayer(player.id);
                        } else {
                          handleAddPlayer(player);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{player.webName}</div>
                          <div className="text-xs text-gray-500">
                            {player.team.name} • {getPositionName(position)}
                          </div>
                          {currentFixture && (
                            <div className="mt-1">
                              <div className="text-xs text-gray-600">
                                GW{currentFixture.gameweek}: {currentFixture.isHome ? 'H' : 'A'} vs {currentFixture.opponent}
                              </div>
                              <div className={`text-xs px-1 py-0.5 rounded inline-block ${getDifficultyColor(currentFixture.difficulty)}`}>
                                {getDifficultyText(currentFixture.difficulty)}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">£{(player.nowCost / 10).toFixed(1)}</div>
                          <div className="text-xs text-gray-500">{player.totalPoints} pts</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Scenarios Panel */}
        <div className="px-4 sm:px-0 mt-6">
          <ScenarioList onLoadScenario={loadScenario} />
        </div>
      </main>

      {/* Transfer Modal */}
      {showPlayerModal && selectedPlayerForModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Transfer {selectedPlayerForModal.webName} for:
                </h3>
                {(() => {
                  const playerOut = getPlayerById(selectedPlayerForModal.id);
                  if (!playerOut) return null;
                  
                  const playerOutPosition = getPositionFromElementType(playerOut.elementType);
                  const playerOutCost = playerOut.nowCost / 10;
                  const availableBudget = budgetRemaining + playerOutCost;
                  
                  return (
                    <p className="text-sm text-gray-600 mt-1">
                      Same position ({getPositionName(playerOutPosition)}) • Budget: £{availableBudget.toFixed(1)}
                    </p>
                  );
                })()}
              </div>
              <button
                onClick={() => {
                  setShowPlayerModal(false);
                  setSelectedPlayerForModal(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                if (!selectedPlayerForModal) return null;
                
                const playerOut = getPlayerById(selectedPlayerForModal.id);
                if (!playerOut) return null;
                
                const playerOutPosition = getPositionFromElementType(playerOut.elementType);
                const playerOutCost = playerOut.nowCost / 10;
                const availableBudget = budgetRemaining + playerOutCost;
                
                const eligiblePlayers = filteredPlayers
                  .filter(player => 
                    player.id !== selectedPlayerForModal.id && 
                    !selectedPlayers.some(slot => slot.playerId === player.id) &&
                    getPositionFromElementType(player.elementType) === playerOutPosition &&
                    (player.nowCost / 10) <= availableBudget
                  )
                  .sort((a, b) => (b.nowCost / 10) - (a.nowCost / 10)) // Sort by price descending
                  .slice(0, 50);
                
                if (eligiblePlayers.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <p>No eligible players found.</p>
                      <p className="text-xs mt-1">
                        Looking for {getPositionName(playerOutPosition)} players within £{availableBudget.toFixed(1)} budget.
                      </p>
                    </div>
                  );
                }
                
                return eligiblePlayers.map((player) => {
                  const position = getPositionFromElementType(player.elementType);
                  const currentFixture = getCurrentFixtureForPlayer(player.id);
                  const transferCost = getTransferCost(currentGameweek);
                  const playerCost = player.nowCost / 10;
                  
                  return (
                    <div
                      key={player.id}
                      className="p-3 rounded-lg border cursor-pointer transition-colors hover:border-primary-300 bg-white"
                      onClick={() => handleConfirmTransfer(player.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{player.webName}</div>
                          <div className="text-xs text-gray-500">
                            {player.team.name} • {getPositionName(position)}
                          </div>
                          {currentFixture && (
                            <div className="mt-1">
                              <div className="text-xs text-gray-600">
                                GW{currentFixture.gameweek}: {currentFixture.isHome ? 'H' : 'A'} vs {currentFixture.opponent}
                              </div>
                              <div className={`text-xs px-1 py-0.5 rounded inline-block ${getDifficultyColor(currentFixture.difficulty)}`}>
                                {getDifficultyText(currentFixture.difficulty)}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">£{playerCost.toFixed(1)}</div>
                          <div className="text-xs text-gray-500">{player.totalPoints} pts</div>
                          <div className={`text-xs px-2 py-1 rounded mt-1 ${
                            transferCost === 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transferCost === 0 ? 'Free' : `-${transferCost} pts`}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Budget: £{availableBudget.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 