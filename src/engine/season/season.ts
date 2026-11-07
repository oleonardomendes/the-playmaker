import { addDays, daysBetween } from "../calendar/date";
import { buildSeason } from "../competitions/build";
import { knockoutContext, tieWinner } from "../competitions/fixtures";
import { progressCompetitions } from "../competitions/progress";
import { groupStandings, leagueTable } from "../competitions/standings";
import { simulateMatch, type MatchOutcome, type MatchSetup, type SideSetup } from "../match/engine";
import { pickLineup } from "../match/tactics";
import { teamStrength } from "../sim/quickMatch";
import type { Competition, Fixture, Mentality, SeasonRecord, Tier, World } from "../types";
import { emptySeason, generateWorld } from "../world/generate";

/**
 * Ciclo da temporada: avançar dias, jogar as partidas do dia, aplicar
 * consequências (cartões, lesões, desgaste) e virar o ano com acessos e
 * rebaixamentos. Estas funções MUTAM o mundo recebido — no app elas rodam
 * dentro do Web Worker, sobre a cópia que ele recebeu.
 */

/** Recuperação física por dia de descanso (o preparador físico melhora isso na fase 6). */
export const RECOVERY_PER_DAY = 5.5;

export function createWorld(seed: number): World {
  const world = generateWorld(seed);
  buildSeason(world);
  return world;
}

export function chooseClub(world: World, clubId: string) {
  if (!world.clubs[clubId]) throw new Error("Clube não encontrado.");
  world.user = { clubId };
}

/* ---------- Escalações ---------- */

