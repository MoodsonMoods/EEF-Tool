import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  PreferencesState, 
  ScenariosState, 
  PlannerState, 
  SquadScenario, 
  SquadSlot, 
  Formation,
  Player
} from '@/types';
import { FormationValidator } from './formation-validator';

// Preferences slice
interface PreferencesSlice extends PreferencesState {
  setLanguage: (language: 'en' | 'nl') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAutoSave: (autoSave: boolean) => void;
}

// Scenarios slice
interface ScenariosSlice extends ScenariosState {
  addScenario: (scenario: SquadScenario) => void;
  updateScenario: (id: string, updates: Partial<SquadScenario>) => void;
  deleteScenario: (id: string) => void;
  setActiveScenario: (id: string | null) => void;
  exportScenario: (id: string) => string;
        importScenario: (scenarioJson: string) => SquadScenario | null;
      loadScenario: (scenario: SquadScenario) => void;
}

// Planner slice
interface PlannerSlice extends PlannerState {
  setFormation: (formation: Formation) => void;
  addPlayer: (player: SquadSlot) => void;
  removePlayer: (playerId: number) => void;
  setCaptain: (playerId: number) => void;
  setViceCaptain: (playerId: number) => void;
  moveToBench: (playerId: number, benchOrder: number) => void;
  moveToStartingXI: (playerId: number) => void;
  setBudget: (budget: number) => void;
  setTransferCount: (count: number) => void;
  clearAllPlayers: () => void;
  setCurrentGameweek: (gameweek: number) => void;
  nextGameweek: () => void;
  previousGameweek: () => void;
  validateSquad: () => { isValid: boolean; errors: string[]; warnings: string[] };
  autoPickTeam: (players: Player[], budget: number) => void;
  makeTransfer: (playerOutId: number, playerInId: number) => { success: boolean; cost: number; message: string };
  getFreeTransfersForGameweek: (gameweek: number) => number;
  getTransferCost: (gameweek: number) => number;
}

// Combined store type
interface Store extends PreferencesSlice, ScenariosSlice, PlannerSlice {}

