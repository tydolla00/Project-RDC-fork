"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { findPlayer } from "@/app/(routes)/admin/_utils/player-mappings";

export type SortDirection = "asc" | "desc";

/**
 * Renders a labelled section heading used across stats panels.
 *
 * @param props - Eyebrow label, title, and optional trailing content.
 * @returns A section heading element.
 */
export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <span className="text-[9px] font-bold tracking-[0.25em] text-(--bc-accent) uppercase">
          {eyebrow}
        </span>
        <h2 className="mt-1 text-xl font-black tracking-tight text-(--bc-ink) uppercase sm:text-2xl">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

/**
 * Renders a segmented control where exactly one option is active.
 *
 * @param props - Options, current value, change handler, and group label.
 * @returns An accessible segmented control.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex overflow-hidden rounded-lg border border-(--bc-line) bg-(--bc-bg)"
    >
      {options.map((option) => {
        const isActive = option.key === value;

        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.key)}
            className={`px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase transition-colors duration-200 ease ${
              isActive
                ? "bg-(--bc-accent) text-(--bc-accent-ink)"
                : "text-(--bc-muted) hover:bg-(--bc-surface) hover:text-(--bc-ink)"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Renders a sortable table header cell with an ascending/descending indicator.
 *
 * @param props - Label, alignment, active state, direction, and click handler.
 * @returns A table header cell containing a sort button.
 */
export function SortableHeader({
  label,
  title,
  isActive,
  direction,
  align = "right",
  sticky = false,
  onSort,
}: {
  label: string;
  title: string;
  isActive: boolean;
  direction: SortDirection;
  align?: "left" | "right";
  sticky?: boolean;
  onSort: () => void;
}) {
  const ariaSort = isActive
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`p-0 ${
        sticky
          ? "sticky left-0 z-20 bg-(--bc-surface) shadow-[1px_0_0_var(--bc-line-soft)]"
          : ""
      }`}
    >
      <button
        type="button"
        onClick={onSort}
        title={`Sort by ${title}`}
        className={`flex w-full items-center gap-1 px-2 py-2 text-[8px] font-bold tracking-widest uppercase transition-colors duration-200 ease hover:text-(--bc-accent) ${
          align === "left" ? "justify-start" : "justify-end"
        } ${isActive ? "text-(--bc-accent)" : "text-(--bc-quiet)"}`}
      >
        {label}
        <span aria-hidden="true" className={isActive ? "" : "opacity-0"}>
          {direction === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

/**
 * Renders a circular player avatar with a monogram fallback.
 *
 * @param props - Player name, pixel size, and optional highlight styling.
 * @returns An avatar element.
 */
export function PlayerAvatar({
  player,
  size = 48,
  highlighted = false,
}: {
  player: string;
  size?: number;
  highlighted?: boolean;
}) {
  const image = findPlayer(player)?.image ?? "";

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-full bg-(--bc-accent-soft) ${
        highlighted
          ? "border-2 border-(--bc-accent)"
          : "border border-(--bc-line)"
      }`}
    >
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-xs font-black text-(--bc-accent)">
          {player.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/**
 * Renders a horizontal comparison bar scaled against a maximum value.
 *
 * @param props - Fill ratio and accent tone.
 * @returns A progress-style bar.
 */
export function StatBar({
  ratio,
  tone = "primary",
}: {
  ratio: number;
  tone?: "primary" | "muted";
}) {
  const width = `${Math.max(Math.min(ratio, 1) * 100, 2)}%`;

  return (
    <div className="h-2 overflow-hidden rounded bg-(--bc-bar-track)">
      <div
        style={{ width }}
        className={`h-full rounded transition-[width] duration-300 [transition-timing-function:cubic-bezier(.215,.61,.355,1)] motion-reduce:transition-none ${
          tone === "primary"
            ? "bg-(--bc-accent)"
            : "bg-(--bc-bar-muted)"
        }`}
      />
    </div>
  );
}
