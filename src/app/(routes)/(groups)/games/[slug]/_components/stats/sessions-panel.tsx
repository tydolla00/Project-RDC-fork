"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GameStatColumn } from "@/lib/game-stat-catalog";
import MatchData from "../match-data";
import {
  formatGameStat,
  type SessionCard,
  type Sessions,
} from "../../_helpers/game-view-model";
import { SectionHeading } from "./stats-ui";

/**
 * Sessions tab with game stats-styled MatchData dialog.
 *
 * @param props - Session cards, raw sessions, and dialog state.
 * @returns The sessions panel.
 */
export function SessionsPanel({
  sessions,
  stats,
  rawSessions,
  openSessionId,
  onOpenSession,
  onCloseSession,
}: {
  sessions: SessionCard[];
  stats: GameStatColumn[];
  rawSessions: Sessions;
  openSessionId: number | null;
  onOpenSession: (sessionId: number) => void;
  onCloseSession: () => void;
}) {
  const openSession =
    openSessionId === null
      ? undefined
      : rawSessions.find((session) => session.sessionId === openSessionId);
  const openSummary =
    openSessionId === null
      ? undefined
      : sessions.find((session) => session.sessionId === openSessionId);
  const previewStats = stats.slice(0, 3);

  return (
    <>
      <section className="rounded-xl border border-(--bc-line) bg-(--bc-surface) p-4 sm:p-5">
        <SectionHeading eyebrow="Archive" title="Session browser">
          <span className="text-[9px] font-bold tracking-widest text-(--bc-quiet) uppercase">
            {sessions.length} sessions
          </span>
        </SectionHeading>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <li key={session.sessionId}>
              <article className="overflow-hidden rounded-xl border border-(--bc-line) bg-(--bc-surface-soft)">
                <button
                  type="button"
                  onClick={() => onOpenSession(session.sessionId)}
                  className="group block w-full text-left"
                >
                  <span className="relative block aspect-video">
                    {session.thumbnail ? (
                      <Image
                        src={session.thumbnail}
                        alt=""
                        fill
                        sizes="(max-width: 1280px) 50vw, 360px"
                        className="object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    ) : null}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
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
                      {session.mvpName ? ` · MVP ${session.mvpName}` : ""}
                    </span>
                  </span>
                </button>

                {previewStats.length > 0 ? (
                  <div className="grid grid-cols-3 gap-px border-t border-(--bc-line) bg-(--bc-line)">
                    {previewStats.map((stat) => (
                      <div
                        key={stat.key}
                        className="bg-(--bc-surface) px-2 py-2"
                      >
                        <span className="block text-[8px] font-bold tracking-widest text-(--bc-quiet) uppercase">
                          {stat.shortLabel}
                        </span>
                        <strong className="font-mono text-xs text-(--bc-ink)">
                          {formatGameStat(session.totals[stat.key] ?? 0)}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-2 border-t border-(--bc-line) p-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenSession(session.sessionId)}
                    className="ease flex-1 rounded-lg bg-(--bc-accent) px-3 py-1.5 text-[9px] font-black tracking-widest text-(--bc-accent-ink) uppercase hover:bg-(--bc-accent-hover)"
                  >
                    Stats
                  </button>
                  {session.sessionUrl ? (
                    <a
                      href={session.sessionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ease flex-1 rounded-lg border border-(--bc-accent)/35 px-3 py-1.5 text-center text-[9px] font-black tracking-widest text-(--bc-accent) uppercase hover:bg-(--bc-accent-soft)"
                    >
                      Watch
                    </a>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <Dialog
        open={openSessionId !== null}
        onOpenChange={(open) => {
          if (!open) onCloseSession();
        }}
      >
        <DialogContent className="h-[min(92vh,900px)] max-w-3xl gap-0 overflow-hidden border-(--bc-line) bg-(--bc-surface) p-0 text-(--bc-ink) sm:rounded-xl">
          <DialogHeader className="space-y-1 border-b border-(--bc-line) px-5 py-4">
            <DialogTitle className="text-lg font-black tracking-tight uppercase">
              {openSummary?.sessionName ?? "Session"}
            </DialogTitle>
            <DialogDescription className="text-(--bc-muted)">
              {openSummary
                ? `${openSummary.date} · ${openSummary.setCount} sets · ${openSummary.matchCount} matches`
                : "Detailed match and set stats"}
            </DialogDescription>
            {openSummary?.sessionUrl ? (
              <a
                href={openSummary.sessionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pt-1 text-sm font-semibold text-(--bc-accent) underline-offset-2 hover:underline"
              >
                Open VOD in new tab
              </a>
            ) : null}
          </DialogHeader>
          <ScrollArea className="h-[calc(min(92vh,900px)-120px)] px-5">
            <div className="py-4">
              <MatchData session={openSession} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
