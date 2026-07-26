"use cache";
import { Suspense } from "react";
import { getAllGames } from "prisma/lib/games";
import { getAllSessionsByGame } from "prisma/lib/admin";
import type { getAllMembers } from "prisma/lib/members";
import { gameImages, GamesEnum } from "@/lib/constants";
import { assembleGameViewModel } from "./_helpers/game-view-model";
import { GameStats } from "./_components/stats/game-stats";

export type Members = NonNullable<
  Awaited<ReturnType<typeof getAllMembers>>["data"]
>;

/**
 * Generates static params for all games for SSG.
 *
 * @returns Array of slug objects for each game.
 */
export async function generateStaticParams() {
  const games = await getAllGames();

  if (!games.success || !games.data || games.data.length === 0)
    return [{ slug: "__placeholder__" }];

  return games.data.map((game) => ({
    slug: game.gameName.replace(/\s/g, "").toLowerCase(),
  }));
}

/**
 * Renders interactive game stats for a single game.
 *
 * @param props - Contains route params with the game slug.
 * @returns The game stats page.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const games = await getAllGames();

  if (!games.success || !games.data || slug === "__placeholder__")
    return <NoGames />;

  const game = games.data.find(
    (g) => g.gameName.replace(/\s/g, "").toLowerCase() === slug,
  );

  if (!game) return <NoGames />;

  const gameImagePath = gameImages[slug as GamesEnum];
  const gameImage = gameImagePath ? `/images/${gameImagePath}` : "";

  const sessionsResult = await getAllSessionsByGame(game.gameId);
  const sessionsData =
    sessionsResult.success && sessionsResult.data ? sessionsResult.data : [];

  const viewModel = assembleGameViewModel(
    sessionsData,
    game.gameName,
    slug,
    gameImage,
  );

  return (
    <Suspense fallback={<StatsFallback />}>
      <GameStats data={viewModel} />
    </Suspense>
  );
}

/**
 * Displays a neutral shell while the client hydrates URL state.
 *
 * @returns A full-width loading placeholder.
 */
function StatsFallback() {
  return (
    <div className="bg-background min-h-[720px] animate-pulse motion-reduce:animate-none" />
  );
}

/**
 * Fallback when no games are found.
 *
 * @returns Empty-state message.
 */
const NoGames = () => (
  <div className="m-16">
    <h1 className="text-3xl font-bold">No games found</h1>
    <p className="text-muted-foreground">
      No games found. Please check back later.
    </p>
  </div>
);
