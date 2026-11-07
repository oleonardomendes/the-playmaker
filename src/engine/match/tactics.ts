import type { Formation, Mentality, Player, Position, Pressing, Style, Tactic, World } from "../types";

/**
 * Formações, posições de cada slot e escolha automática da escalação.
 */

export const FORMATIONS: Record<Formation, Position[]> = {
  "4-3-3": ["GOL", "LD", "ZAG", "ZAG", "LE", "VOL", "MEI", "MEI", "PD", "ATA", "PE"],
  "4-2-3-1": ["GOL", "LD", "ZAG", "ZAG", "LE", "VOL", "VOL", "PD", "MEI", "PE", "ATA"],
  "4-4-2": ["GOL", "LD", "ZAG", "ZAG", "LE", "VOL", "VOL", "PD", "PE", "ATA", "ATA"],
  "4-1-4-1": ["GOL", "LD", "ZAG", "ZAG", "LE", "VOL", "PD", "MEI", "MEI", "PE", "ATA"],
  "3-5-2": ["GOL", "ZAG", "ZAG", "ZAG", "LD", "VOL", "MEI", "MEI", "LE", "ATA", "ATA"],
  "3-4-3": ["GOL", "ZAG", "ZAG", "ZAG", "LD", "VOL", "VOL", "LE", "PD", "ATA", "PE"],
  "5-3-2": ["GOL", "LD", "ZAG", "ZAG", "ZAG", "LE", "VOL", "MEI", "MEI", "ATA", "ATA"],
};

export const FORMATION_LIST = Object.keys(FORMATIONS) as Formation[];

/**
 * Posição de cada slot no desenho do campo: x de 0 (esquerda) a 100 (direita),
 * y de 0 (ataque) a 100 (gol do próprio time).
 */
export const PITCH: Record<Formation, Array<[number, number]>> = {
  "4-3-3": [[50, 92], [86, 72], [62, 76], [38, 76], [14, 72], [50, 56], [70, 46], [30, 46], [84, 22], [50, 14], [16, 22]],
  "4-2-3-1": [[50, 92], [86, 72], [62, 76], [38, 76], [14, 72], [62, 56], [38, 56], [82, 34], [50, 36], [18, 34], [50, 14]],
  "4-4-2": [[50, 92], [86, 72], [62, 76], [38, 76], [14, 72], [62, 52], [38, 52], [86, 44], [14, 44], [62, 16], [38, 16]],
  "4-1-4-1": [[50, 92], [86, 72], [62, 76], [38, 76], [14, 72], [50, 60], [86, 40], [64, 42], [36, 42], [14, 40], [50, 14]],
  "3-5-2": [[50, 92], [72, 76], [50, 78], [28, 76], [90, 48], [50, 58], [68, 40], [32, 40], [10, 48], [62, 16], [38, 16]],
  "3-4-3": [[50, 92], [72, 76], [50, 78], [28, 76], [88, 50], [62, 54], [38, 54], [12, 50], [82, 22], [50, 14], [18, 22]],
  "5-3-2": [[50, 92], [90, 64], [70, 76], [50, 78], [30, 76], [10, 64], [50, 54], [70, 42], [30, 42], [62, 16], [38, 16]],
};

export const MENTALITIES: Mentality[] = ["defensiva", "cautelosa", "equilibrada", "ofensiva", "total"];
export const MENTALITY_NAMES: Record<Mentality, string> = {
  defensiva: "Defensiva",
  cautelosa: "Cautelosa",
  equilibrada: "Equilibrada",
  ofensiva: "Ofensiva",
  total: "Tudo ao ataque",
};
/** Rótulos curtos para botões da partida ao vivo. */
export const MENTALITY_SHORT: Record<Mentality, string> = {
  defensiva: "Defesa",
  cautelosa: "Cautela",
  equilibrada: "Normal",
  ofensiva: "Ataque",
  total: "Tudo",
};
export const STYLES: Style[] = ["posse", "equilibrado", "contra-ataque", "direto"];
export const STYLE_NAMES: Record<Style, string> = {
  posse: "Toque de bola",
  equilibrado: "Equilibrado",
  "contra-ataque": "Contra-ataque",
  direto: "Jogo direto",
};
export const PRESSINGS: Pressing[] = ["baixa", "media", "alta"];
export const PRESSING_NAMES: Record<Pressing, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

/** Quanto um jogador rende fora da posição de origem (1 = posição dele). */
const RELATED: Partial<Record<Position, Partial<Record<Position, number>>>> = {
  ZAG: { VOL: 0.8, LD: 0.75, LE: 0.75 },
  LD: { LE: 0.85, ZAG: 0.75, PD: 0.75, VOL: 0.65 },
  LE: { LD: 0.85, ZAG: 0.75, PE: 0.75, VOL: 0.65 },
  VOL: { MEI: 0.85, ZAG: 0.78, LD: 0.65, LE: 0.65 },
  MEI: { VOL: 0.82, PD: 0.82, PE: 0.82, ATA: 0.75 },
  PD: { PE: 0.88, MEI: 0.8, ATA: 0.8, LD: 0.7 },
  PE: { PD: 0.88, MEI: 0.8, ATA: 0.8, LE: 0.7 },
  ATA: { PD: 0.8, PE: 0.8, MEI: 0.72 },
};

export function familiarity(natural: Position, slot: Position): number {
  if (natural === slot) return 1;
  if (natural === "GOL" || slot === "GOL") return 0.3;
  return RELATED[natural]?.[slot] ?? 0.6;
}

