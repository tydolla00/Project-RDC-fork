"use client";

import Image from "next/image";
import type { GameStatColumn } from "@/lib/game-stat-catalog";
import {
  formatGameStat,
  readGameStat,
  type GameMvp,
  type GamePlayer,
  type SessionCard,
  type StatMode,
} from "../../_helpers/game-view-model";
import { PlayerAvatar, SectionHeading, StatBar } from "./stats-ui";

/**
 * Overview tab: MVP story, standings, spotlight, and latest sessions.
 *
 * @param props - View-model slices and selection handlers.
 * @returns The overview panel.
 */
export function OverviewPanel({
  players,
  stats,
  activeStat,
  statMode,
  selectedPlayer,
  sessions,
  mvp,
  onSelectPlayer,
  onSelectStat,
  onOpenSession,
  onCompare,
}: {
  players: GamePlayer[];
  stats: GameStatColumn[];
  activeStat: string;
  statMode: StatMode;
  selectedPlayer: GamePlayer;
  sessions: SessionCard[];
  mvp: GameMvp;
  onSelectPlayer: (player: string) => void;
  onSelectStat: (stat: string) => void;
  onOpenSession: (sessionId: number) => void;
  onCompare: (player: string) => void;
}) {
  const maximums = getMaximums(players, stats, statMode);
  const ranked = [...players].toSorted((a, b) => {
    const delta =
      readGameStat(a, activeStat, statMode) -
      readGameStat(b, activeStat, statMode);
    const def = stats.find((stat) => stat.key === activeStat);
    return def?.lowerIsBetter ? delta : -delta;
  });
  const activeLabel =
    stats.find((stat) => stat.key === activeStat)?.label ?? "";
  const selectedRank =
    ranked.findIndex((player) => player.player === selectedPlayer.player) + 1;

  return (
    <div className="space-y-5">
      {mvp ? (
        <section className="rounded-xl border border-(--bc-line) bg-(--bc-surface) p-4 sm:p-5">
          <SectionHeading eyebrow="Latest MVP" title={mvp.playerName} />
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
            <PlayerAvatar player={mvp.playerName} size={64} highlighted />
            <p className="max-w-3xl text-sm leading-relaxed text-(--bc-muted)">
              {mvp.description ?? `${mvp.playerName} took the last session.`}
            </p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-(--bc-line) bg-(--bc-surface) p-4 sm:p-5">
          <SectionHeading eyebrow="Standings" title={activeLabel}>
            <span className="text-[9px] font-bold tracking-widest text-(--bc-quiet) uppercase">
              {statMode === "total" ? "Career totals" : "Per-match average"}
            </span>
          </SectionHeading>

          <ul className="mt-4 space-y-1.5">
            {ranked.slice(0, 8).map((player, index) => {
              const value = readGameStat(player, activeStat, statMode);
              const isSelected = player.player === selectedPlayer.player;

              return (
                <li key={player.player}>
                  <button
                    type="button"
                    onClick={() => onSelectPlayer(player.player)}
                    aria-pressed={isSelected}
                    className={`grid w-full grid-cols-[28px_40px_minmax(0,1fr)_88px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ease ${
                      isSelected
                        ? "border-(--bc-accent)/40 bg-(--bc-accent-soft)"
                        : "border-(--bc-line-soft) bg-(--bc-surface-soft) hover:border-(--bc-accent)/30 hover:bg-(--bc-accent-soft)"
                    }`}
                  >
                    <span className="font-mono text-[11px] text-(--bc-quiet)">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <PlayerAvatar
                      player={player.player}
                      size={36}
                      highlighted={isSelected}
                    />
                    <span className="min-w-0">
                      <strong className="block truncate text-sm text-(--bc-ink) uppercase">
                        {player.player}
                      </strong>
                      <span className="mt-1.5 block">
                        <StatBar
                          ratio={value / maximums[activeStat]}
                          tone={isSelected ? "primary" : "muted"}
                        />
                      </span>
                    </span>
                    <span className="text-right">
                      <strong className="block text-lg leading-none font-black text-(--bc-accent)">
                        {formatGameStat(value, statMode === "total" ? 0 : 1)}
                      </strong>
                      <span className="text-[9px] tracking-widest text-(--bc-quiet) uppercase">
                        {player.matchWins}W / {player.setWins}SW
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-(--bc-accent)/20 bg-(--bc-accent-soft) p-4 sm:p-5">
          <SectionHeading eyebrow="Spotlight" title="Player card" />
          <div className="mt-4 flex items-center gap-4">
            <PlayerAvatar player={selectedPlayer.player} size={64} highlighted />
            <div className="min-w-0">
              <strong className="block truncate text-xl font-black text-(--bc-ink) uppercase">
                {selectedPlayer.player}
              </strong>
              <span className="text-[10px] tracking-widest text-(--bc-muted) uppercase">
                #{selectedRank} in {activeLabel} · {selectedPlayer.matchWins}{" "}
                match wins
              </span>
            </div>
          </div>

          <dl className="mt-4 space-y-2.5">
            {stats.map((stat) => {
              const value = readGameStat(selectedPlayer, stat.key, statMode);
              const isActive = stat.key === activeStat;
              return (
                <div key={stat.key}>
                  <button
                    type="button"
                    onClick={() => onSelectStat(stat.key)}
                    aria-pressed={isActive}
                    className="group flex w-full items-baseline justify-between gap-2 text-left"
                  >
                    <dt
                      className={`text-[9px] font-bold tracking-widest uppercase transition-colors duration-200 ease group-hover:text-(--bc-accent) ${
                        isActive
                          ? "text-(--bc-accent)"
                          : "text-(--bc-quiet)"
                      }`}
                    >
                      {stat.label}
                    </dt>
                    <dd className="font-mono text-sm font-bold text-(--bc-ink)">
                      {formatGameStat(value, statMode === "total" ? 0 : 1)}
                    </dd>
                  </button>
                  <div className="mt-1">
                    <StatBar
                      ratio={value / maximums[stat.key]}
                      tone={isActive ? "primary" : "muted"}
                    />
                  </div>
                </div>
              );
            })}
          </dl>

          <button
            type="button"
            onClick={() => onCompare(selectedPlayer.player)}
            className="ease mt-5 w-full rounded-lg bg-(--bc-accent) px-4 py-2.5 text-[10px] font-black tracking-widest text-(--bc-accent-ink) uppercase transition-colors duration-200 hover:bg-(--bc-accent-hover)"
          >
            Compare {selectedPlayer.player}
          </button>
        </section>
      </div>

      <section className="rounded-xl border border-(--bc-line) bg-(--bc-surface) p-4 sm:p-5">
        <SectionHeading eyebrow="Tape room" title="Latest sessions" />
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.slice(0, 3).map((session) => (
            <li key={session.sessionId}>
              <button
                type="button"
                onClick={() => onOpenSession(session.sessionId)}
                className="ease group block w-full overflow-hidden rounded-xl border border-(--bc-line) bg-(--bc-surface-soft) text-left transition-colors duration-200 hover:border-(--bc-accent)/40"
              >
                <span className="relative block aspect-video">
                  {session.thumbnail ? (
                    <Image
                      src={session.thumbnail}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 380px"
                      className="object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                    />
                  ) : null}
                  <span className="absolute right-2 bottom-2 rounded bg-black/85 px-2 py-1 font-mono text-[9px] text-white">
                    {session.setCount} sets · {session.matchCount} matches
                  </span>
                </span>
                <span className="block p-3">
                  <strong className="line-clamp-2 text-xs text-(--bc-ink) uppercase">
                    {session.sessionName}
                  </strong>
                  <span className="mt-1 block text-[9px] tracking-widest text-(--bc-quiet) uppercase">
                    {session.date}
                    {session.topPlayer
                      ? ` · Top: ${session.topPlayer.player}`
                      : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Computes per-stat maxima for bar scaling.
 *
 * @param players - Game players.
 * @param stats - Active columns.
 * @param mode - Total or average.
 * @returns Maximum absolute value per key.
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
