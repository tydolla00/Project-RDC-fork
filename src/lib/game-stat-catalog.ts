import { getStatConfigsByGame, type StatConfig } from "@/lib/stat-configs";

/**
 * Display column for a game statistic, derived from the canonical stat catalog.
 */
export type GameStatColumn = {
  key: string;
  label: string;
  shortLabel: string;
  lowerIsBetter: boolean;
  rankingKey: boolean;
};

const GAME_NAME_TO_ID: Record<string, number> = {
  "Mario Kart 8": 1,
  "Rocket League": 2,
  "Call of Duty": 3,
  "Lethal Company": 4,
  SpeedRunners: 5,
  "Marvel Rivals": 6,
};

const GAME_SLUG_TO_ID: Record<string, number> = {
  mariokart8: 1,
  rocketleague: 2,
  callofduty: 3,
  lethalcompany: 4,
  speedrunners: 5,
  marvelrivals: 6,
};

/**
 * Resolves a numeric game id from a display name or URL slug.
 *
 * @param gameRef - Game display name or slug.
 * @returns Game id, or null when unknown.
 */
export function resolveGameId(gameRef: string): number | null {
  return GAME_NAME_TO_ID[gameRef] ?? GAME_SLUG_TO_ID[gameRef] ?? null;
}

/**
 * Builds ordered display columns for a game from `STAT_CONFIGS`.
 *
 * Ranking key preference: first Score-labelled stat, else first position
 * (lower-is-better), else the first column.
 *
 * @param gameId - Canonical game id from the database / catalog.
 * @returns Display columns for the game.
 */
export function getGameStatColumns(gameId: number): GameStatColumn[] {
  const configs = getStatConfigsByGame(gameId);
  if (configs.length === 0) return [];

  const rankingName = pickRankingConfig(configs)?.name;
  return configs.map((config) => ({
    key: config.name,
    label: config.displayName,
    shortLabel: toShortLabel(config.displayName),
    lowerIsBetter: config.dataType === "position",
    rankingKey: config.name === rankingName,
  }));
}

/**
 * Builds display columns from a game name or slug.
 *
 * @param gameRef - Game display name or slug.
 * @returns Display columns, or an empty list when the game is unknown.
 */
export function getGameStatColumnsByRef(gameRef: string): GameStatColumn[] {
  const gameId = resolveGameId(gameRef);
  if (gameId === null) return [];
  return getGameStatColumns(gameId);
}

/**
 * Chooses which config acts as the primary ranking / HP meter stat.
 *
 * @param configs - Stat configs for one game.
 * @returns The preferred ranking config.
 */
function pickRankingConfig(configs: StatConfig[]): StatConfig | undefined {
  const score = configs.find(
    (config) => config.displayName.toLowerCase() === "score",
  );
  if (score) return score;

  const position = configs.find((config) => config.dataType === "position");
  if (position) return position;

  return configs[0];
}

/**
 * Builds a compact column header from a display name.
 *
 * @param displayName - Human-readable stat label.
 * @returns Short label for dense tables.
 */
function toShortLabel(displayName: string): string {
  const words = displayName.trim().split(/\s+/);
  if (words.length === 1) {
    const word = words[0];
    return word.length <= 5 ? word : word.slice(0, 3).toUpperCase();
  }
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}
