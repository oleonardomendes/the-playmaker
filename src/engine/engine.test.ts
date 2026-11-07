import { describe, expect, it } from "vitest";
import { Rng } from "./rng";
import { simulateQuickMatch, teamStrength } from "./sim/quickMatch";
import { generateWorld, makeShortName, squadPositions } from "./world/generate";
import { STATES } from "./world/geography";
import { applyPack, exportPack, PackError, parsePack } from "./pack";
import type { Club } from "./types";
import { migrateSave, SCHEMA_VERSION, SaveTooNewError } from "../lib/save/migrations";

const world = generateWorld(2027);
const clubs = Object.values(world.clubs);
const players = Object.values(world.players);
const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;

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

describe("generateWorld — tamanho e estrutura", () => {
  it("gera o mesmo mundo para a mesma semente", () => {
    expect(generateWorld(123)).toEqual(generateWorld(123));
  });

  it("tem ~300 clubes brasileiros, 60 estrangeiros e ~9 mil jogadores", () => {
    expect(clubs.filter((c) => c.country === "BR")).toHaveLength(302);
    expect(clubs.filter((c) => c.country !== "BR")).toHaveLength(60);
    expect(players.length).toBeGreaterThan(8500);
    expect(players.length).toBeLessThan(10500);
  });

  it("monta as Séries A, B, C e D com o tamanho certo", () => {
    expect(world.divisions.A).toHaveLength(20);
    expect(world.divisions.B).toHaveLength(20);
    expect(world.divisions.C).toHaveLength(20);
    expect(world.divisions.D).toHaveLength(64);
  });

  it("tem os 27 estados, cada um com clubes suficientes para um estadual", () => {
    expect(Object.keys(world.states)).toHaveLength(STATES.length);
    for (const s of Object.values(world.states)) expect(s.clubIds.length).toBeGreaterThanOrEqual(6);
  });

  it("não repete nome nem sigla de clube", () => {
    expect(new Set(clubs.map((c) => c.name)).size).toBe(clubs.length);
    expect(new Set(clubs.map((c) => c.shortName)).size).toBe(clubs.length);
  });

  it("liga cada jogador ao seu clube", () => {
    for (const c of clubs) {
      for (const id of c.playerIds) expect(world.players[id].clubId).toBe(c.id);
    }
  });

  it("monta elencos com pelo menos 2 goleiros e todas as posições", () => {
    for (const size of [23, 24, 25, 26, 28, 30]) {
      const positions = squadPositions(size);
      expect(positions).toHaveLength(size);
      expect(positions.filter((p) => p === "GOL").length).toBeGreaterThanOrEqual(2);
      expect(new Set(positions).size).toBe(9);
    }
  });
});

describe("generateWorld — realismo", () => {
  const strengthOf = (ids: string[]) => avg(ids.map((id) => teamStrength(world, world.clubs[id])));

  it("a força média cai de uma série para a seguinte", () => {
    const a = strengthOf(world.divisions.A);
    const b = strengthOf(world.divisions.B);
    const c = strengthOf(world.divisions.C);
    const d = strengthOf(world.divisions.D);
    expect(a).toBeGreaterThan(b + 3);
    expect(b).toBeGreaterThan(c + 3);
    expect(c).toBeGreaterThan(d + 3);
  });

  it("clubes da Série A têm mais torcida e prestígio que os da Série D", () => {
    const fans = (ids: string[]) => avg(ids.map((id) => world.clubs[id].fans));
    const prestige = (ids: string[]) => avg(ids.map((id) => world.clubs[id].prestige));
    expect(fans(world.divisions.A)).toBeGreaterThan(fans(world.divisions.D) * 10);
    expect(prestige(world.divisions.A)).toBeGreaterThan(prestige(world.divisions.D) + 25);
  });

  it("tem idades realistas e potencial nunca abaixo da força atual", () => {
    const ages = players.map((p) => world.season - p.birthYear);
    expect(Math.min(...ages)).toBeGreaterThanOrEqual(17);
    expect(Math.max(...ages)).toBeLessThanOrEqual(39);
    expect(avg(ages)).toBeGreaterThan(24);
    expect(avg(ages)).toBeLessThan(28);
    for (const p of players) expect(p.potential).toBeGreaterThanOrEqual(p.overall);
  });

  it("garotos têm mais margem de evolução que veteranos", () => {
    const gap = (min: number, max: number) =>
      avg(
        players
          .filter((p) => {
            const age = world.season - p.birthYear;
            return age >= min && age <= max;
          })
          .map((p) => p.potential - p.overall),
      );
    expect(gap(17, 20)).toBeGreaterThan(gap(30, 39) + 8);
  });

  it("clubes brasileiros grandes têm alguns estrangeiros; os pequenos quase nenhum", () => {
    const foreignShare = (ids: string[]) => {
      const squad = ids.flatMap((id) => world.clubs[id].playerIds.map((p) => world.players[p]));
      return squad.filter((p) => p.nationality !== "BR").length / squad.length;
    };
    expect(foreignShare(world.divisions.A)).toBeGreaterThan(0.03);
    const stateOnly = clubs.filter((c) => c.tier === "E").map((c) => c.id);
    expect(foreignShare(stateOnly)).toBe(0);
  });

  it("todo clube tem pelo menos um rival, e as rivalidades são recíprocas", () => {
    for (const c of clubs) {
      expect(c.rivals.length).toBeGreaterThan(0);
      for (const r of c.rivals) {
        expect(world.clubs[r.clubId].rivals.some((back) => back.clubId === c.id)).toBe(true);
      }
    }
  });

  it("clubes da mesma cidade são rivais", () => {
    const byCity = new Map<string, Club[]>();
    for (const c of clubs) byCity.set(`${c.country}-${c.city}`, [...(byCity.get(`${c.country}-${c.city}`) ?? []), c]);
    for (const group of byCity.values()) {
      if (group.length < 2) continue;
      for (const c of group) {
        for (const other of group) {
          if (other.id !== c.id) expect(c.rivals.some((r) => r.clubId === other.id)).toBe(true);
        }
      }
    }
  });
});

