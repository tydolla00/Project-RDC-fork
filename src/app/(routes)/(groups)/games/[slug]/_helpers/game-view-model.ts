import { findPlayer } from "@/app/(routes)/admin/_utils/player-mappings";
import {
  getGameStatColumnsByRef,
  type GameStatColumn,
} from "@/lib/game-stat-catalog";
import { QueryResponseData } from "prisma/db";
import { getAllSessionsByGame } from "prisma/lib/admin";

export type Sessions = QueryResponseData<
  Awaited<ReturnType<typeof getAllSessionsByGame>>
>;

export type StatMode = "total" | "average";

export type GameStatValue = {
  total: number;
  average: number;
  entries: number;
};

export type GamePlayer = {
  player: string;
  matchWins: number;
  setWins: number;
  stats: Record<string, GameStatValue>;
};

export type SessionCard = {
  sessionId: number;
  sessionName: string;
  sessionUrl: string;
  thumbnail: string;
  date: string;
  timestamp: number;
  setCount: number;
  matchCount: number;
  mvpName: string | null;
  totals: Record<string, number>;
  topPlayer: { player: string; score: number } | null;
};

export type GameMvp = {
  playerName: string;
  image: string;
  description: string | null;
} | null;

/**
 * Serializable game stats payload: derived players/stats/sessions with a slim
 * session list for the MatchData dialog. Callers render; they do not re-walk
 * the session graph.
 */
export type GameViewModel = {
  gameName: string;
  gameSlug: string;
  gameImage: string;
  banner: {
    totalMatches: number;
    totalSets: number;
    lastPlayed: string | null;
  };
  mvp: GameMvp;
  stats: GameStatColumn[];
  players: GamePlayer[];
  sessions: SessionCard[];
  /** Raw sessions retained only for the existing MatchData dialog. */
  sessionsRaw: Sessions;
};

/**
 * Assembles the game stats view model from session rows and game metadata.
 *
 * @param sessions - Sessions for one game from the database.
 * @param gameName - Display name of the game.
 * @param gameSlug - URL slug for the game.
 * @param gameImage - Path to the game banner image.
 * @returns A ready-to-render game stats view model.
 */
export function assembleGameViewModel(
  sessions: Sessions,
  gameName: string,
  gameSlug: string,
  gameImage: string,
): GameViewModel {
  const catalog = getGameStatColumnsByRef(gameName);
  const { players, discoveredKeys } = buildPlayers(sessions, catalog);
  const stats = filterActiveStats(catalog, players, discoveredKeys);
  const sessionCards = buildSessionCards(sessions, stats, gameImage);

  return {
    gameName,
    gameSlug,
    gameImage,
    banner: computeBanner(sessions),
    mvp: extractMvp(sessions),
    stats,
    players,
    sessions: sessionCards,
    sessionsRaw: sessions,
  };
}

/**
 * Reads a game stats player stat in total or average mode.
 *
 * @param player - Game player row.
 * @param statKey - Stat column key.
 * @param mode - Total or average.
 * @returns Numeric value.
 */
export function readGameStat(
  player: GamePlayer,
  statKey: string,
  mode: StatMode,
): number {
  const value = player.stats[statKey];
  if (!value) return 0;
  return mode === "total" ? value.total : value.average;
}

/**
 * Finds the leader for a stat column.
 *
 * @param players - Game players.
 * @param stat - Column definition.
 * @param mode - Total or average.
 * @returns Leading player, or null when empty.
 */
export function getGameStatLeader(
  players: GamePlayer[],
  stat: GameStatColumn,
  mode: StatMode,
): GamePlayer | null {
  if (players.length === 0) return null;

  let leader = players[0];
  for (let index = 1; index < players.length; index++) {
    const candidate = readGameStat(players[index], stat.key, mode);
    const current = readGameStat(leader, stat.key, mode);
    if (stat.lowerIsBetter ? candidate < current : candidate > current)
      leader = players[index];
  }
  return leader;
}

