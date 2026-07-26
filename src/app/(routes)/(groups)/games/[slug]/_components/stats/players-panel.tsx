"use client";

import { useState } from "react";
import type { GameStatColumn } from "@/lib/game-stat-catalog";
import {
  formatGameStat,
  readGameStat,
  type GamePlayer,
  type StatMode,
} from "../../_helpers/game-view-model";
import {
  PlayerAvatar,
  SectionHeading,
  SegmentedControl,
  SortableHeader,
  type SortDirection,
} from "./stats-ui";

const DENSITY_OPTIONS = [
  { key: "heatmap", label: "Heatmap" },
  { key: "plain", label: "Plain" },
] as const;

type Density = (typeof DENSITY_OPTIONS)[number]["key"];
type SortKey = string | "player" | "matchWins" | "setWins";

/**
 * Players tab: searchable sortable matrix with sticky name column.
 *
 * @param props - Players, stats, and selection handlers.
 * @returns The players panel.
 */
export function PlayersPanel({
  players,
  stats,
  activeStat,
  statMode,
  selectedPlayer,
  onSelectPlayer,
  onSelectStat,
}: {
  players: GamePlayer[];
  stats: GameStatColumn[];
  activeStat: string;
  statMode: StatMode;
  selectedPlayer: GamePlayer;
  onSelectPlayer: (player: string) => void;
  onSelectStat: (stat: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<Density>("heatmap");
  const [sortKey, setSortKey] = useState<SortKey>(activeStat);
  const [direction, setDirection] = useState<SortDirection>("desc");

  const maximums = getMaximums(players, stats, statMode);
  const search = query.trim().toLowerCase();
  const visible = sortPlayers(
    players,
    sortKey,
    direction,
    statMode,
    stats,
  ).filter((player) => player.player.toLowerCase().includes(search));

  /**
   * Sorts by a column, flipping direction when already active.
   *
   * @param key - Column key.
   */
  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setDirection(key === "player" ? "asc" : "desc");
  }

  return (
    <section className="rounded-xl border border-(--bc-line) bg-(--bc-surface) p-4 sm:p-5">
      <SectionHeading eyebrow="Squad matrix" title="Player DNA">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Filter players</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter players"
              className="ease w-40 rounded-lg border border-(--bc-line) bg-(--bc-surface-soft) px-3 py-1.5 text-[11px] tracking-wide text-(--bc-ink) outline-none placeholder:text-(--bc-quiet) focus-visible:border-(--bc-accent)"
            />
          </label>
          <SegmentedControl
            label="Cell style"
            options={DENSITY_OPTIONS}
            value={density}
            onChange={setDensity}
          />
        </div>
      </SectionHeading>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0">
          <thead>
            <tr>
              <SortableHeader
                label="Player"
                title="player name"
                align="left"
                sticky
                isActive={sortKey === "player"}
                direction={direction}
                onSort={() => handleSort("player")}
              />
              {stats.map((stat) => (
                <SortableHeader
                  key={stat.key}
                  label={stat.shortLabel}
                  title={stat.label}
                  isActive={sortKey === stat.key}
                  direction={direction}
                  onSort={() => handleSort(stat.key)}
                />
              ))}
              <SortableHeader
                label="W"
                title="match wins"
                isActive={sortKey === "matchWins"}
                direction={direction}
                onSort={() => handleSort("matchWins")}
              />
              <SortableHeader
                label="SW"
                title="set wins"
                isActive={sortKey === "setWins"}
                direction={direction}
                onSort={() => handleSort("setWins")}
              />
            </tr>
          </thead>
          <tbody>
            {visible.map((player) => {
              const isSelected = player.player === selectedPlayer.player;
              return (
                <tr
                  key={player.player}
                  className={
                    isSelected
                      ? "bg-(--bc-accent-soft)/70"
                      : "hover:bg-(--bc-surface-soft)"
                  }
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 border-t border-(--bc-line-soft) p-1 shadow-[1px_0_0_var(--bc-line-soft)] ${
                      isSelected
                        ? "bg-(--bc-accent-soft)"
                        : "bg-(--bc-surface)"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectPlayer(player.player)}
                      aria-pressed={isSelected}
                      className="ease flex w-full min-w-[120px] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-(--bc-ink) hover:text-(--bc-accent)"
                    >
                      <PlayerAvatar
                        player={player.player}
                        size={28}
                        highlighted={isSelected}
                      />
                      <strong className="truncate text-xs uppercase">
                        {player.player}
                      </strong>
                    </button>
                  </th>
                  {stats.map((stat) => {
                    const value = readGameStat(player, stat.key, statMode);
                    const intensity = value / maximums[stat.key];
                    return (
                      <td
                        key={stat.key}
                        className={`border-t border-(--bc-line-soft) p-1 ${
                          stat.key === activeStat
                            ? "bg-(--bc-accent-soft)/50"
                            : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPlayer(player.player);
                            onSelectStat(stat.key);
                          }}
                          title={`${player.player} — ${stat.label}`}
                          className={`ease grid h-11 w-full place-items-center rounded-md text-[11px] font-black ${cellTone(
                            density,
                            intensity,
                          )}`}
                        >
                          <span>
                            {formatGameStat(value, statMode === "total" ? 0 : 1)}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-t border-(--bc-line-soft) px-2 text-right text-sm font-black text-(--bc-accent)">
                    {player.matchWins}
                  </td>
                  <td className="border-t border-(--bc-line-soft) px-2 text-right text-sm font-black text-(--bc-muted)">
                    {player.setWins}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Sorts game stats players by a column.
 *
 * @param players - Rows.
 * @param key - Sort key.
 * @param direction - Asc/desc.
 * @param mode - Stat mode.
 * @param stats - Columns.
 * @returns Sorted copy.
 */
function sortPlayers(
  players: GamePlayer[],
  key: SortKey,
  direction: SortDirection,
  mode: StatMode,
  stats: GameStatColumn[],
): GamePlayer[] {
  const factor = direction === "asc" ? 1 : -1;
  const def = stats.find((stat) => stat.key === key);
  return players.toSorted((a, b) => {
    if (key === "player") return a.player.localeCompare(b.player) * factor;
    if (key === "matchWins") return (a.matchWins - b.matchWins) * factor;
    if (key === "setWins") return (a.setWins - b.setWins) * factor;
    const delta = readGameStat(a, key, mode) - readGameStat(b, key, mode);
    return def?.lowerIsBetter ? -delta * factor : delta * factor;
  });
}

/**
 * Computes maxima for heatmap intensity.
 *
 * @param players - Rows.
 * @param stats - Columns.
 * @param mode - Mode.
 * @returns Max per key.
 */
function getMaximums(
  players: GamePlayer[],
  stats: GameStatColumn[],
  mode: StatMode,
): Record<string, number> {
  const maximums: Record<string, number> = {};
  for (const stat of stats) {
    let max = 0;
    for (const player of players) {
      const value = Math.abs(readGameStat(player, stat.key, mode));
      if (value > max) max = value;
    }
    maximums[stat.key] = Math.max(max, 1);
  }
  return maximums;
}

/**
 * Heatmap cell classes.
 *
 * @param density - Heatmap or plain.
 * @param intensity - Relative intensity.
 * @returns Class string.
 */
function cellTone(density: Density, intensity: number): string {
  if (density === "plain")
    return "bg-(--bc-heat-wash) text-(--bc-ink) hover:bg-(--bc-accent-soft)";
  if (intensity > 0.84)
    return "bg-(--bc-heat-high) text-(--bc-heat-high-ink)";
  if (intensity > 0.62)
    return "bg-(--bc-heat-mid) text-(--bc-heat-mid-ink)";
  if (intensity > 0.35) return "bg-(--bc-heat-low) text-(--bc-ink)";
  return "bg-(--bc-heat-wash) text-(--bc-muted)";
}