// Create the store
export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Preferences state
      language: 'en',
      theme: 'light',
      autoSave: true,

      // Scenarios state
      scenarios: [],
      activeScenarioId: null,

      // Planner state
      currentFormation: { gk: 1, def: 4, mid: 4, fwd: 2 }, // 4-4-2 formation (starting XI only)
      selectedPlayers: [],
      availableBudget: 100.0,
      transferCount: 0,
      currentGameweek: 1,
      freeTransfers: Infinity, // Unlimited transfers before gameweek 1
      transferHistory: [],

      // Preferences actions
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setAutoSave: (autoSave) => set({ autoSave }),

      // Scenarios actions
      addScenario: (scenario) => {
        const { scenarios } = get();
        set({ 
          scenarios: [...scenarios, scenario],
          activeScenarioId: scenario.id 
        });
      },

      updateScenario: (id, updates) => {
        const { scenarios } = get();
        const updatedScenarios = scenarios.map(scenario =>
          scenario.id === id 
            ? { ...scenario, ...updates, updatedAt: new Date().toISOString() }
            : scenario
        );
        set({ scenarios: updatedScenarios });
      },

      deleteScenario: (id) => {
        const { scenarios, activeScenarioId } = get();
        const filteredScenarios = scenarios.filter(s => s.id !== id);
        const newActiveId = activeScenarioId === id 
          ? (filteredScenarios[0]?.id || null)
          : activeScenarioId;
        
        set({ 
          scenarios: filteredScenarios,
          activeScenarioId: newActiveId 
        });
      },

      setActiveScenario: (id) => set({ activeScenarioId: id }),

      exportScenario: (id) => {
        const { scenarios } = get();
        const scenario = scenarios.find(s => s.id === id);
        return scenario ? JSON.stringify(scenario, null, 2) : '';
      },

      importScenario: (scenarioJson) => {
        try {
          const scenario = JSON.parse(scenarioJson) as SquadScenario;
          // Validate the imported scenario
          if (scenario.id && scenario.name && scenario.startingXI && scenario.bench) {
            return scenario;
          }
          return null;
        } catch (error) {
          console.error('Failed to import scenario:', error);
          return null;
        }
      },

      loadScenario: (scenario) => {
        set({
          currentFormation: scenario.formation,
          selectedPlayers: [...scenario.startingXI, ...scenario.bench],
          availableBudget: scenario.budget,
          transferCount: scenario.transferCount,
          activeScenarioId: scenario.id
        });
      },

      // Planner actions
      setFormation: (formation) => {
        const validation = FormationValidator.validateFormation(formation);
        if (validation.isValid) {
          set({ currentFormation: formation });
        } else {
          console.warn('Invalid formation:', validation.errors);
        }
      },

      addPlayer: (player) => {
        const { selectedPlayers } = get();
        const existingIndex = selectedPlayers.findIndex(p => p.playerId === player.playerId);
        
        if (existingIndex >= 0) {
          // Update existing player
          const updated = [...selectedPlayers];
          updated[existingIndex] = player;
          set({ selectedPlayers: updated });
        } else {
          // Add new player
          set({ selectedPlayers: [...selectedPlayers, player] });
        }
      },

      removePlayer: (playerId) => {
        const { selectedPlayers } = get();
        let updated = selectedPlayers.filter(p => p.playerId !== playerId);
        
        // Reorder remaining bench players to ensure sequential ordering
        const benchPlayers = updated.filter(p => p.isOnBench);
        benchPlayers.forEach((player, index) => {
          const playerIndex = updated.findIndex(p => p.playerId === player.playerId);
          if (playerIndex !== -1) {
            updated[playerIndex] = { ...player, benchOrder: index + 1 };
          }
        });
        
        set({ selectedPlayers: updated });
      },

      setCaptain: (playerId) => {
        const { selectedPlayers } = get();
        const updated = selectedPlayers.map(player => ({
          ...player,
          isCaptain: player.playerId === playerId,
          isViceCaptain: player.isViceCaptain && player.playerId !== playerId
        }));
        set({ selectedPlayers: updated });
      },

      setViceCaptain: (playerId) => {
        const { selectedPlayers } = get();
        const updated = selectedPlayers.map(player => ({
          ...player,
          isViceCaptain: player.playerId === playerId,
          isCaptain: player.isCaptain && player.playerId !== playerId
        }));
        set({ selectedPlayers: updated });
      },

      moveToBench: (playerId, benchOrder) => {
        const { selectedPlayers } = get();
        const updated = selectedPlayers.map(player =>
          player.playerId === playerId
            ? { ...player, isOnBench: true, benchOrder }
            : player
        );
        set({ selectedPlayers: updated });
      },

      moveToStartingXI: (playerId) => {
        const { selectedPlayers } = get();
        let updated = selectedPlayers.map(player =>
          player.playerId === playerId
            ? { ...player, isOnBench: false, benchOrder: undefined }
            : player
        );
        
        // Reorder remaining bench players to ensure sequential ordering
        const benchPlayers = updated.filter(p => p.isOnBench);
        benchPlayers.forEach((player, index) => {
          const playerIndex = updated.findIndex(p => p.playerId === player.playerId);
          if (playerIndex !== -1) {
            updated[playerIndex] = { ...player, benchOrder: index + 1 };
          }
        });
        
        set({ selectedPlayers: updated });
      },

      setBudget: (budget) => set({ availableBudget: budget }),
      setTransferCount: (count) => set({ transferCount: count }),
      clearAllPlayers: () => set({ selectedPlayers: [] }),
      setCurrentGameweek: (gameweek) => set(state => ({ 
        currentGameweek: gameweek,
        freeTransfers: state.getFreeTransfersForGameweek(gameweek)
      })),
      nextGameweek: () => {
        set(state => {
          const newGameweek = state.currentGameweek + 1;
          return {
            currentGameweek: newGameweek,
            freeTransfers: state.getFreeTransfersForGameweek(newGameweek)
          };
        });
      },
      previousGameweek: () => {
        set(state => {
          const newGameweek = state.currentGameweek - 1;
          return {
            currentGameweek: newGameweek,
            freeTransfers: state.getFreeTransfersForGameweek(newGameweek)
          };
        });
      },

      autoPickTeam: (players: Player[], budget: number) => {
        const { currentFormation } = get();
        
        // Clear current selection
        set({ selectedPlayers: [] });
        
        // Sort players by value (points per million)
        const sortedPlayers = [...players].sort((a, b) => {
          const aValue = a.totalPoints / a.nowCost;
          const bValue = b.totalPoints / b.nowCost;
          return bValue - aValue;
        });
        
        // Separate players by position
        const goalkeepers = sortedPlayers.filter(p => p.elementType === 1);
        const defenders = sortedPlayers.filter(p => p.elementType === 2);
        const midfielders = sortedPlayers.filter(p => p.elementType === 3);
        const forwards = sortedPlayers.filter(p => p.elementType === 4);
        
        const selectedPlayers: SquadSlot[] = [];
        let remainingBudget = budget;
        
        // Pick starting XI
        // Goalkeeper
        if (goalkeepers.length > 0) {
          const gk = goalkeepers[0];
          selectedPlayers.push({
            playerId: gk.id,
            position: 'GK',
            isOnBench: false,
            isCaptain: false,
            isViceCaptain: false,
            benchOrder: undefined
          });
          remainingBudget -= gk.nowCost;
        }
        
        // Defenders
        for (let i = 0; i < currentFormation.def; i++) {
          if (defenders.length > i) {
            const def = defenders[i];
            selectedPlayers.push({
              playerId: def.id,
              position: 'DEF',
              isOnBench: false,
              isCaptain: false,
              isViceCaptain: false,
              benchOrder: undefined
            });
            remainingBudget -= def.nowCost;
          }
        }
        
        // Midfielders
        for (let i = 0; i < currentFormation.mid; i++) {
          if (midfielders.length > i) {
            const mid = midfielders[i];
            selectedPlayers.push({
              playerId: mid.id,
              position: 'MID',
              isOnBench: false,
              isCaptain: false,
              isViceCaptain: false,
              benchOrder: undefined
            });
            remainingBudget -= mid.nowCost;
          }
        }
        
        // Forwards
        for (let i = 0; i < currentFormation.fwd; i++) {
          if (forwards.length > i) {
            const fwd = forwards[i];
            selectedPlayers.push({
              playerId: fwd.id,
              position: 'FWD',
              isOnBench: false,
              isCaptain: false,
              isViceCaptain: false,
              benchOrder: undefined
            });
            remainingBudget -= fwd.nowCost;
          }
        }
        
        // Pick bench players (4 players)
        const allRemaining = [
          ...goalkeepers.slice(1, 2), // 1 more GK
          ...defenders.slice(currentFormation.def, currentFormation.def + 2), // 2 more DEF
          ...midfielders.slice(currentFormation.mid, currentFormation.mid + 1), // 1 more MID
        ].filter(p => p && remainingBudget >= p.nowCost);
        
        // Sort remaining by value and pick best 4
        const bestRemaining = allRemaining
          .sort((a, b) => {
            const aValue = a.totalPoints / a.nowCost;
            const bValue = b.totalPoints / b.nowCost;
            return bValue - aValue;
          })
          .slice(0, 4);
        
        bestRemaining.forEach((player, index) => {
          const position = player.elementType === 1 ? 'GK' : 
                          player.elementType === 2 ? 'DEF' : 
                          player.elementType === 3 ? 'MID' : 'FWD';
          
          selectedPlayers.push({
            playerId: player.id,
            position,
            isOnBench: true,
            isCaptain: false,
            isViceCaptain: false,
            benchOrder: index + 1
          });
          remainingBudget -= player.nowCost;
        });
        
        // Set captain and vice-captain (first two players in starting XI)
        if (selectedPlayers.length >= 2) {
          selectedPlayers[0].isCaptain = true;
          selectedPlayers[1].isViceCaptain = true;
        }
        
        set({ selectedPlayers });
      },

      validateSquad: () => {
        const { selectedPlayers } = get();
        return FormationValidator.validateSquad(selectedPlayers);
      },

      makeTransfer: (playerOutId: number, playerInId: number) => {
        const { selectedPlayers, freeTransfers, currentGameweek, transferHistory } = get();
        
        // Check if player out exists in squad
        const playerOutIndex = selectedPlayers.findIndex(p => p.playerId === playerOutId);
        if (playerOutIndex === -1) {
          return { success: false, cost: 0, message: 'Player not found in squad' };
        }
        
        // Check if player in is already in squad
        const playerInExists = selectedPlayers.some(p => p.playerId === playerInId);
        if (playerInExists) {
          return { success: false, cost: 0, message: 'Player already in squad' };
        }
        
        // Calculate transfer cost
        let cost = 0;
        let message = 'Free transfer used';
        
        if (freeTransfers === Infinity || freeTransfers > 0) {
          // Use free transfer (unlimited in gameweek 1, or available free transfers)
          if (freeTransfers !== Infinity) {
            set(state => ({ freeTransfers: state.freeTransfers - 1 }));
          }
        } else {
          // Extra transfer costs 4 points
          cost = 4;
          message = 'Extra transfer (-4 points)';
        }
        
        // Record the transfer
        const transferRecord = {
          id: Date.now().toString(),
          gameweek: currentGameweek,
          playerOut: playerOutId,
          playerIn: playerInId,
          timestamp: new Date().toISOString(),
          cost
        };
        
        set(state => ({ 
          transferHistory: [...state.transferHistory, transferRecord],
          transferCount: state.transferCount + 1
        }));
        
        return { success: true, cost, message };
      },

      getFreeTransfersForGameweek: (gameweek: number) => {
        const { transferHistory } = get();
        
        // Before gameweek 1: unlimited free transfers
        if (gameweek === 1) {
          return Infinity;
        }
        
        // Start with 1 free transfer per gameweek (starting from gameweek 2)
        let freeTransfers = 1;
        
        // Add saved transfers from previous gameweeks (starting from gameweek 2)
        for (let gw = 2; gw < gameweek; gw++) {
          const gwTransfers = transferHistory.filter(t => t.gameweek === gw);
          const usedTransfers = gwTransfers.length;
          const savedTransfers = Math.max(0, 1 - usedTransfers);
          freeTransfers += savedTransfers;
        }
        
        // Subtract used transfers in current gameweek
        const currentGwTransfers = transferHistory.filter(t => t.gameweek === gameweek);
        const usedInCurrentGw = currentGwTransfers.length;
        freeTransfers = Math.max(0, freeTransfers - usedInCurrentGw);
        
        // Cap at maximum 5 free transfers
        return Math.min(freeTransfers, 5);
      },

      getTransferCost: (gameweek: number) => {
        const freeTransfers = get().getFreeTransfersForGameweek(gameweek);
        return freeTransfers === Infinity || freeTransfers > 0 ? 0 : 4;
      },
    }),
    {
      name: 'eef-toolkit-storage',
      version: 1,
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        autoSave: state.autoSave,
        scenarios: state.scenarios,
        activeScenarioId: state.activeScenarioId,
        // Persist planner state as well:
        currentFormation: state.currentFormation,
        selectedPlayers: state.selectedPlayers,
        availableBudget: state.availableBudget,
        transferCount: state.transferCount,
        currentGameweek: state.currentGameweek,
        freeTransfers: state.freeTransfers,
        transferHistory: state.transferHistory,
      }),
    }
  )
);

