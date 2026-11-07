import type { Rng } from "../rng";
import type { Competition, Fixture, Tie, World } from "../types";
import { roundRobin } from "./roundRobin";

/** Registra uma partida no mundo e na agenda do dia. */
export function addFixture(world: World, fixture: Fixture) {
  world.fixtures[fixture.id] = fixture;
  (world.schedule[fixture.date] ??= []).push(fixture.id);
}

function nextFixtureId(world: World, comp: Competition, stageIndex: number, seq: { n: number }): string {
  seq.n += 1;
  return `${comp.season}-${comp.id}-${stageIndex}-${seq.n}`;
}

/** Cria as partidas de uma fase de grupos (pontos corridos dentro de cada grupo). */
export function createGroupFixtures(world: World, comp: Competition, stageIndex: number, rng: Rng) {
  const stage = comp.stages[stageIndex];
  const seq = { n: 0 };
  for (const group of stage.groups) {
    const rounds = roundRobin(group.clubIds, stage.legs, rng);
    rounds.forEach((pairs, round) => {
      const date = stage.dates[round];
      if (!date) throw new Error(`${comp.name}: falta data para a rodada ${round + 1} de ${stage.name}`);
      for (const [home, away] of pairs) {
        addFixture(world, {
          id: nextFixtureId(world, comp, stageIndex, seq),
          comp: comp.id,
          stage: stageIndex,
          round,
          date,
          home,
          away,
          group: group.name,
        });
      }
    });
  }
  stage.started = true;
}

/**
 * Cria os confrontos de mata-mata. Cada par é [mandante do 1º jogo, outro].
 * Em ida e volta, o segundo jogo é na casa do outro clube.
 */
export function createTies(world: World, comp: Competition, stageIndex: number, pairs: Array<[string, string]>, neutralFinal = false) {
  const stage = comp.stages[stageIndex];
  const seq = { n: 0 };
  stage.ties = pairs.map(([first, second], i): Tie => {
    const tie: Tie = { id: `${comp.season}-${comp.id}-${stageIndex}-t${i}`, first, second, fixtureIds: [] };
    for (let leg = 0; leg < stage.legs; leg++) {
      const fixture: Fixture = {
        id: nextFixtureId(world, comp, stageIndex, seq),
        comp: comp.id,
        stage: stageIndex,
        round: leg,
        date: stage.dates[leg],
        home: leg === 0 ? first : second,
        away: leg === 0 ? second : first,
        tie: tie.id,
        leg: (leg + 1) as 1 | 2,
      };
      if (neutralFinal) fixture.neutral = true;
      addFixture(world, fixture);
      tie.fixtureIds.push(fixture.id);
    }
    return tie;
  });
  stage.started = true;
}

/** Gols de cada lado num confronto, considerando todos os jogos já disputados. */
export function tieAggregate(world: World, tie: Tie): Record<string, number> {
  const goals: Record<string, number> = { [tie.first]: 0, [tie.second]: 0 };
  for (const id of tie.fixtureIds) {
    const f = world.fixtures[id];
    if (!f?.result) continue;
    goals[f.home] += f.result.hg;
    goals[f.away] += f.result.ag;
  }
  return goals;
}

/** Vencedor do confronto (só quando todos os jogos já foram disputados). */
export function tieWinner(world: World, tie: Tie): string | undefined {
  const fixtures = tie.fixtureIds.map((id) => world.fixtures[id]);
  if (fixtures.some((f) => !f?.result)) return undefined;
  const agg = tieAggregate(world, tie);
  if (agg[tie.first] !== agg[tie.second]) return agg[tie.first] > agg[tie.second] ? tie.first : tie.second;
  const last = fixtures[fixtures.length - 1];
  const pens = last.result?.pens;
  if (!pens) return tie.second;
  const homeWon = pens[0] > pens[1];
  return homeWon ? last.home : last.away;
}

/**
 * Agregado anterior a esta partida, do ponto de vista de mandante/visitante dela.
 * Só existe no último jogo do confronto (é quando pode haver pênaltis).
 */
export function knockoutContext(world: World, fixture: Fixture): { agg: [number, number] } | undefined {
  if (!fixture.tie) return undefined;
  const comp = world.competitions[fixture.comp];
  const stage = comp.stages[fixture.stage];
  if ((fixture.leg ?? 1) < stage.legs) return undefined;
  const tie = stage.ties.find((t) => t.id === fixture.tie);
  if (!tie) return undefined;
  let home = 0;
  let away = 0;
  for (const id of tie.fixtureIds) {
    if (id === fixture.id) continue;
    const f = world.fixtures[id];
    if (!f?.result) continue;
    home += f.home === fixture.home ? f.result.hg : f.result.ag;
    away += f.home === fixture.home ? f.result.ag : f.result.hg;
  }
  return { agg: [home, away] };
}
