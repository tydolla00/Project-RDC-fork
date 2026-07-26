# Project RDC — Game Stats

Domain language for the interactive game stats UI and shared Matchup module.

## Language

**Matchup**:
A head-to-head comparison of two fighters across a game's stat columns, with dual HP bars and a staggered category list.
_Avoid_: Compare panel, versus widget (when referring to the shared module)

**Fighter**:
A named player row carrying match/set wins and per-stat totals/averages for a Matchup.
_Avoid_: GamePlayer when speaking across call sites — adapt into Fighter at the Matchup seam

**Game Stat Catalog**:
The canonical mapping from a game to ordered display columns (key, labels, lower-is-better, ranking key), derived from `STAT_CONFIGS`.
_Avoid_: STATS_BY_GAME, ad-hoc column arrays in UI

**Game View Model**:
The server-assembled, serialisable payload for one game's stats UI: banner, MVP, active stats, players, session cards, and raw sessions for the MatchData dialog.
_Avoid_: DeskViewModel, GameDashboardData, broadcast payload

**Game URL State**:
The selection model for the stats UI (tab, mode, active stat, focused player, Matchup fighters, open session), mirrored into the URL.
_Avoid_: Spreading URL reads across panels; Desk State

**Game Stats**:
The game `[slug]` page shell that renders ticker, hero, control board, and tabs over a Game View Model.
_Avoid_: Prototype, broadcast grid, performance desk (legacy names)

## Relationships

- A **Game Stat Catalog** produces columns for one game
- A **Game View Model** includes players and columns for one game
- A **Matchup** consumes **Fighters** and columns; Game Stats and the Games index are adapters
- **Game URL State** drives which tab and Matchup fighters Game Stats shows

## Example dialogue

> **Dev:** "Can the Games index reuse the compare UI?"
> **Domain expert:** "Yes — both pages adapt into the same **Matchup**. The index builds **Fighters** from a featured game's **Game View Model**; it does not own a second compare implementation."

## Flagged ambiguities

- "Compare" in the UI tab label maps to the **Matchup** module — keep the tab label user-facing; use **Matchup** in code and docs.