function hashSeed(text: string, base: number): number {
  let h = 2166136261 ^ base;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

/** A IA ajusta a postura ao adversário: mais cautela contra quem é bem mais forte. */
function aiMentality(world: World, clubId: string, oppId: string, home: boolean): Mentality {
  const own = teamStrength(world, world.clubs[clubId]) + (home ? 3 : 0);
  const opp = teamStrength(world, world.clubs[oppId]) + (home ? 0 : 3);
  if (own < opp - 6) return "cautelosa";
  if (own > opp + 6) return "ofensiva";
  return world.clubs[clubId].tactic.mentality;
}

export function sideSetup(world: World, fixture: Fixture, clubId: string, opts: { live?: boolean } = {}): SideSetup {
  const club = world.clubs[clubId];
  const isUser = world.user?.clubId === clubId;
  const home = fixture.home === clubId;
  const opp = home ? fixture.away : fixture.home;
  const tactic = { ...club.tactic };
  if (!isUser) tactic.mentality = aiMentality(world, clubId, opp, home);
  const lineup = pickLineup(world, clubId, tactic.formation, fixture.comp, isUser ? { lineup: tactic.lineup, bench: tactic.bench } : undefined);
  return {
    clubId,
    tactic,
    starters: lineup.starters,
    bench: lineup.bench,
    // Ao vivo, você comanda seu time; nas partidas simuladas, o auxiliar faz as trocas.
    auto: !(isUser && opts.live),
  };
}

export function matchSetup(world: World, fixture: Fixture, opts: { live?: boolean } = {}): MatchSetup {
  const userInvolved = Boolean(world.user && (fixture.home === world.user.clubId || fixture.away === world.user.clubId));
  return {
    home: sideSetup(world, fixture, fixture.home, opts),
    away: sideSetup(world, fixture, fixture.away, opts),
    seed: hashSeed(fixture.id, world.seed),
    detailed: userInvolved,
    neutral: fixture.neutral,
    knockout: knockoutContext(world, fixture),
  };
}

/* ---------- Aplicar o resultado ---------- */

/** Jogadores que estavam suspensos nesta competição na hora do jogo (cumprem a suspensão). */
function bannedAtKickoff(world: World, fixture: Fixture): string[] {
  const comp = world.competitions[fixture.comp];
  const ids = [...world.clubs[fixture.home].playerIds, ...world.clubs[fixture.away].playerIds];
  return ids.filter((id) => (comp.discipline[id]?.banned ?? 0) > 0);
}

export function applyOutcome(world: World, fixture: Fixture, outcome: MatchOutcome, served: string[]) {
  const comp = world.competitions[fixture.comp];
  for (const id of served) {
    const d = comp.discipline[id];
    if (d) d.banned = Math.max(0, d.banned - 1);
  }

  const result = { ...outcome.result };
  if (!result.ratings) delete result.ratings;
  fixture.result = result;

  for (const [id, minutes] of Object.entries(outcome.minutes)) {
    const p = world.players[id];
    if (!p) continue;
    p.condition = outcome.conditions[id] ?? p.condition;
    if (minutes > 0) {
      p.season.apps += 1;
      p.season.ratingSum += outcome.ratings[id] ?? 6;
    }
  }

  const yellows = new Map<string, number>();
  const reds = new Set<string>();
  for (const [, type, , playerId, extra] of result.events) {
    const p = world.players[playerId];
    if (!p) continue;
    if (type === "G") {
      p.season.goals += 1;
      if (extra && world.players[extra]) world.players[extra].season.assists += 1;
    } else if (type === "Y") {
      p.season.yellow += 1;
      yellows.set(playerId, (yellows.get(playerId) ?? 0) + 1);
    } else if (type === "R") {
      p.season.red += 1;
      reds.add(playerId);
    }
  }
  // Disciplina: 3 amarelos = 1 jogo de suspensão; vermelho = 1 jogo (o 2º amarelo não conta para a soma).
  for (const [id, count] of yellows) {
    if (reds.has(id)) continue;
    const d = (comp.discipline[id] ??= { yellow: 0, banned: 0 });
    d.yellow += count;
    if (d.yellow >= 3) {
      d.yellow -= 3;
      d.banned += 1;
    }
  }
  for (const id of reds) {
    const d = (comp.discipline[id] ??= { yellow: 0, banned: 0 });
    d.banned += 1;
  }

  for (const injury of outcome.injuries) {
    const p = world.players[injury.playerId];
    if (p) p.injury = { name: injury.name, until: addDays(fixture.date, injury.days) };
  }
}

/* ---------- Dias ---------- */

export function userFixtureOn(world: World, date: string): Fixture | undefined {
  const clubId = world.user?.clubId;
  if (!clubId) return undefined;
  return (world.schedule[date] ?? [])
    .map((id) => world.fixtures[id])
    .find((f) => f && (f.home === clubId || f.away === clubId));
}

/** Próxima data (a partir de hoje) que ainda tem partida a jogar. */
export function nextMatchDate(world: World): string | undefined {
  const dates = Object.keys(world.schedule).filter((d) => d >= world.date).sort();
  for (const date of dates) {
    if (world.schedule[date].some((id) => !world.fixtures[id]?.result)) return date;
  }
  return undefined;
}

/** Próximas partidas do seu clube, já definidas (mata-mata aparece quando é sorteado). */
export function upcomingUserFixtures(world: World, limit = 5): Fixture[] {
  const clubId = world.user?.clubId;
  if (!clubId) return [];
  return Object.values(world.fixtures)
    .filter((f) => !f.result && (f.home === clubId || f.away === clubId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/** Avança o relógio: recupera o físico e libera quem já voltou de lesão. */
export function moveTo(world: World, date: string) {
  const days = daysBetween(world.date, date);
  if (days <= 0) return;
  world.date = date;
  for (const p of Object.values(world.players)) {
    if (p.condition < 100) p.condition = Math.min(100, p.condition + RECOVERY_PER_DAY * days);
    if (p.injury && p.injury.until <= date) delete p.injury;
  }
}

export interface DayReport {
  date: string;
  played: number;
  /** Competições que mudaram de fase ou terminaram hoje. */
  changed: string[];
}

/** Joga todas as partidas de hoje. A sua pode vir pronta (partida ao vivo). */
export function playToday(world: World, userOutcome?: MatchOutcome): DayReport {
  const touched = new Set<string>();
  let played = 0;
  for (const id of world.schedule[world.date] ?? []) {
    const fixture = world.fixtures[id];
    if (!fixture || fixture.result) continue;
    const isUser = world.user && (fixture.home === world.user.clubId || fixture.away === world.user.clubId);
    const served = bannedAtKickoff(world, fixture);
    const outcome = isUser && userOutcome ? userOutcome : simulateMatch(world.players, matchSetup(world, fixture), world.season);
    applyOutcome(world, fixture, outcome, served);
    touched.add(fixture.comp);
    played += 1;
  }
  const changed = progressCompetitions(world, touched);
  return { date: world.date, played, changed };
}

export type AdvanceStop =
  | { kind: "match"; fixtureId: string; days: DayReport[] }
  | { kind: "day"; days: DayReport[] }
  | { kind: "season-end"; days: DayReport[] };

export function seasonOver(world: World): boolean {
  return Object.values(world.competitions).every((c) => c.done);
}

/**
 * Avança até o próximo dia de jogo do seu clube (sem jogar essa partida).
 * Sem clube escolhido, avança só um dia de jogos.
 */
export function advance(world: World): AdvanceStop {
  const days: DayReport[] = [];
  for (let guard = 0; guard < 400; guard++) {
    if (seasonOver(world)) return { kind: "season-end", days };
    const next = nextMatchDate(world);
    if (!next) return { kind: "season-end", days };
    moveTo(world, next);
    const userFixture = userFixtureOn(world, next);
    if (userFixture && !userFixture.result) return { kind: "match", fixtureId: userFixture.id, days };
    days.push(playToday(world));
    if (!world.user) return { kind: "day", days };
  }
  return { kind: "day", days };
}

/* ---------- Virada de temporada ---------- */

function koWinnersOf(world: World, comp: Competition, stageIndex: number): string[] {
  return comp.stages[stageIndex]?.ties.map((t) => t.winnerId ?? tieWinner(world, t)).filter((x): x is string => Boolean(x)) ?? [];
}

/** Melhor colocação de cada clube local (sem divisão nacional) nos estaduais. */
function localRanking(world: World): string[] {
  const entries: Array<{ id: string; pos: number; strength: number; cup: boolean }> = [];
  for (const comp of Object.values(world.competitions)) {
    if (comp.kind === "copa-estadual" && comp.championId && world.clubs[comp.championId].tier === "E") {
      entries.push({ id: comp.championId, pos: -1, strength: teamStrength(world, world.clubs[comp.championId]), cup: true });
    }
    if (comp.kind !== "estadual") continue;
    leagueTable(world, comp).forEach((row, i) => {
      if (world.clubs[row.clubId].tier === "E") {
        entries.push({ id: row.clubId, pos: i, strength: teamStrength(world, world.clubs[row.clubId]), cup: false });
      }
    });
  }
  const best = new Map<string, (typeof entries)[number]>();
  for (const e of entries) {
    const cur = best.get(e.id);
    if (!cur || e.pos < cur.pos) best.set(e.id, e);
  }
  return [...best.values()].sort((a, b) => a.pos - b.pos || b.strength - a.strength).map((e) => e.id);
}

const LOCAL_PROMOTIONS = 8;

/** Fecha a temporada: campeões, acessos, rebaixamentos e o histórico. */
export function endSeason(world: World): SeasonRecord {
  const comps = world.competitions;
  const record: SeasonRecord = {
    season: world.season,
    champions: {},
    serieA: leagueTable(world, comps.a).map((r) => r.clubId),
    promoted: { A: [], B: [], C: [], D: [] },
    relegated: { A: [], B: [], C: [], D: [] },
  };
  for (const comp of Object.values(comps)) {
    if (comp.championId) record.champions[comp.id] = { name: comp.name, clubId: comp.championId };
  }

  const b = leagueTable(world, comps.b).map((r) => r.clubId);
  const cFirst = leagueTable(world, comps.c, 0).map((r) => r.clubId);
  record.relegated.A = record.serieA.slice(16);
  record.promoted.B = b.slice(0, 4);
  record.relegated.B = b.slice(16);
  record.promoted.C = comps.c.stages[1].groups.flatMap((g) => groupStandings(world, comps.c, 1, g.name).slice(0, 2).map((r) => r.clubId));
  record.relegated.C = cFirst.slice(16);
  record.promoted.D = koWinnersOf(world, comps.d, 3);
  record.relegated.D = comps.d.stages[0].groups.map((g) => groupStandings(world, comps.d, 0, g.name).at(-1)!.clubId);

  const scorer = Object.values(world.players).reduce((best, p) => (p.season.goals > (best?.season.goals ?? -1) ? p : best), undefined as (typeof world.players)[string] | undefined);
  if (scorer) record.topScorer = { playerId: scorer.id, name: scorer.knownAs, clubId: scorer.clubId, goals: scorer.season.goals };

  if (world.user) record.user = { clubId: world.user.clubId, summary: userSummary(world, world.user.clubId) };

  // Novas divisões.
  const setTier = (id: string, tier: Tier) => (world.clubs[id].tier = tier);
  record.relegated.A.forEach((id) => setTier(id, "B"));
  record.promoted.B.forEach((id) => setTier(id, "A"));
  record.relegated.B.forEach((id) => setTier(id, "C"));
  record.promoted.C.forEach((id) => setTier(id, "B"));
  record.relegated.C.forEach((id) => setTier(id, "D"));
  record.promoted.D.forEach((id) => setTier(id, "C"));
  record.relegated.D.forEach((id) => setTier(id, "E"));
  const locals = localRanking(world).filter((id) => world.clubs[id].tier === "E" && !record.relegated.D.includes(id));
  locals.slice(0, LOCAL_PROMOTIONS).forEach((id) => setTier(id, "D"));

  const divisions: World["divisions"] = { A: [], B: [], C: [], D: [] };
  for (const club of Object.values(world.clubs)) {
    if (club.tier === "A" || club.tier === "B" || club.tier === "C" || club.tier === "D") divisions[club.tier].push(club.id);
  }
  world.divisions = divisions;
  world.history.push(record);
  return record;
}

/** Começa a temporada seguinte: elencos descansados, números zerados e novo calendário. */
export function startNextSeason(world: World) {
  world.season += 1;
  world.date = `${world.season}-01-10`;
  for (const p of Object.values(world.players)) {
    p.condition = 100;
    p.season = emptySeason();
  }
  buildSeason(world);
}

/** Uma frase sobre a campanha do seu clube na temporada. */
export function userSummary(world: World, clubId: string): string {
  const club = world.clubs[clubId];
  const parts: string[] = [];
  const titles = Object.values(world.competitions).filter((c) => c.championId === clubId).map((c) => c.name);
  if (titles.length) parts.push(`Campeão: ${titles.join(", ")}`);
  const league = Object.values(world.competitions).find((c) => c.kind === "liga" && c.clubIds.includes(clubId));
  if (league) {
    const pos = leagueTable(world, league).findIndex((r) => r.clubId === clubId);
    if (pos >= 0) parts.push(`${pos + 1}º na ${league.name}`);
  }
  if (!league && club.tier === "E") parts.push("Sem divisão nacional");
  return parts.join(" · ") || "Temporada encerrada";
}
