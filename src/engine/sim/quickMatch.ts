import { Rng } from "../rng";
import type { Club, MatchResult, World } from "../types";

/**
 * Modelo rápido de resultado: usado para todas as partidas fora das
 * competições do jogador. Gols seguem Poisson com média ajustada pela
 * diferença de força e pelo mando de campo.
 *
 * Calibração-alvo (futebol brasileiro): ~2,3–2,6 gols por jogo,
 * ~25–30% de empates e vitória do mandante bem mais comum que a do visitante.
 */

const BASE_HOME_GOALS = 1.4;
const BASE_AWAY_GOALS = 1.02;
/** Quanto a diferença de força (em pontos de overall) muda a média de gols. */
const STRENGTH_SCALE = 14;

export function teamStrength(world: World, club: Club): number {
  const overalls = club.playerIds
    .map((id) => world.players[id]?.overall ?? 0)
    .sort((a, b) => b - a)
    .slice(0, 11);
  if (overalls.length === 0) return 0;
  return overalls.reduce((sum, v) => sum + v, 0) / overalls.length;
}

export function expectedGoals(homeStrength: number, awayStrength: number) {
  const diff = (homeStrength - awayStrength) / STRENGTH_SCALE;
  return {
    home: BASE_HOME_GOALS * Math.exp(diff / 2),
    away: BASE_AWAY_GOALS * Math.exp(-diff / 2),
  };
}

export function simulateQuickMatch(
  rng: Rng,
  homeId: string,
  awayId: string,
  homeStrength: number,
  awayStrength: number,
): MatchResult {
  const xg = expectedGoals(homeStrength, awayStrength);
  return {
    homeId,
    awayId,
    homeGoals: rng.poisson(xg.home),
    awayGoals: rng.poisson(xg.away),
  };
}

/** Rodada de teste: emparelha os clubes em sequência e simula todos os jogos. */
export function simulateTestRound(world: World): { world: World; results: MatchResult[] } {
  const rng = new Rng(world.rng);
  const ids = Object.keys(world.clubs);
  const results: MatchResult[] = [];
  for (let i = 0; i + 1 < ids.length; i += 2) {
    const home = world.clubs[ids[i]];
    const away = world.clubs[ids[i + 1]];
    results.push(
      simulateQuickMatch(rng, home.id, away.id, teamStrength(world, home), teamStrength(world, away)),
    );
  }
  return { world: { ...world, rng: rng.state() }, results };
}