/** Peso da condição física no rendimento: 100 → 1,0; 60 → 0,91. */
export function conditionFactor(condition: number): number {
  return 0.78 + 0.22 * Math.min(100, Math.max(0, condition)) / 100;
}

export function effectiveRating(player: Player, slot: Position, condition = player.condition): number {
  return player.overall * familiarity(player.position, slot) * conditionFactor(condition);
}

/** Pode entrar em campo nesta data e competição? */
export function isAvailable(world: World, player: Player, compId?: string): boolean {
  if (player.injury && player.injury.until > world.date) return false;
  if (compId && (world.competitions[compId]?.discipline[player.id]?.banned ?? 0) > 0) return false;
  return true;
}

export function unavailableReason(world: World, player: Player, compId?: string): string | null {
  if (player.injury && player.injury.until > world.date) return `Lesionado: ${player.injury.name}`;
  if (compId && (world.competitions[compId]?.discipline[player.id]?.banned ?? 0) > 0) return "Suspenso";
  return null;
}

/** Ordem de preenchimento: posições mais escassas primeiro. */
const FILL_ORDER: Position[] = ["GOL", "ZAG", "LD", "LE", "VOL", "ATA", "MEI", "PD", "PE"];

/** Na escolha automática, jogadores muito cansados são poupados se houver opção. */
function selectionScore(player: Player, slot: Position): number {
  const tired = player.condition < 72 ? 0.85 : 1;
  return effectiveRating(player, slot) * tired;
}

export interface Lineup {
  /** Id do titular em cada slot da formação. */
  starters: string[];
  bench: string[];
}

export const BENCH_SIZE = 9;

/**
 * Escala o melhor time disponível para a formação. Slots que vierem
 * preenchidos em `fixed` (escolha do usuário) são respeitados se o jogador
 * estiver disponível.
 */
export function pickLineup(
  world: World,
  clubId: string,
  formation: Formation,
  compId?: string,
  fixed?: { lineup: (string | null)[]; bench: string[] },
): Lineup {
  const club = world.clubs[clubId];
  const slots = FORMATIONS[formation];
  const pool = club.playerIds.map((id) => world.players[id]).filter((p) => p && isAvailable(world, p, compId));
  const used = new Set<string>();
  const starters: (string | null)[] = slots.map((_, i) => {
    const id = fixed?.lineup[i];
    if (id && pool.some((p) => p.id === id) && !used.has(id)) {
      used.add(id);
      return id;
    }
    return null;
  });

  const order = slots
    .map((pos, i) => ({ pos, i }))
    .sort((a, b) => FILL_ORDER.indexOf(a.pos) - FILL_ORDER.indexOf(b.pos));
  for (const { pos, i } of order) {
    if (starters[i]) continue;
    let best: Player | undefined;
    let bestScore = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const score = selectionScore(p, pos);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    if (best) {
      starters[i] = best.id;
      used.add(best.id);
    }
  }

  const bench: string[] = [];
  for (const id of fixed?.bench ?? []) {
    if (bench.length < BENCH_SIZE && !used.has(id) && pool.some((p) => p.id === id)) {
      bench.push(id);
      used.add(id);
    }
  }
  const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => b.overall * conditionFactor(b.condition) - a.overall * conditionFactor(a.condition));
  // Sempre um goleiro reserva, se houver.
  if (!bench.some((id) => world.players[id].position === "GOL")) {
    const gk = rest.find((p) => p.position === "GOL");
    if (gk && bench.length < BENCH_SIZE) {
      bench.push(gk.id);
      used.add(gk.id);
    }
  }
  for (const p of rest) {
    if (bench.length >= BENCH_SIZE) break;
    if (!used.has(p.id)) {
      bench.push(p.id);
      used.add(p.id);
    }
  }

  return { starters: starters.filter((id): id is string => Boolean(id)), bench };
}

/** Tática inicial de cada clube, estável a partir do id (sem gastar o gerador aleatório). */
export function defaultTactic(clubId: string): Tactic {
  let h = 2166136261;
  for (let i = 0; i < clubId.length; i++) h = Math.imul(h ^ clubId.charCodeAt(i), 16777619) >>> 0;
  const formations: Formation[] = ["4-3-3", "4-2-3-1", "4-4-2", "4-2-3-1", "4-3-3", "4-1-4-1", "3-5-2", "4-4-2"];
  const styles: Style[] = ["equilibrado", "posse", "contra-ataque", "equilibrado", "direto"];
  const pressings: Pressing[] = ["media", "media", "alta", "baixa"];
  return {
    formation: formations[h % formations.length],
    mentality: "equilibrada",
    style: styles[(h >>> 8) % styles.length],
    pressing: pressings[(h >>> 16) % pressings.length],
    lineup: [],
    bench: [],
  };
}

/** Reencaixa os mesmos titulares numa nova formação, cada um no slot em que rende mais. */
export function fitToFormation(world: World, starters: string[], formation: Formation): (string | null)[] {
  const slots = FORMATIONS[formation];
  const pool = starters.filter((id) => world.players[id]);
  const result: (string | null)[] = slots.map(() => null);
  const order = slots.map((pos, i) => ({ pos, i })).sort((a, b) => FILL_ORDER.indexOf(a.pos) - FILL_ORDER.indexOf(b.pos));
  const used = new Set<string>();
  for (const { pos, i } of order) {
    let best: string | null = null;
    let bestScore = -1;
    for (const id of pool) {
      if (used.has(id)) continue;
      const score = effectiveRating(world.players[id], pos);
      if (score > bestScore) {
        best = id;
        bestScore = score;
      }
    }
    if (best) {
      result[i] = best;
      used.add(best);
    }
  }
  return result;
}
