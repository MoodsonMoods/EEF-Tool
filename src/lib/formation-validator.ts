import { Formation, FormationValidation, SquadSlot } from '@/types';

export class FormationValidator {
  private static readonly POSITION_LIMITS = {
    gk: { min: 1, max: 1, startingXI: { min: 1, max: 1 } },
    def: { min: 3, max: 5, startingXI: { min: 3, max: 5 } },
    mid: { min: 3, max: 5, startingXI: { min: 3, max: 5 } },
    fwd: { min: 1, max: 3, startingXI: { min: 1, max: 3 } },
  };

  private static readonly TOTAL_PLAYERS = 15;
  private static readonly STARTING_XI = 11;
  private static readonly BENCH_SIZE = 4;

  static validateFormation(formation: Formation): FormationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check total players
    const total = formation.gk + formation.def + formation.mid + formation.fwd;
    if (total !== this.TOTAL_PLAYERS) {
      errors.push(`Formation must have exactly ${this.TOTAL_PLAYERS} players, got ${total}`);
    }

    // Check starting XI
    const startingXI = formation.gk + formation.def + formation.mid + formation.fwd;
    if (startingXI !== this.STARTING_XI) {
      errors.push(`Starting XI must have exactly ${this.STARTING_XI} players, got ${startingXI}`);
    }

    // Check position limits
    if (formation.gk < this.POSITION_LIMITS.gk.min || formation.gk > this.POSITION_LIMITS.gk.max) {
      errors.push(`Goalkeepers must be between ${this.POSITION_LIMITS.gk.min}-${this.POSITION_LIMITS.gk.max}, got ${formation.gk}`);
    }

    if (formation.def < this.POSITION_LIMITS.def.min || formation.def > this.POSITION_LIMITS.def.max) {
      errors.push(`Defenders must be between ${this.POSITION_LIMITS.def.min}-${this.POSITION_LIMITS.def.max}, got ${formation.def}`);
    }

    if (formation.mid < this.POSITION_LIMITS.mid.min || formation.mid > this.POSITION_LIMITS.mid.max) {
      errors.push(`Midfielders must be between ${this.POSITION_LIMITS.mid.min}-${this.POSITION_LIMITS.mid.max}, got ${formation.mid}`);
    }

    if (formation.fwd < this.POSITION_LIMITS.fwd.min || formation.fwd > this.POSITION_LIMITS.fwd.max) {
      errors.push(`Forwards must be between ${this.POSITION_LIMITS.fwd.min}-${this.POSITION_LIMITS.fwd.max}, got ${formation.fwd}`);
    }

    // Check bench composition
    const benchSize = this.TOTAL_PLAYERS - this.STARTING_XI;
    if (benchSize !== this.BENCH_SIZE) {
      errors.push(`Bench must have exactly ${this.BENCH_SIZE} players`);
    }

    // Check bench has at least one goalkeeper
    const benchGK = Math.max(0, formation.gk - 1); // Assuming 1 GK in starting XI
    if (benchGK < 1) {
      errors.push('Bench must include at least one goalkeeper');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateSquad(squad: SquadSlot[]): FormationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (squad.length !== this.TOTAL_PLAYERS) {
      errors.push(`Squad must have exactly ${this.TOTAL_PLAYERS} players, got ${squad.length}`);
    }

    const startingXI = squad.filter(player => !player.isOnBench);
    const bench = squad.filter(player => player.isOnBench);

    if (startingXI.length !== this.STARTING_XI) {
      errors.push(`Starting XI must have exactly ${this.STARTING_XI} players, got ${startingXI.length}`);
    }

    if (bench.length !== this.BENCH_SIZE) {
      errors.push(`Bench must have exactly ${this.BENCH_SIZE} players, got ${bench.length}`);
    }

    // Check captain and vice-captain
    const captains = squad.filter(player => player.isCaptain);
    const viceCaptains = squad.filter(player => player.isViceCaptain);

    if (captains.length !== 1) {
      errors.push('Must have exactly one captain');
    }

    if (viceCaptains.length !== 1) {
      errors.push('Must have exactly one vice-captain');
    }

    if (captains.length === 1 && viceCaptains.length === 1 && captains[0].playerId === viceCaptains[0].playerId) {
      errors.push('Captain and vice-captain must be different players');
    }

    // Check bench order
    const benchWithOrder = bench.filter(player => player.benchOrder !== undefined);
    if (benchWithOrder.length !== bench.length) {
      errors.push('All bench players must have a bench order');
    }

    // Check that bench orders are unique and within valid range (1-4)
    const benchOrders = bench.map(player => player.benchOrder || 0);
    const uniqueOrders = Array.from(new Set(benchOrders));
    if (uniqueOrders.length !== benchOrders.length) {
      errors.push('Bench players must have unique order numbers');
    }
    
    const invalidOrders = benchOrders.filter(order => order < 1 || order > 4);
    if (invalidOrders.length > 0) {
      errors.push('Bench orders must be between 1 and 4');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static getFormationString(formation: Formation): string {
    return `${formation.def}-${formation.mid}-${formation.fwd}`;
  }

  static parseFormationString(formationString: string): Formation | null {
    const parts = formationString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return null;
    }

    const [def, mid, fwd] = parts;
    const gk = 1; // Always 1 goalkeeper

    const formation: Formation = { gk, def, mid, fwd };
    const validation = this.validateFormation(formation);

    return validation.isValid ? formation : null;
  }

  static getValidFormations(): Formation[] {
    const formations: Formation[] = [];
    
    // Generate all valid formations
    for (let def = 3; def <= 5; def++) {
      for (let mid = 3; mid <= 5; mid++) {
        for (let fwd = 1; fwd <= 3; fwd++) {
          const formation: Formation = { gk: 1, def, mid, fwd };
          if (this.validateFormation(formation).isValid) {
            formations.push(formation);
          }
        }
      }
    }

    return formations;
  }
} 