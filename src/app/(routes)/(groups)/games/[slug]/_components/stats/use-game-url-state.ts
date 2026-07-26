"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffectEvent } from "react";
import type { GamePlayer, StatMode } from "../../_helpers/game-view-model";

const TABS = ["overview", "players", "compare", "sessions"] as const;
export type GameStatsTab = (typeof TABS)[number];

/**
 * Game stats selection state mirrored into the URL. Shells render; this module owns
 * the URL seam.
 *
 * @param props - Players, stats, and MVP default name from the view model.
 * @returns Parsed state and patch helpers.
 */
export function useGameUrlState({
  players,
  statKeys,
  defaultPlayer,
}: {
  players: GamePlayer[];
  statKeys: string[];
  defaultPlayer: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: GameStatsTab =
    tabParam === "players" ||
    tabParam === "compare" ||
    tabParam === "sessions" ||
    tabParam === "overview"
      ? tabParam
      : "overview";

  const mode: StatMode =
    searchParams.get("mode") === "average" ? "average" : "total";

  const activeStat =
    statKeys.find((key) => key === searchParams.get("stat")) ??
    statKeys[0] ??
    "";

  const selectedPlayer =
    players.find((player) => player.player === searchParams.get("player"))
      ?.player ?? defaultPlayer;

  const compareLeft =
    players.find((player) => player.player === searchParams.get("vsA"))
      ?.player ?? selectedPlayer;

  const compareRight =
    players.find((player) => player.player === searchParams.get("vsB"))
      ?.player ??
    players.find((player) => player.player !== compareLeft)?.player ??
    selectedPlayer;

  const sessionParam = searchParams.get("session");
  const openSessionId = sessionParam ? Number(sessionParam) : null;

  /**
   * Merges game stats state into the URL while preserving unrelated params.
   *
   * @param patch - Keys to set; null deletes.
   */
  const updateParams = useEffectEvent(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
  );

  return {
    tab,
    mode,
    activeStat,
    selectedPlayer,
    compareLeft,
    compareRight,
    openSessionId:
      openSessionId !== null && !Number.isNaN(openSessionId)
        ? openSessionId
        : null,
    updateParams,
  };
}