// Selector hooks for better performance
export const usePreferences = () => useStore(state => ({
  language: state.language,
  theme: state.theme,
  autoSave: state.autoSave,
  setLanguage: state.setLanguage,
  setTheme: state.setTheme,
  setAutoSave: state.setAutoSave,
}));

export const useScenarios = () => useStore(state => ({
  scenarios: state.scenarios,
  activeScenarioId: state.activeScenarioId,
  addScenario: state.addScenario,
  updateScenario: state.updateScenario,
  deleteScenario: state.deleteScenario,
  setActiveScenario: state.setActiveScenario,
  exportScenario: state.exportScenario,
  importScenario: state.importScenario,
  loadScenario: state.loadScenario,
}));

export const usePlanner = () => useStore(state => ({
  currentFormation: state.currentFormation,
  selectedPlayers: state.selectedPlayers,
  availableBudget: state.availableBudget,
  transferCount: state.transferCount,
  currentGameweek: state.currentGameweek,
  freeTransfers: state.freeTransfers,
  transferHistory: state.transferHistory,
  setFormation: state.setFormation,
  addPlayer: state.addPlayer,
  removePlayer: state.removePlayer,
  setCaptain: state.setCaptain,
  setViceCaptain: state.setViceCaptain,
  moveToBench: state.moveToBench,
  moveToStartingXI: state.moveToStartingXI,
  setBudget: state.setBudget,
  setTransferCount: state.setTransferCount,
  clearAllPlayers: state.clearAllPlayers,
  setCurrentGameweek: state.setCurrentGameweek,
  nextGameweek: state.nextGameweek,
  previousGameweek: state.previousGameweek,
  validateSquad: state.validateSquad,
  autoPickTeam: state.autoPickTeam,
  makeTransfer: state.makeTransfer,
  getFreeTransfersForGameweek: state.getFreeTransfersForGameweek,
  getTransferCost: state.getTransferCost,
})); 