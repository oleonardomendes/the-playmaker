import { describe, expect, it } from "vitest";
import { simulateMatch, MatchSim, type SideSetup } from "./match/engine";
import { FORMATIONS, familiarity, pickLineup } from "./match/tactics";
import { generateWorld } from "./world/generate";
import type { Mentality, World } from "./types";

const world = generateWorld(77);

function side(w: World, clubId: string, mentality: Mentality = "equilibrada"): SideSetup {
  const club = w.clubs[clubId];
  const l = pickLineup(w, clubId, club.tactic.formation);
  return { clubId, tactic: { ...club.tactic, mentality }, starters: l.starters, bench: l.bench, auto: true };
}

describe("motor de partida — calibração com clubes da Série A", () => {
  const ids = world.divisions.A;
  const N = 3000;
  let goals = 0, draws = 0, home = 0, away = 0, yellows = 0, reds = 0, shots = 0;
  for (let i = 0; i < N; i++) {
    const h = ids[i % 20];
    const a = ids[(i * 7 + 3) % 20];
    if (h === a) continue;
    const { result } = simulateMatch(world.players, { home: side(world, h), away: side(world, a), seed: i, detailed: false }, 2027);
    goals += result.hg + result.ag;
    shots += result.stats.shots[0] + result.stats.shots[1];
    if (result.hg === result.ag) draws++;
    else if (result.hg > result.ag) home++;
    else away++;
    for (const e of result.events) {
      if (e[1] === "Y") yellows++;
      if (e[1] === "R") reds++;
    }
  }
  const games = home + away + draws;

  it("tem média de gols e empates parecidas com o Brasileirão", () => {
    expect(goals / games).toBeGreaterThan(2.2);
    expect(goals / games).toBeLessThan(2.8);
    expect(draws / games).toBeGreaterThan(0.22);
    expect(draws / games).toBeLessThan(0.32);
  });

  it("dá vantagem clara ao mandante", () => {
    expect(home).toBeGreaterThan(away * 1.4);
  });

  it("tem cartões e finalizações em números realistas", () => {
    expect(yellows / games).toBeGreaterThan(4);
    expect(yellows / games).toBeLessThan(6.5);
    expect(reds / games).toBeLessThan(0.45);
    expect(shots / games).toBeGreaterThan(18);
    expect(shots / games).toBeLessThan(30);
  });
});

describe("motor de partida — táticas e força", () => {
  const [a, b] = world.divisions.A;
  const run = (n: number, ma: Mentality, mb: Mentality) => {
    let goals = 0;
    for (let i = 0; i < n; i++) {
      const { result } = simulateMatch(world.players, { home: { ...side(world, a, ma), auto: false }, away: { ...side(world, b, mb), auto: false }, seed: 9000 + i, detailed: false }, 2027);
      goals += result.hg + result.ag;
    }
    return goals / n;
  };

  it("jogo aberto (ofensivo x ofensivo) tem mais gols que retranca x retranca", () => {
    expect(run(1500, "ofensiva", "ofensiva")).toBeGreaterThan(run(1500, "defensiva", "defensiva") + 0.6);
  });

  it("o time da Série A vence o da Série D na grande maioria das vezes", () => {
    const strong = world.divisions.A[0];
    const weak = world.divisions.D[0];
    let wins = 0, losses = 0;
    for (let i = 0; i < 600; i++) {
      const { result } = simulateMatch(world.players, { home: side(world, weak), away: side(world, strong), seed: i, detailed: false }, 2027);
      if (result.ag > result.hg) wins++;
      else if (result.hg > result.ag) losses++;
    }
    expect(wins).toBeGreaterThan(losses * 3);
  });

  it("mata-mata empatado sempre termina com vencedor nos pênaltis", () => {
    for (let i = 0; i < 300; i++) {
      const { result } = simulateMatch(world.players, { home: side(world, a), away: side(world, b), seed: i, detailed: true, knockout: { agg: [0, 0] } }, 2027);
      if (result.hg === result.ag) {
        expect(result.pens).toBeDefined();
        expect(result.pens![0]).not.toBe(result.pens![1]);
      } else {
        expect(result.pens).toBeUndefined();
      }
    }
  });

  it("partida detalhada guarda escalações, notas e chances perdidas", () => {
    const o = simulateMatch(world.players, { home: side(world, a), away: side(world, b), seed: 1, detailed: true }, 2027);
    expect(o.result.lineups?.[0]).toHaveLength(11);
    expect(Object.keys(o.result.ratings ?? {}).length).toBeGreaterThanOrEqual(22);
    expect(o.result.events.some((e) => e[1] === "C")).toBe(true);
  });

  it("respeita substituições feitas ao vivo", () => {
    const sim = new MatchSim(world.players, { home: { ...side(world, a), auto: false }, away: side(world, b), seed: 3, detailed: true }, 2027);
    for (let i = 0; i < 30; i++) sim.step();
    const snap = sim.snapshot();
    const out = snap.sides[0].onPitch[5].id;
    const inn = snap.sides[0].bench[0];
    expect(sim.substitute(0, out, inn)).toBeNull();
    const after = sim.snapshot();
    expect(after.sides[0].onPitch.some((p) => p.id === inn)).toBe(true);
    expect(after.sides[0].subsLeft).toBe(4);
    expect(sim.substitute(0, out, inn)).not.toBeNull();
  });
});

describe("escalação automática", () => {
  it("escala 11 com goleiro no gol e banco com goleiro reserva", () => {
    for (const id of world.divisions.A.slice(0, 5)) {
      const club = world.clubs[id];
      const l = pickLineup(world, id, club.tactic.formation);
      expect(l.starters).toHaveLength(11);
      expect(world.players[l.starters[0]].position).toBe("GOL");
      expect(new Set([...l.starters, ...l.bench]).size).toBe(l.starters.length + l.bench.length);
      expect(l.bench.some((p) => world.players[p].position === "GOL")).toBe(true);
    }
  });

  it("deixa de fora lesionados e suspensos", () => {
    const w = generateWorld(5);
    const id = w.divisions.A[0];
    const club = w.clubs[id];
    const first = pickLineup(w, id, club.tactic.formation).starters;
    w.players[first[3]].injury = { name: "Pancada", until: "2099-01-01" };
    w.competitions.x = { id: "x", name: "x", short: "x", kind: "liga", season: 2027, clubIds: [], stages: [], current: 0, discipline: { [first[6]]: { yellow: 0, banned: 1 } }, done: false };
    const second = pickLineup(w, id, club.tactic.formation, "x").starters;
    expect(second).not.toContain(first[3]);
    expect(second).not.toContain(first[6]);
  });

  it("respeita os titulares escolhidos pelo técnico", () => {
    const id = world.divisions.B[0];
    const club = world.clubs[id];
    const auto = pickLineup(world, id, club.tactic.formation);
    const reserve = auto.bench.find((p) => world.players[p].position !== "GOL")!;
    const chosen = [...auto.starters];
    chosen[10] = reserve;
    const l = pickLineup(world, id, club.tactic.formation, undefined, { lineup: chosen, bench: [] });
    expect(l.starters[10]).toBe(reserve);
  });

  it("todas as formações têm 11 posições e um goleiro", () => {
    for (const slots of Object.values(FORMATIONS)) {
      expect(slots).toHaveLength(11);
      expect(slots.filter((p) => p === "GOL")).toHaveLength(1);
    }
    expect(familiarity("ZAG", "ZAG")).toBe(1);
    expect(familiarity("ATA", "GOL")).toBeLessThan(0.5);
  });
});
