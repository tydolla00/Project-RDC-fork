"use client";

import Image from "next/image";
import {
  PlayerMatchup,
  toMatchupFighter,
} from "@/components/matchup/player-matchup";
import {
  formatGameStat,
  getGameStatLeader,
  readGameStat,
  type GameViewModel,
} from "../../_helpers/game-view-model";
import { OverviewPanel } from "./overview-panel";
import { PlayersPanel } from "./players-panel";
import { SessionsPanel } from "./sessions-panel";
import "./game-stats.css";
import { SegmentedControl } from "./stats-ui";
import { useGameUrlState } from "./use-game-url-state";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "players", label: "Players" },
  { key: "compare", label: "Compare" },
  { key: "sessions", label: "Sessions" },
] as const;

const STAT_MODE_OPTIONS = [
  { key: "total", label: "Totals" },
  { key: "average", label: "Averages" },
] as const;

/**
 * Game stats shell entry: validates the view model before URL state / panels mount.
 *
 * @param props - Assembled game view model from the server.
 * @returns The game stats, or an empty-state shell.
 */
export function GameStats({ data }: { data: GameViewModel }) {
  if (!data?.players || !data.stats)
    return (
      <div className="game-stats p-10">
        Game stats data is unavailable. Refresh to reload this game.
      </div>
    );

  if (data.players.length === 0 || data.stats.length === 0)
    return (
      <div className="game-stats p-10">
        No player stats available for {data.gameName} yet.
      </div>
    );

  return <GameStatsReady data={data} />;
}

/**
 * Game stats chrome + panels. Selection state lives in `useGameUrlState`.
 *
 * @param props - Validated game view model with players and stats.
 * @returns The interactive game stats.
 */
