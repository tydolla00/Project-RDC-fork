"use client";

import { useState } from "react";
import {
  PlayerMatchup,
  toMatchupFighter,
} from "@/components/matchup/player-matchup";
import type { GamePlayer } from "../[slug]/_helpers/game-view-model";
import type { GameStatColumn } from "@/lib/game-stat-catalog";

/**
 * Games-index Matchup adapter: local fighter/stat selection over a prebuilt
 * game player roster for one featured game.
 *
 * @param props - Featured game label, players, and stat columns.
 * @returns Matchup UI or empty notice.
 */
export function FeaturedMatchup({
  gameName,
  players,
  stats,
}: {
  gameName: string;
  players: GamePlayer[];
  stats: GameStatColumn[];
}) {
  const roster = players ?? [];
  const columns = stats ?? [];
  const [leftName, setLeftName] = useState(roster[0]?.player ?? "");
  const [rightName, setRightName] = useState(
    roster.find((player) => player.player !== roster[0]?.player)?.player ??
      roster[0]?.player ??
      "",
  );
  const [activeStat, setActiveStat] = useState(columns[0]?.key ?? "");
  const [mode, setMode] = useState<"total" | "average">("total");

  const left = roster.find((player) => player.player === leftName);
  const right = roster.find((player) => player.player === rightName);

  if (!left || !right || columns.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        Not enough {gameName} player data for a matchup yet.
      </p>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-muted-foreground text-[9px] font-bold tracking-[0.25em] uppercase">
            Featured matchup
          </span>
          <h2 className="text-2xl font-black tracking-tight uppercase">
            {gameName}
          </h2>
        </div>
        <div
          role="group"
          aria-label="Stat mode"
          className="flex overflow-hidden rounded-lg border"
        >
          {(["total", "average"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
              className={`px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase ${
                mode === option
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {option === "total" ? "Totals" : "Averages"}
            </button>
          ))}
        </div>
      </div>

      <PlayerMatchup
        fighters={roster.map(toMatchupFighter)}
        left={toMatchupFighter(left)}
        right={toMatchupFighter(right)}
        stats={columns.map((stat) => ({
          key: stat.key,
          label: stat.label,
          lowerIsBetter: stat.lowerIsBetter,
        }))}
        activeStat={activeStat}
        mode={mode}
        onSelectLeft={setLeftName}
        onSelectRight={setRightName}
        onSelectStat={setActiveStat}
      />
    </div>
  );
}
