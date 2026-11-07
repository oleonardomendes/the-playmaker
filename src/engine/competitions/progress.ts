import { Rng } from "../rng";
import { teamStrength } from "../sim/quickMatch";
import type { Competition, World } from "../types";
import { createGroupFixtures, createTies, tieWinner } from "./fixtures";
import { groupStandings } from "./standings";
import { strongerFirst } from "./build";

/**
 * Avanço das competições: quando todas as partidas de uma fase acabam,
 * define os classificados, sorteia/monta a fase seguinte nas datas já
 * reservadas e, na última fase, aponta o campeão.
 */

/** Quantas partidas faltam em cada fase (chave "comp|fase"). */
function pendingByStage(world: World): Map<string, number> {
  const pending = new Map<string, number>();
  for (const f of Object.values(world.fixtures)) {
    if (f.result) continue;
    const key = `${f.comp}|${f.stage}`;
    pending.set(key, (pending.get(key) ?? 0) + 1);
  }
  return pending;
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ordem de cada grupo ao fim da fase. */
function groupOrder(world: World, comp: Competition, stageIndex: number): string[][] {
  return comp.stages[stageIndex].groups.map((g) => groupStandings(world, comp, stageIndex, g.name).map((r) => r.clubId));
}

/** Pares [mandante do 1º jogo, outro] a partir de [melhor, pior]: o melhor decide em casa. */
function hostOrder(stageLegs: 1 | 2, better: string, worse: string): [string, string] {
  return stageLegs === 2 ? [worse, better] : [better, worse];
}

/** Vencedores da fase de mata-mata, na ordem do chaveamento. */
function koWinners(world: World, comp: Competition, stageIndex: number): string[] {
  return comp.stages[stageIndex].ties.map((t) => t.winnerId ?? tieWinner(world, t)!);
}

/** Pares seguintes no chaveamento: vencedor do confronto 2k contra o do 2k+1. */
function bracketPairs(world: World, winners: string[], legs: 1 | 2): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i + 1 < winners.length; i += 2) {
    const [better, worse] = strongerFirst(world, winners[i], winners[i + 1]);
    pairs.push(hostOrder(legs, better, worse));
  }
  return pairs;
}

function startNext(world: World, comp: Competition, stageIndex: number, rng: Rng) {
  const next = comp.stages[stageIndex + 1];
  const nextIndex = stageIndex + 1;
  const stage = comp.stages[stageIndex];

  if (stage.type === "mata-mata") {
    const winners = koWinners(world, comp, stageIndex);
    if (comp.kind === "copa") {
      // Copa: novo sorteio a cada fase.
      const drawn = shuffle(rng, winners);
      const pairs: Array<[string, string]> = [];
      for (let i = 0; i + 1 < drawn.length; i += 2) {
        const [better, worse] = strongerFirst(world, drawn[i], drawn[i + 1]);
        pairs.push(hostOrder(next.legs, better, worse));
      }
      createTies(world, comp, nextIndex, pairs);
    } else {
      const neutral = comp.kind === "continental" && next.name === "Final";
      createTies(world, comp, nextIndex, bracketPairs(world, winners, next.legs), neutral);
    }
    return;
  }

  // Fim de uma fase de grupos.
  const order = groupOrder(world, comp, stageIndex);
  if (comp.kind === "liga" && comp.tier === "C" && stageIndex === 0) {
    const top = order[0].slice(0, 8);
    next.groups = [
      { name: "A", clubIds: [top[0], top[3], top[4], top[7]] },
      { name: "B", clubIds: [top[1], top[2], top[5], top[6]] },
    ];
    createGroupFixtures(world, comp, nextIndex, rng);
    return;
  }
  if (comp.kind === "liga" && comp.tier === "C" && stageIndex === 1) {
    // Final entre os líderes dos quadrangulares; decide em casa quem foi melhor na 1ª fase.
    const firstPhase = groupOrder(world, comp, 0)[0];
    const a = order[0][0];
    const b = order[1][0];
    const [better, worse] = firstPhase.indexOf(a) < firstPhase.indexOf(b) ? [a, b] : [b, a];
    createTies(world, comp, nextIndex, [hostOrder(next.legs, better, worse)]);
    return;
  }
  if (comp.kind === "liga" && comp.tier === "D") {
    // Grupos pareados (A-B, C-D…): 1º x 4º e 2º x 3º do grupo vizinho.
    const pairs: Array<[string, string]> = [];
    for (let g = 0; g + 1 < order.length; g += 2) {
      const x = order[g];
      const y = order[g + 1];
      pairs.push(hostOrder(next.legs, x[0], y[3]), hostOrder(next.legs, x[1], y[2]));
      pairs.push(hostOrder(next.legs, y[0], x[3]), hostOrder(next.legs, y[1], x[2]));
    }
    createTies(world, comp, nextIndex, pairs);
    return;
  }
  if (comp.kind === "estadual") {
    const table = order[0];
    const quarters = next.name === "Quartas";
    const n = quarters ? 8 : 4;
    const top = table.slice(0, n);
    const seeds = quarters
      ? [[0, 7], [3, 4], [1, 6], [2, 5]]
      : [[0, 3], [1, 2]];
    createTies(world, comp, nextIndex, seeds.map(([i, j]) => hostOrder(next.legs, top[i], top[j])));
    return;
  }
  if (comp.kind === "continental") {
    // A1 x B2, C1 x D2… e do outro lado B1 x A2, D1 x C2…
    const pairs: Array<[string, string]> = [];
    for (let g = 0; g + 1 < order.length; g += 2) pairs.push(hostOrder(next.legs, order[g][0], order[g + 1][1]));
    for (let g = 0; g + 1 < order.length; g += 2) pairs.push(hostOrder(next.legs, order[g + 1][0], order[g][1]));
    createTies(world, comp, nextIndex, pairs);
    return;
  }
  if (comp.kind === "copa-estadual") {
    const table = order[0];
    createTies(world, comp, nextIndex, [hostOrder(next.legs, table[0], table[1])]);
    return;
  }
}

function finishCompetition(world: World, comp: Competition) {
  const last = comp.stages[comp.stages.length - 1];
  if (last.type === "mata-mata") {
    const final = last.ties[0];
    comp.championId = final.winnerId ?? tieWinner(world, final);
  } else {
    comp.championId = groupOrder(world, comp, comp.stages.length - 1)[0][0];
  }
  comp.done = true;
}

/**
 * Atualiza as competições depois de um dia de jogos.
 * Retorna as que mudaram de fase ou terminaram (para avisos na interface).
 */
export function progressCompetitions(world: World, compIds: Iterable<string>): string[] {
  const rng = new Rng(world.rng);
  const changed: string[] = [];
  let pending = pendingByStage(world);
  for (const id of new Set(compIds)) {
    const comp = world.competitions[id];
    if (!comp || comp.done) continue;
    const stage = comp.stages[comp.current];
    if (stage.type === "mata-mata") {
      for (const tie of stage.ties) tie.winnerId ??= tieWinner(world, tie);
    }
    if (!stage.started || (pending.get(`${comp.id}|${comp.current}`) ?? 0) > 0) continue;
    stage.done = true;
    changed.push(id);
    if (comp.current === comp.stages.length - 1) {
      finishCompetition(world, comp);
    } else {
      startNext(world, comp, comp.current, rng);
      comp.current += 1;
      pending = pendingByStage(world);
    }
  }
  world.rng = rng.state();
  return changed;
}

/** Força média, para desempates que precisam de critério estável. */
export function clubStrength(world: World, id: string): number {
  return teamStrength(world, world.clubs[id]);
}
