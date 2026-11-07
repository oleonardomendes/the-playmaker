import type { Rng } from "../rng";

/**
 * Tabela de pontos corridos pelo método do círculo.
 * Devolve as rodadas, cada uma com os pares [mandante, visitante].
 * Com número ímpar de clubes, um folga em cada rodada.
 * Em turno e returno, o returno espelha o turno com mando invertido.
 */
export function roundRobin(clubIds: string[], legs: 1 | 2, rng?: Rng): Array<Array<[string, string]>> {
  const teams = [...clubIds];
  if (rng) {
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }
  }
  const BYE = "__folga__";
  if (teams.length % 2 === 1) teams.push(BYE);
  const n = teams.length;
  const rounds: Array<Array<[string, string]>> = [];
  const list = [...teams];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      // Alterna o mando para ninguém jogar muitas vezes seguidas em casa.
      pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    // Gira todos menos o primeiro.
    list.splice(1, 0, list.pop()!);
  }
  if (legs === 2) {
    const second = rounds.map((pairs) => pairs.map(([h, a]) => [a, h] as [string, string]));
    return [...rounds, ...second];
  }
  return rounds;
}

/** Número de rodadas de um grupo. */
export function roundCount(clubs: number, legs: 1 | 2): number {
  const n = clubs % 2 === 0 ? clubs : clubs + 1;
  return (n - 1) * legs;
}
