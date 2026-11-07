import type { Competition, Fixture, World } from "../types";

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  /** Últimos resultados, do mais antigo ao mais recente: V, E ou D. */
  form: Array<"V" | "E" | "D">;
}

function emptyRow(clubId: string): StandingRow {
  return { clubId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [] };
}

/** Partidas de uma fase de grupos (ou de um grupo específico). */
export function stageFixtures(world: World, comp: Competition, stageIndex: number, group?: string): Fixture[] {
  return Object.values(world.fixtures)
    .filter((f) => f.comp === comp.id && f.stage === stageIndex && (group === undefined || f.group === group))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * Classificação de um grupo. Critérios: pontos, vitórias, saldo, gols pró,
 * e por fim a ordem do sorteio (estável).
 */
export function groupStandings(world: World, comp: Competition, stageIndex: number, groupName: string): StandingRow[] {
  const stage = comp.stages[stageIndex];
  const group = stage.groups.find((g) => g.name === groupName);
  if (!group) return [];
  const rows = new Map(group.clubIds.map((id) => [id, emptyRow(id)]));
  for (const f of stageFixtures(world, comp, stageIndex, groupName)) {
    if (!f.result) continue;
    const home = rows.get(f.home);
    const away = rows.get(f.away);
    if (!home || !away) continue;
    const { hg, ag } = f.result;
    home.played++;
    away.played++;
    home.gf += hg;
    home.ga += ag;
    away.gf += ag;
    away.ga += hg;
    if (hg > ag) {
      home.won++;
      away.lost++;
      home.points += 3;
      home.form.push("V");
      away.form.push("D");
    } else if (hg < ag) {
      away.won++;
      home.lost++;
      away.points += 3;
      home.form.push("D");
      away.form.push("V");
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
      home.form.push("E");
      away.form.push("E");
    }
  }
  const order = new Map(group.clubIds.map((id, i) => [id, i]));
  return [...rows.values()]
    .map((r) => ({ ...r, gd: r.gf - r.ga, form: r.form.slice(-5) }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        (order.get(a.clubId) ?? 0) - (order.get(b.clubId) ?? 0),
    );
}

/** Classificação geral da primeira fase (liga ou grupo único). */
export function leagueTable(world: World, comp: Competition, stageIndex = 0): StandingRow[] {
  const stage = comp.stages[stageIndex];
  if (!stage || stage.type !== "grupos" || stage.groups.length === 0) return [];
  return groupStandings(world, comp, stageIndex, stage.groups[0].name);
}
