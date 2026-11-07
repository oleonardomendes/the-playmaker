import { describe, expect, it } from "vitest";
import { Rng } from "./rng";
import { simulateQuickMatch, simulateTestRound } from "./sim/quickMatch";
import { generateWorld } from "./world/generate";
import { migrateSave, SCHEMA_VERSION, SaveTooNewError } from "../lib/save/migrations";

describe("Rng", () => {
  it("é determinístico para a mesma semente", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it("retoma do estado salvo exatamente de onde parou", () => {
    const a = new Rng(7);
    a.next();
    const resumed = new Rng(a.state());
    expect(resumed.next()).toBe(a.next());
  });
});

describe("generateWorld", () => {
  it("gera o mesmo mundo para a mesma semente", () => {
    expect(generateWorld(123)).toEqual(generateWorld(123));
  });

  it("cria 20 clubes com elencos completos", () => {
    const world = generateWorld(1);
    const clubs = Object.values(world.clubs);
    expect(clubs).toHaveLength(20);
    for (const club of clubs) {
      expect(club.playerIds.length).toBe(22);
      for (const id of club.playerIds) expect(world.players[id]).toBeDefined();
    }
  });
});

describe("simulateQuickMatch — calibração", () => {
  const N = 20000;
  const rng = new Rng(2027);
  let goals = 0;
  let draws = 0;
  let homeWins = 0;
  let awayWins = 0;
  for (let i = 0; i < N; i++) {
    const r = simulateQuickMatch(rng, "a", "b", 70, 70);
    goals += r.homeGoals + r.awayGoals;
    if (r.homeGoals === r.awayGoals) draws++;
    else if (r.homeGoals > r.awayGoals) homeWins++;
    else awayWins++;
  }

  it("tem média de gols parecida com a do futebol brasileiro", () => {
    const avg = goals / N;
    expect(avg).toBeGreaterThan(2.2);
    expect(avg).toBeLessThan(2.7);
  });

  it("tem taxa de empates realista", () => {
    expect(draws / N).toBeGreaterThan(0.22);
    expect(draws / N).toBeLessThan(0.32);
  });

  it("dá vantagem ao mandante", () => {
    expect(homeWins).toBeGreaterThan(awayWins * 1.4);
  });

  it("favorece o time mais forte", () => {
    const r2 = new Rng(9);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 5000; i++) {
      const r = simulateQuickMatch(r2, "a", "b", 60, 80);
      if (r.awayGoals > r.homeGoals) strongWins++;
      else if (r.homeGoals > r.awayGoals) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins * 2);
  });
});

describe("simulateTestRound", () => {
  it("simula 10 jogos e avança o estado do gerador", () => {
    const world = generateWorld(5);
    const { world: next, results } = simulateTestRound(world);
    expect(results).toHaveLength(10);
    expect(next.rng).not.toEqual(world.rng);
  });
});

describe("migrateSave", () => {
  it("aceita saves da versão atual", () => {
    const save = migrateSave({ schemaVersion: SCHEMA_VERSION, id: "x" });
    expect(save.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("recusa saves de uma versão mais nova do jogo", () => {
    expect(() => migrateSave({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(SaveTooNewError);
  });
});