/**
 * Formats large numbers compactly for game stats UI.
 *
 * @param value - Numeric value.
 * @param maximumFractionDigits - Decimal places.
 * @returns Localized compact string.
 */
export function formatGameStat(
  value: number,
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits,
  }).format(value);
}

/**
 * Returns a Next-safe image src for session thumbnails.
 *
 * @param source - Candidate thumbnail.
 * @param fallback - Local game image fallback.
 * @returns Renderable src.
 */
export function getSafeImage(
  source: string | undefined,
  fallback: string,
): string {
  if (!source) return fallback;
  if (source.startsWith("/")) return source;
  if (source.startsWith("https://i.ytimg.com/")) return source;
  if (source.startsWith("https://static.wikia.nocookie.net/")) return source;
  return fallback;
}

/**
 * Builds player rows and the set of discovered stat keys from sessions.
 *
 * @param sessions - Session graph.
 * @param catalog - Catalog columns for the game.
 * @returns Players sorted by match wins and discovered keys.
 */
function buildPlayers(
  sessions: Sessions,
  catalog: GameStatColumn[],
): { players: GamePlayer[]; discoveredKeys: Set<string> } {
  const catalogKeys = new Set(catalog.map((stat) => stat.key));
  const discoveredKeys = new Set<string>();
  const players = new Map<
    string,
    {
      matchWins: number;
      setWins: number;
      stats: Map<string, { total: number; entries: number }>;
    }
  >();

  /**
   * Ensures a player accumulator exists.
   *
   * @param name - Player display name.
   * @returns Mutable player accumulator.
   */
  function ensure(name: string) {
    const existing = players.get(name);
    if (existing) return existing;
    const created = {
      matchWins: 0,
      setWins: 0,
      stats: new Map<string, { total: number; entries: number }>(),
    };
    players.set(name, created);
    return created;
  }

  for (const session of sessions) {
    for (const set of session.sets) {
      for (const winner of set.setWinners) ensure(winner.playerName).setWins += 1;

      for (const match of set.matches) {
        for (const winner of match.matchWinners)
          ensure(winner.playerName).matchWins += 1;

        for (const playerSession of match.playerSessions) {
          for (const playerStat of playerSession.playerStats) {
            const numericValue = Number(playerStat.value);
            if (Number.isNaN(numericValue)) continue;

            const statName = playerStat.gameStat.statName;
            discoveredKeys.add(statName);
            if (catalogKeys.size > 0 && !catalogKeys.has(statName)) continue;

            const playerName = playerStat.player.playerName;
            const row = ensure(playerName);
            const stat = row.stats.get(statName) ?? { total: 0, entries: 0 };
            stat.total += numericValue;
            stat.entries += 1;
            row.stats.set(statName, stat);
          }
        }
      }
    }
  }

  const keys =
    catalogKeys.size > 0 ? catalog.map((stat) => stat.key) : [...discoveredKeys];

  const gamePlayers = Array.from(players, ([player, data]) => {
    const stats: Record<string, GameStatValue> = {};
    for (const key of keys) {
      const stat = data.stats.get(key);
      stats[key] = {
        total: stat?.total ?? 0,
        average: stat && stat.entries > 0 ? stat.total / stat.entries : 0,
        entries: stat?.entries ?? 0,
      };
    }
    return {
      player,
      matchWins: data.matchWins,
      setWins: data.setWins,
      stats,
    };
  }).toSorted((a, b) => b.matchWins - a.matchWins);

  return { players: gamePlayers, discoveredKeys };
}

/**
 * Keeps catalog columns that have data, or synthesizes columns from discovery.
 *
 * @param catalog - Catalog columns.
 * @param players - Built players.
 * @param discoveredKeys - Keys seen in sessions.
 * @returns Active columns.
 */