function GameStatsReady({ data }: { data: GameViewModel }) {
  const players = data.players;
  const stats = data.stats;
  const defaultPlayer = data.mvp?.playerName ?? players[0]?.player ?? "";
  const state = useGameUrlState({
    players,
    statKeys: stats.map((stat) => stat.key),
    defaultPlayer,
  });

  const selected =
    players.find((player) => player.player === state.selectedPlayer) ??
    players[0];
  const left =
    players.find((player) => player.player === state.compareLeft) ??
    players[0];
  const right =
    players.find((player) => player.player === state.compareRight) ??
    players[1] ??
    players[0];
  const activeDef = stats.find((stat) => stat.key === state.activeStat);
  const leader = activeDef
    ? getGameStatLeader(players, activeDef, state.mode)
    : null;

  if (!selected || !left || !right)
    return (
      <div className="game-stats p-10">
        No player stats available for {data.gameName} yet.
      </div>
    );

  const fighters = players.map(toMatchupFighter);

  return (
    <div className="game-stats min-h-screen">
        <div
          aria-label="Live stats feed"
          className="overflow-hidden border-b border-(--bc-line) bg-(--bc-ticker-bg) py-2 text-(--bc-ticker-ink)"
        >
          <div className="flex w-max animate-stats-marquee will-change-transform motion-reduce:animate-none">
            <TickerTrack
              gameName={data.gameName}
              activeLabel={activeDef?.label ?? ""}
              leaderName={leader?.player ?? "—"}
              leaderValue={formatGameStat(
                leader
                  ? readGameStat(leader, state.activeStat, state.mode)
                  : 0,
                state.mode === "total" ? 0 : 1,
              )}
              matchCount={data.banner.totalMatches}
              lastPlayed={data.banner.lastPlayed ?? "—"}
              selectedPlayer={selected.player}
            />
            <TickerTrack
              ariaHidden
              gameName={data.gameName}
              activeLabel={activeDef?.label ?? ""}
              leaderName={leader?.player ?? "—"}
              leaderValue={formatGameStat(
                leader
                  ? readGameStat(leader, state.activeStat, state.mode)
                  : 0,
                state.mode === "total" ? 0 : 1,
              )}
              matchCount={data.banner.totalMatches}
              lastPlayed={data.banner.lastPlayed ?? "—"}
              selectedPlayer={selected.player}
            />
          </div>
        </div>

        <header className="border-b border-(--bc-line) bg-(--bc-surface) px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-(--bc-accent) text-xs font-black text-(--bc-accent-ink)">
                R
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-sm tracking-wider uppercase">
                  {data.gameName}
                </strong>
                <span className="text-[9px] tracking-[0.25em] text-(--bc-quiet) uppercase">
                  Game stats
                </span>
              </div>
            </div>

            <nav
              aria-label="Game stats sections"
              className="flex w-full max-w-full gap-1 overflow-x-auto rounded-lg border border-(--bc-line) bg-(--bc-bg) p-1 sm:w-auto"
            >
              {TABS.map((entry) => {
                const isActive = entry.key === state.tab;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() =>
                      state.updateParams({
                        tab: entry.key === "overview" ? null : entry.key,
                        session:
                          entry.key === "sessions"
                            ? String(state.openSessionId ?? "")
                            : null,
                      })
                    }
                    className={`shrink-0 rounded-md px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors duration-200 ease ${
                      isActive
                        ? "bg-(--bc-accent) text-(--bc-accent-ink)"
                        : "text-(--bc-muted) hover:bg-(--bc-surface) hover:text-(--bc-ink)"
                    }`}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <section className="border-b border-(--bc-line) bg-(--bc-surface)">
          <div className="mx-auto grid max-w-[1600px] xl:grid-cols-[1.2fr_1fr]">
            <div className="relative min-h-[200px] overflow-hidden border-b border-(--bc-line) sm:min-h-[240px] xl:border-r xl:border-b-0">
              {data.gameImage ? (
                <Image
                  src={data.gameImage}
                  alt=""
                  fill
                  priority
                  sizes="60vw"
                  className="object-cover"
                />
              ) : null}
              <div className="game-stats-hero-scrim absolute inset-0" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 text-(--bc-hero-ink) sm:p-6">
                <h1 className="max-w-2xl text-3xl leading-[0.95] font-black tracking-[-0.04em] uppercase sm:text-4xl">
                  {data.gameName}
                  <span className="mt-1 block text-(--bc-hero-accent)">
                    {data.banner.totalMatches} matches logged
                  </span>
                </h1>
              </div>
            </div>

            <aside className="flex flex-col gap-3 bg-(--bc-surface-soft) p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[9px] font-bold tracking-[0.25em] text-(--bc-accent) uppercase">
                  Control board
                </span>
                <SegmentedControl
                  label="Stat mode"
                  options={STAT_MODE_OPTIONS}
                  value={state.mode}
                  onChange={(next) =>
                    state.updateParams({
                      mode: next === "total" ? null : next,
                    })
                  }
                />
              </div>

              <div
                role="group"
                aria-label="Active statistic"
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {data.stats.map((stat) => {
                  const isActive = stat.key === state.activeStat;
                  const tip = getGameStatLeader(
                    data.players,
                    stat,
                    state.mode,
                  );
                  return (
                    <button
                      key={stat.key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => state.updateParams({ stat: stat.key })}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ease ${
                        isActive
                          ? "border-(--bc-accent) bg-(--bc-accent) text-(--bc-accent-ink)"
                          : "border-(--bc-line) bg-(--bc-surface) hover:border-(--bc-accent)/40"
                      }`}
                    >
                      <span
                        className={`block text-[8px] font-bold tracking-widest uppercase ${
                          isActive
                            ? "text-(--bc-accent-ink)/70"
                            : "text-(--bc-quiet)"
                        }`}
                      >
                        {stat.shortLabel}
                      </span>
                      <strong className="mt-1 block text-base leading-none font-black">
                        {formatGameStat(
                          tip
                            ? readGameStat(tip, stat.key, state.mode)
                            : 0,
                          state.mode === "total" ? 0 : 1,
                        )}
                      </strong>
                      <span
                        className={`mt-1 block truncate text-[9px] uppercase ${
                          isActive
                            ? "text-(--bc-accent-ink)/70"
                            : "text-(--bc-muted)"
                        }`}
                      >
                        {tip?.player ?? "—"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-(--bc-line) bg-(--bc-surface) p-3">
                <span className="text-[9px] font-bold tracking-widest text-(--bc-quiet) uppercase">
                  Focused player
                </span>
                <strong className="mt-1 block text-xl font-black uppercase">
                  {selected.player}
                </strong>
                <p className="mt-1 text-[11px] text-(--bc-muted)">
                  {formatGameStat(
                    readGameStat(selected, state.activeStat, state.mode),
                    state.mode === "total" ? 0 : 1,
                  )}{" "}
                  {activeDef?.label.toLowerCase() ?? "stat"} ·{" "}
                  {selected.matchWins} match wins
                </p>
              </div>
            </aside>
          </div>
        </section>

        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6">
          {state.tab === "overview" ? (
            <OverviewPanel
              players={data.players}
              stats={data.stats}
              activeStat={state.activeStat}
              statMode={state.mode}
              selectedPlayer={selected}
              sessions={data.sessions}
              mvp={data.mvp}
              onSelectPlayer={(player) =>
                state.updateParams({ player, vsA: player })
              }
              onSelectStat={(stat) => state.updateParams({ stat })}
              onOpenSession={(sessionId) =>
                state.updateParams({
                  tab: "sessions",
                  session: String(sessionId),
                })
              }
              onCompare={(player) => {
                const alternate =
                  data.players.find((entry) => entry.player !== player)
                    ?.player ?? player;
                state.updateParams({
                  tab: "compare",
                  player,
                  vsA: player,
                  vsB:
                    state.compareRight === player
                      ? alternate
                      : state.compareRight,
                });
              }}
            />
          ) : null}

          {state.tab === "players" ? (
            <PlayersPanel
              players={data.players}
              stats={data.stats}
              activeStat={state.activeStat}
              statMode={state.mode}
              selectedPlayer={selected}
              onSelectPlayer={(player) =>
                state.updateParams({ player, vsA: player })
              }
              onSelectStat={(stat) => state.updateParams({ stat })}
            />
          ) : null}

          {state.tab === "compare" && left && right ? (
            <PlayerMatchup
              fighters={fighters}
              left={toMatchupFighter(left)}
              right={toMatchupFighter(right)}
              stats={data.stats.map((stat) => ({
                key: stat.key,
                label: stat.label,
                lowerIsBetter: stat.lowerIsBetter,
              }))}
              activeStat={state.activeStat}
              mode={state.mode}
              onSelectLeft={(name) => state.updateParams({ vsA: name })}
              onSelectRight={(name) => state.updateParams({ vsB: name })}
              onSelectStat={(stat) => state.updateParams({ stat })}
            />
          ) : null}

          {state.tab === "sessions" ? (
            <SessionsPanel
              sessions={data.sessions}
              stats={data.stats}
              rawSessions={data.sessionsRaw}
              openSessionId={state.openSessionId}
              onOpenSession={(sessionId) =>
                state.updateParams({ session: String(sessionId) })
              }
              onCloseSession={() => state.updateParams({ session: null })}
            />
          ) : null}
        </div>
    </div>
  );
}

/**
 * One ticker sequence for the marquee.
 *
 * @param props - Feed values and optional aria-hidden clone flag.
 * @returns Ticker segment.
 */
function TickerTrack({
  gameName,
  activeLabel,
  leaderName,
  leaderValue,
  matchCount,
  lastPlayed,
  selectedPlayer,
  ariaHidden = false,
}: {
  gameName: string;
  activeLabel: string;
  leaderName: string;
  leaderValue: string;
  matchCount: number;
  lastPlayed: string;
  selectedPlayer: string;
  ariaHidden?: boolean;
}) {
  return (
    <div
      aria-hidden={ariaHidden || undefined}
      className="flex shrink-0 items-center gap-10 px-5 text-[10px] font-black tracking-[0.22em] uppercase"
    >
      <span className="text-(--bc-ticker-accent)">
        {gameName} stats feed
      </span>
      <span>•</span>
      <span>
        {activeLabel} leader: {leaderName} ({leaderValue})
      </span>
      <span>•</span>
      <span>{matchCount} matches archived</span>
      <span>•</span>
      <span>Last update {lastPlayed}</span>
      <span>•</span>
      <span>Selected: {selectedPlayer}</span>
      <span>•</span>
    </div>
  );
}
