import { H1 } from "@/components/headings";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { gameImages, GamesEnum, getGamesNav } from "@/lib/constants";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllGames } from "prisma/lib/games";
import { getAllSessionsByGame } from "prisma/lib/admin";
import { assembleGameViewModel } from "./[slug]/_helpers/game-view-model";
import { FeaturedMatchup } from "./_components/featured-matchup";

/**
 * Games index content: nav cards plus a featured Matchup for Rocket League.
 *
 * @returns Games page body.
 */
async function GamesContent() {
  const games = await getGamesNav();
  const matchup = await loadFeaturedMatchup();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
      <H1>Games</H1>
      <div className="mt-8 flex flex-wrap justify-center gap-10">
        {games.map((game) => (
          <div key={game.url}>
            {game.src ? (
              <Card className="group relative aspect-square h-52 w-full min-w-24 overflow-hidden transition-transform duration-700 sm:w-52">
                <Link href={game.url} className="relative block h-full w-full">
                  <Image
                    className="object-cover transition-transform duration-500 group-hover:scale-125"
                    fill
                    sizes="(max-width: 639px) 100vw, 208px"
                    alt=""
                    src={game.src}
                  />
                  <CardHeader className="relative h-1/4 bg-black/50">
                    <CardTitle className="absolute font-extrabold text-white opacity-100">
                      {game.name}
                    </CardTitle>
                  </CardHeader>
                </Link>
              </Card>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-14">
        {matchup ? (
          <FeaturedMatchup
            gameName={matchup.gameName}
            players={matchup.players}
            stats={matchup.stats}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Featured matchup unavailable.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Loads a game view model for the featured Matchup (Rocket League first).
 *
 * @returns Slim matchup props, or null when data is missing.
 */
async function loadFeaturedMatchup() {
  const games = await getAllGames();
  if (!games.success || !games.data) return null;

  const featured =
    games.data.find((game) => game.gameName === "Rocket League") ??
    games.data[0];
  if (!featured) return null;

  const slug = featured.gameName.replace(/\s/g, "").toLowerCase() as GamesEnum;
  const imagePath = gameImages[slug];
  const sessionsResult = await getAllSessionsByGame(featured.gameId);
  const sessions =
    sessionsResult.success && sessionsResult.data ? sessionsResult.data : [];

  const viewModel = assembleGameViewModel(
    sessions,
    featured.gameName,
    slug,
    imagePath ? `/images/${imagePath}` : "",
  );

  return {
    gameName: viewModel.gameName,
    players: viewModel.players,
    stats: viewModel.stats,
  };
}

/**
 * Games index route.
 *
 * @returns Suspense-wrapped games content.
 */
export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="m-16 h-72 w-full" />}>
      <GamesContent />
    </Suspense>
  );
}
