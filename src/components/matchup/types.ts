/**
 * One fighter in a Matchup — name, wins, and per-stat totals/averages.
 */
export type MatchupFighter = {
  name: string;
  matchWins: number;
  setWins: number;
  stats: Record<string, { total: number; average: number }>;
};

/**
 * One category row in a Matchup.
 */
export type MatchupStat = {
  key: string;
  label: string;
  lowerIsBetter?: boolean;
};

export type MatchupMode = "total" | "average";