describe("makeShortName", () => {
  it("cria siglas de 3 letras sem acento e sem repetir", () => {
    const taken = new Set<string>();
    const a = makeShortName("Itaquara Esporte Clube", taken);
    const b = makeShortName("Associação Atlética Itaquará", taken);
    expect(a).toBe("ITA");
    expect(b).toMatch(/^[A-Z]{3}$/);
    expect(b).not.toBe(a);
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
    expect(goals / N).toBeGreaterThan(2.2);
    expect(goals / N).toBeLessThan(2.7);
  });

  it("tem taxa de empates realista", () => {
    expect(draws / N).toBeGreaterThan(0.22);
    expect(draws / N).toBeLessThan(0.32);
  });

  it("dá vantagem ao mandante", () => {
    expect(homeWins).toBeGreaterThan(awayWins * 1.4);
  });
});

describe("packs", () => {
  it("exporta e reimporta o banco sem mudar nada", () => {
    const { world: same, report } = applyPack(world, parsePack(exportPack(world)));
    expect(report.skipped).toEqual([]);
    expect(report.clubs).toBe(clubs.length);
    expect(same.clubs).toEqual(world.clubs);
    expect(same.players).toEqual(world.players);
  });

  it("renomeia clubes e jogadores", () => {
    const club = clubs[0];
    const player = players[0];
    const pack = parsePack({
      formato: "the-playmaker-pack",
      versao: 1,
      nome: "Teste",
      clubes: [{ id: club.id, nome: "Clube Renomeado", sigla: "cre", cores: ["#000000", "#FFFFFF"] }],
      jogadores: [{ id: player.id, nome: "Craque" }],
    });
    const { world: next, report } = applyPack(world, pack);
    expect(report).toEqual({ clubs: 1, players: 1, skipped: [] });
    expect(next.clubs[club.id].name).toBe("Clube Renomeado");
    expect(next.clubs[club.id].shortName).toBe("CRE");
    expect(next.clubs[club.id].colors).toEqual(["#000000", "#ffffff"]);
    expect(next.players[player.id].knownAs).toBe("Craque");
    // O mundo original não é alterado.
    expect(world.clubs[club.id].name).toBe(club.name);
  });

  it("ignora itens inválidos sem perder os válidos", () => {
    const pack = parsePack({
      formato: "the-playmaker-pack",
      versao: 1,
      clubes: [
        { id: "nao-existe", nome: "X" },
        { id: clubs[1].id, cores: ["vermelho", "azul"] },
        { id: clubs[2].id, nome: "Válido" },
      ],
    });
    const { report } = applyPack(world, pack);
    expect(report.clubs).toBe(1);
    expect(report.skipped).toHaveLength(2);
  });

  it("recusa arquivos que não são packs", () => {
    expect(() => parsePack({ foo: 1 })).toThrow(PackError);
    expect(() => parsePack({ formato: "the-playmaker-pack", versao: 99 })).toThrow(PackError);
  });
});

describe("migrateSave", () => {
  it("aceita saves da versão atual", () => {
    expect(migrateSave({ schemaVersion: SCHEMA_VERSION, id: "x" }).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("converte o save da fase 0 num mundo completo com a mesma semente", () => {
    const save = migrateSave({ schemaVersion: 1, id: "x", world: { seed: 55, clubs: {} } });
    expect(save.world.seed).toBe(55);
    expect(save.world.divisions.A).toHaveLength(20);
  });

  it("recusa saves de uma versão mais nova do jogo", () => {
    expect(() => migrateSave({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(SaveTooNewError);
  });
});
