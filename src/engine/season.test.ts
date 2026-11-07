import { describe, expect, it } from "vitest";
import { toDay } from "./calendar/date";
import { leagueTable } from "./competitions/standings";
import { advance, chooseClub, createWorld, endSeason, playToday, seasonOver, startNextSeason } from "./season/season";

describe("temporada completa", () => {
  const world = createWorld(2027);
  const fixturesAtStart = Object.keys(world.fixtures).length;
  const userClub = world.divisions.A[3];
  chooseClub(world, userClub);
  let userMatches = 0;
  for (let i = 0; i < 400 && !seasonOver(world); i++) {
    const stop = advance(world);
    if (stop.kind === "match") {
      playToday(world);
      userMatches++;
    }
    if (stop.kind === "season-end") break;
  }

  it("cria as competições do futebol brasileiro", () => {
    const ids = Object.keys(world.competitions);
    for (const id of ["a", "b", "c", "d", "copa", "lib", "sul"]) expect(ids).toContain(id);
    expect(ids.filter((id) => id.startsWith("est-"))).toHaveLength(27);
    expect(fixturesAtStart).toBeGreaterThan(2500);
  });

  it("termina todas as competições, com campeão", () => {
    expect(seasonOver(world)).toBe(true);
    for (const c of Object.values(world.competitions)) {
      expect(c.done).toBe(true);
      expect(c.championId).toBeDefined();
    }
  });

  it("nenhum clube joga duas vezes com menos de 3 dias de intervalo", () => {
    const byClub = new Map<string, number[]>();
    for (const f of Object.values(world.fixtures)) {
      for (const id of [f.home, f.away]) byClub.set(id, [...(byClub.get(id) ?? []), toDay(f.date)]);
    }
    for (const days of byClub.values()) {
      days.sort((a, b) => a - b);
      for (let i = 1; i < days.length; i++) expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(3);
    }
  });

  it("a Série A tem 38 rodadas e o clube grande joga uma temporada cheia", () => {
    const table = leagueTable(world, world.competitions.a);
    for (const row of table) expect(row.played).toBe(38);
    expect(userMatches).toBeGreaterThanOrEqual(50);
    expect(userMatches).toBeLessThanOrEqual(80);
  });

  it("aplica suspensões, lesões e desgaste", () => {
    const players = Object.values(world.players);
    expect(players.some((p) => p.season.red > 0)).toBe(true);
    const served = Object.values(world.competitions).some((c) => Object.values(c.discipline).some((d) => d.banned === 0));
    expect(served).toBe(true);
    const injuredFixtures = Object.values(world.fixtures).filter((f) => f.result?.events.some((e) => e[1] === "I"));
    expect(injuredFixtures.length).toBeGreaterThan(100);
  });

  it("guarda detalhes só das partidas do seu clube", () => {
    for (const f of Object.values(world.fixtures)) {
      const mine = f.home === userClub || f.away === userClub;
      expect(Boolean(f.result?.ratings)).toBe(mine);
    }
  });

  it("vira a temporada com acessos, rebaixamentos e vagas continentais", () => {
    const record = endSeason(world);
    expect(record.relegated.A).toHaveLength(4);
    expect(record.promoted.B).toHaveLength(4);
    expect(record.promoted.C).toHaveLength(4);
    expect(record.promoted.D).toHaveLength(4);
    expect(world.divisions.A).toHaveLength(20);
    expect(world.divisions.B).toHaveLength(20);
    expect(world.divisions.C).toHaveLength(20);
    expect(world.divisions.D).toHaveLength(64);
    for (const id of record.promoted.B) expect(world.clubs[id].tier).toBe("A");
    expect(record.user?.clubId).toBe(userClub);

    startNextSeason(world);
    expect(world.season).toBe(2028);
    expect(world.competitions.a.clubIds.sort()).toEqual([...world.divisions.A].sort());
    // O campeão da Série A está na Copa Continental do ano seguinte.
    expect(world.competitions.lib.clubIds).toContain(record.serieA[0]);
    expect(world.competitions.lib.clubIds).toContain(record.champions.copa.clubId);
    for (const p of Object.values(world.players).slice(0, 50)) expect(p.season.apps).toBe(0);
  });
});
