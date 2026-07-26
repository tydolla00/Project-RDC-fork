"use client";

import Image from "next/image";
import { findPlayer } from "@/app/(routes)/admin/_utils/player-mappings";
import type { MatchupFighter, MatchupMode, MatchupStat } from "./types";

/**
 * Fighting-game Matchup: dual HP bars and a staggered category list.
 * Desk and games index both adapt into this interface.
 *
 * @param props - Roster, selected fighters, stats, and selection handlers.
 * @returns The Matchup UI.
 */
export function PlayerMatchup({
  fighters,
  left,
  right,
  stats,
  activeStat,
  mode,
  onSelectLeft,
  onSelectRight,
  onSelectStat,
}: {
  fighters: MatchupFighter[];
  left: MatchupFighter;
  right: MatchupFighter;
  stats: MatchupStat[];
  activeStat: string;
  mode: MatchupMode;
  onSelectLeft: (name: string) => void;
  onSelectRight: (name: string) => void;
  onSelectStat: (statKey: string) => void;
}) {
  const leftWins = countWins(left, right, stats, mode);
  const rightWins = stats.length - leftWins;
  const activeDef = stats.find((stat) => stat.key === activeStat);
  const leftHp = activeDef ? readStat(left, activeDef.key, mode) : leftWins;
  const rightHp = activeDef ? readStat(right, activeDef.key, mode) : rightWins;
  const hpMax = Math.max(leftHp, rightHp, 1);
  const matchupKey = `${left.name}-${right.name}-${mode}-${activeStat}`;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <span className="text-[9px] font-bold tracking-[0.25em] text-sky-500 uppercase">
            Versus
          </span>
          <h2 className="mt-1 text-xl font-black tracking-tight uppercase sm:text-2xl">
            Head to head
          </h2>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {leftWins}–{rightWins} categories
        </span>
      </div>

      <div className="grid gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:grid-cols-2 sm:px-5">
        <PlayerPicker
          label="P1"
          fighters={fighters}
          value={left.name}
          exclude={right.name}
          onChange={onSelectLeft}
          tone="p1"
        />
        <PlayerPicker
          label="P2"
          fighters={fighters}
          value={right.name}
          exclude={left.name}
          onChange={onSelectRight}
          tone="p2"
        />
      </div>

      <div
        key={`hud-${matchupKey}`}
        className="relative border-b border-border bg-[linear-gradient(180deg,hsl(240_3.7%_10%),hsl(0_0%_6.6%))] px-3 py-5 text-white sm:px-6 sm:py-6 dark:bg-[linear-gradient(180deg,hsl(240_3.7%_12%),hsl(0_0%_6.6%))]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,.45))]" />

        <div className="relative grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
          <FightSide
            fighter={left}
            tone="p1"
            value={leftHp}
            max={hpMax}
            label={activeDef?.label ?? "Categories"}
            digits={mode === "total" ? 0 : 1}
          />

          <div className="order-first flex flex-col items-center justify-center sm:order-none">
            <span className="grid h-14 w-14 -skew-x-6 place-items-center border-2 border-white/20 bg-black/50 font-black shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)] sm:h-16 sm:w-16">
              <i className="skew-x-6 text-lg not-italic sm:text-xl">VS</i>
            </span>
            <span className="mt-2 font-mono text-[10px] tracking-[0.2em] text-white/55 uppercase">
              {leftWins}:{rightWins}
            </span>
          </div>

          <FightSide
            fighter={right}
            tone="p2"
            value={rightHp}
            max={hpMax}
            label={activeDef?.label ?? "Categories"}
            digits={mode === "total" ? 0 : 1}
            mirror
          />
        </div>
      </div>

      <ul key={`stats-${matchupKey}`} className="space-y-2 p-4 sm:p-5">
        {stats.map((stat, index) => {
          const leftValue = readStat(left, stat.key, mode);
          const rightValue = readStat(right, stat.key, mode);
          const max = Math.max(leftValue, rightValue, 1);
          const isActive = stat.key === activeStat;
          const leftLeads = stat.lowerIsBetter
            ? leftValue <= rightValue
            : leftValue >= rightValue;

          return (
            <li
              key={stat.key}
              className="animate-compare-stat-drop motion-reduce:animate-none"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <button
                type="button"
                onClick={() => onSelectStat(stat.key)}
                aria-pressed={isActive}
                className={`w-full -skew-x-3 border px-4 py-3 text-left transition-colors duration-200 ease ${
                  isActive
                    ? "border-sky-500/50 bg-sky-500/10"
                    : "border-border bg-muted/30 hover:border-foreground/20"
                }`}
              >
                <div className="skew-x-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                      className={`text-[9px] font-black tracking-[0.22em] uppercase ${
                        isActive ? "text-sky-400" : "text-muted-foreground"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")} / {stat.label}
                    </span>
                    <span className="font-mono text-xs">
                      <strong
                        className={leftLeads ? "text-[#ffb020]" : "opacity-40"}
                      >
                        {formatValue(leftValue, mode === "total" ? 0 : 1)}
                      </strong>
                      <span className="mx-2 opacity-20">·</span>
                      <strong
                        className={!leftLeads ? "text-[#2ad4c7]" : "opacity-40"}
                      >
                        {formatValue(rightValue, mode === "total" ? 0 : 1)}
                      </strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <DuelBar
                      ratio={leftValue / max}
                      tone="p1"
                      leading={leftLeads}
                    />
                    <DuelBar
                      ratio={rightValue / max}
                      tone="p2"
                      leading={!leftLeads}
                      mirror
                    />
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Adapts a desk-style player row into a Matchup fighter.
 *
 * @param player - Player with match/set wins and stats.
 * @returns Matchup fighter.
 */
export function toMatchupFighter(player: {
  player: string;
  matchWins: number;
  setWins: number;
  stats: Record<string, { total: number; average: number }>;
}): MatchupFighter {
  return {
    name: player.player,
    matchWins: player.matchWins,
    setWins: player.setWins,
    stats: player.stats,
  };
}

/**
 * Counts categories the left fighter leads.
 *
 * @param left - Left fighter.
 * @param right - Right fighter.
 * @param stats - Categories.
 * @param mode - Total or average.
 * @returns Win count for left.
 */
function countWins(
  left: MatchupFighter,
  right: MatchupFighter,
  stats: MatchupStat[],
  mode: MatchupMode,
): number {
  let wins = 0;
  for (const stat of stats) {
    const leftValue = readStat(left, stat.key, mode);
    const rightValue = readStat(right, stat.key, mode);
    if (stat.lowerIsBetter ? leftValue <= rightValue : leftValue >= rightValue)
      wins += 1;
  }
  return wins;
}

/**
 * Reads a fighter stat in the requested mode.
 *
 * @param fighter - Matchup fighter.
 * @param key - Stat key.
 * @param mode - Total or average.
 * @returns Numeric value.
 */
function readStat(
  fighter: MatchupFighter,
  key: string,
  mode: MatchupMode,
): number {
  const value = fighter.stats[key];
  if (!value) return 0;
  return mode === "total" ? value.total : value.average;
}

/**
 * Formats a compact numeric value.
 *
 * @param value - Number to format.
 * @param digits - Fraction digits.
 * @returns Localized string.
 */
function formatValue(value: number, digits: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * One side of the versus HUD.
 *
 * @param props - Fighter, tone, HP value, and mirror flag.
 * @returns Fight-side block.
 */
function FightSide({
  fighter,
  tone,
  value,
  max,
  label,
  digits,
  mirror = false,
}: {
  fighter: MatchupFighter;
  tone: "p1" | "p2";
  value: number;
  max: number;
  label: string;
  digits: number;
  mirror?: boolean;
}) {
  const ratio = Math.max(Math.min(value / max, 1), 0.04);
  const fill =
    tone === "p1"
      ? "linear-gradient(90deg,#ffcf4d,#ff8a1a)"
      : "linear-gradient(90deg,#1fd6c8,#39a8ff)";
  const image = findPlayer(fighter.name)?.image ?? "";

  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${
        mirror ? "flex-row-reverse text-right" : ""
      }`}
    >
      <div
        className={`relative shrink-0 rotate-45 overflow-hidden border-2 bg-black/40 ${
          tone === "p1" ? "border-[#ffb020]" : "border-[#2ad4c7]"
        }`}
        style={{ width: 52, height: 52 }}
      >
        <div className="absolute inset-0 -rotate-45 scale-125">
          {image ? (
            <Image src={image} alt="" fill sizes="52px" className="object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-sm font-black text-[#ffb020]">
              {fighter.name.slice(0, 1)}
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={`flex items-baseline justify-between gap-2 ${
            mirror ? "flex-row-reverse" : ""
          }`}
        >
          <strong className="truncate text-sm font-black tracking-wide uppercase sm:text-base">
            {fighter.name}
          </strong>
          <span className="shrink-0 font-mono text-[11px] text-white/70">
            {formatValue(value, digits)}
            <span className="text-white/35">/{formatValue(max, digits)}</span>
          </span>
        </div>
        <span
          className={`mt-0.5 block text-[8px] font-bold tracking-[0.2em] text-white/40 uppercase ${
            mirror ? "text-right" : ""
          }`}
        >
          {label} · {fighter.matchWins}W
        </span>
        <div
          className={`mt-2 h-3.5 overflow-hidden border border-black/60 bg-black/55 ${
            mirror ? "skew-x-6" : "-skew-x-6"
          }`}
        >
          <div
            className="h-full origin-left animate-compare-hp-fill motion-reduce:animate-none"
            style={{
              width: `${ratio * 100}%`,
              backgroundImage: fill,
              transformOrigin: mirror ? "right center" : "left center",
              marginLeft: mirror ? "auto" : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact duel meter for a category row.
 *
 * @param props - Ratio, tone, lead state, mirror.
 * @returns Duel bar.
 */
function DuelBar({
  ratio,
  tone,
  leading,
  mirror = false,
}: {
  ratio: number;
  tone: "p1" | "p2";
  leading: boolean;
  mirror?: boolean;
}) {
  const width = `${Math.max(Math.min(ratio, 1) * 100, 4)}%`;
  const color =
    tone === "p1"
      ? leading
        ? "#ffb020"
        : "#6b5230"
      : leading
        ? "#2ad4c7"
        : "#2a5a5e";

  return (
    <div
      className={`h-2 overflow-hidden bg-black/40 ${
        mirror ? "skew-x-6" : "-skew-x-6"
      }`}
    >
      <div
        style={{
          width,
          backgroundColor: color,
          marginLeft: mirror ? "auto" : undefined,
        }}
        className="h-full transition-[width] duration-300 [transition-timing-function:cubic-bezier(.215,.61,.355,1)] motion-reduce:transition-none"
      />
    </div>
  );
}

/**
 * Fighter picker for one Matchup slot.
 *
 * @param props - Label, roster, value, exclude, change handler, tone.
 * @returns Select control.
 */
function PlayerPicker({
  label,
  fighters,
  value,
  exclude,
  onChange,
  tone,
}: {
  label: string;
  fighters: MatchupFighter[];
  value: string;
  exclude: string;
  onChange: (name: string) => void;
  tone: "p1" | "p2";
}) {
  return (
    <label className="block">
      <span
        className={`mb-1.5 block text-[9px] font-black tracking-[0.22em] uppercase ${
          tone === "p1" ? "text-[#ffb020]" : "text-[#2ad4c7]"
        }`}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm uppercase outline-none focus-visible:border-sky-500"
      >
        {fighters.map((fighter) => (
          <option
            key={fighter.name}
            value={fighter.name}
            disabled={fighter.name === exclude}
          >
            {fighter.name}
          </option>
        ))}
      </select>
    </label>
  );
}
