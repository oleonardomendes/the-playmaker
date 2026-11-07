import type { Rng } from "../rng";
import type { Club, World } from "../types";

export interface QuickResult {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
}

/**
 * Modelo-base de gols: a força dos titulares e o mando de campo definem a
 * média de gols de cada lado. O motor de partida (match/engine.ts) parte
 * destas médias e aplica tática, cansaço, expulsões e placar. Gols seguem Poisson com média ajustada pela
 * diferença de força e pelo mando de campo.
 *
 * Calibração-alvo (futebol brasileiro): ~2,3–2,6 gols por jogo,
 * ~25–30% de empates e vitória do mandante bem mais comum que a do visitante.
 */

const BASE_HOME_GOALS = 1.4;
const BASE_AWAY_GOALS = 1.02;
/** Quanto a diferença de força (em pontos de overall) muda a média de gols. */
const STRENGTH_SCALE = 14;

/** Força do time: média dos 11 melhores do elenco. */
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
): QuickResult {
  const xg = expectedGoals(homeStrength, awayStrength);
  return {
    homeId,
    awayId,
    homeGoals: rng.poisson(xg.home),
    awayGoals: rng.poisson(xg.away),
  };
}