function filterActiveStats(
  catalog: GameStatColumn[],
  players: GamePlayer[],
  discoveredKeys: Set<string>,
): GameStatColumn[] {
  const base =
    catalog.length > 0
      ? catalog
      : [...discoveredKeys].map((key) => ({
          key,
          label: key.replace(/^[A-Z]+_/, "").replace(/_/g, " "),
          shortLabel: key.replace(/^[A-Z]+_/, "").slice(0, 3),
          lowerIsBetter: false,
          rankingKey: false,
        }));

  const active = base.filter((stat) =>
    players.some((player) => {
      const value = player.stats[stat.key];
      return value && (value.total !== 0 || value.entries > 0);
    }),
  );

  if (active.length > 0 && !active.some((stat) => stat.rankingKey))
    active[0] = { ...active[0], rankingKey: true };

  return active;
}

/**
 * Builds session cards with per-stat totals for the archive UI.
 *
 * @param sessions - Session graph.
 * @param stats - Active columns.
 * @param gameImage - Fallback thumbnail.
 * @returns Session cards newest first.
 */
function buildSessionCards(
  sessions: Sessions,
  stats: GameStatColumn[],
  gameImage: string,
): SessionCard[] {
  const rankingKey =
    stats.find((stat) => stat.rankingKey)?.key ?? stats[0]?.key ?? "";
  const rankingDef = stats.find((stat) => stat.key === rankingKey);
  const keys = new Set(stats.map((stat) => stat.key));

  const cards = sessions.map((session) => {
    const totals: Record<string, number> = {};
    for (const stat of stats) totals[stat.key] = 0;

    const scoreByPlayer = new Map<string, number>();
    let matchCount = 0;

    for (const set of session.sets) {
      matchCount += set.matches.length;
      for (const match of set.matches) {
        for (const playerSession of match.playerSessions) {
          for (const playerStat of playerSession.playerStats) {
            const statName = playerStat.gameStat.statName;
            if (!keys.has(statName)) continue;
            const value = Number(playerStat.value);
            if (Number.isNaN(value)) continue;
            totals[statName] += value;
            if (statName === rankingKey) {
              const name = playerStat.player.playerName;
              scoreByPlayer.set(name, (scoreByPlayer.get(name) ?? 0) + value);
            }
          }
        }
      }
    }

    let topPlayer: SessionCard["topPlayer"] = null;
    for (const [player, score] of scoreByPlayer) {
      if (!topPlayer) {
        topPlayer = { player, score };
        continue;
      }
      const better = rankingDef?.lowerIsBetter
        ? score < topPlayer.score
        : score > topPlayer.score;
      if (better) topPlayer = { player, score };
    }

    return {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      sessionUrl: session.sessionUrl,
      thumbnail: getSafeImage(session.thumbnail, gameImage),
      date: new Date(session.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      timestamp: new Date(session.date).getTime(),
      setCount: session.sets.length,
      matchCount,
      mvpName: session.mvp?.playerName ?? null,
      totals,
      topPlayer,
    };
  });

  return cards.toSorted((a, b) => b.timestamp - a.timestamp);
}

/**
 * Computes banner counts from sessions.
 *
 * @param sessions - Session graph.
 * @returns Banner stats.
 */
function computeBanner(sessions: Sessions): GameViewModel["banner"] {
  let totalMatches = 0;
  let totalSets = 0;
  let lastPlayed: Date | null = null;

  for (const session of sessions) {
    const sessionDate = new Date(session.date);
    if (!lastPlayed || sessionDate > lastPlayed) lastPlayed = sessionDate;
    totalSets += session.sets.length;
    for (const set of session.sets) totalMatches += set.matches.length;
  }

  return {
    totalMatches,
    totalSets,
    lastPlayed: lastPlayed
      ? lastPlayed.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null,
  };
}

/**
 * Extracts the most recent MVP blurb.
 *
 * @param sessions - Session graph.
 * @returns MVP summary or null.
 */
function extractMvp(sessions: Sessions): GameMvp {
  const sorted = [...sessions].toSorted(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (const session of sorted) {
    if (!session.mvp || !session.mvpDescription) continue;
    const mapping = findPlayer(session.mvp.playerName);
    return {
      playerName: session.mvp.playerName,
      image: mapping?.image || "",
      description: session.mvpDescription,
    };
  }

  return null;
}
