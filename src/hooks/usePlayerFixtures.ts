import { useState, useEffect } from 'react';
import { Player } from '@/types';
import { FixtureService, PlayerFixture } from '@/lib/fixture-service';
import { getPositionFromElementType } from '@/lib/utils';

export function usePlayerFixtures(
  players: Player[],
  currentGameweek: number,
  fixtureServiceReady: boolean
) {
  const [playerFixtures, setPlayerFixtures] = useState<{ [playerId: number]: PlayerFixture | null }>({});

  useEffect(() => {
    const loadPlayerFixtures = async () => {
      if (!fixtureServiceReady || players.length === 0) return;
      
      // Create parallel promises for all players
      const fixturePromises = players.map(async (player) => {
        const position = getPositionFromElementType(player.elementType);
        const fixture = await FixtureService.getCurrentFixtureForPlayer(player.team.id, currentGameweek, position);
        return { playerId: player.id, fixture };
      });
      
      // Execute all promises in parallel
      const results = await Promise.all(fixturePromises);
      
      // Convert results to the expected format
      const newFixtures: { [playerId: number]: PlayerFixture | null } = {};
      results.forEach(({ playerId, fixture }) => {
        newFixtures[playerId] = fixture;
      });
      
      setPlayerFixtures(newFixtures);
    };
    
    loadPlayerFixtures();
  }, [players, currentGameweek, fixtureServiceReady]);

  return playerFixtures;
} 