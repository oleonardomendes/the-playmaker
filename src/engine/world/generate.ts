import { Rng } from "../rng";
import type { Club, Player, Position, World } from "../types";
import { CITIES, CLUB_PATTERNS, FIRST_NAMES, NICKNAMES, SURNAMES } from "./names";

/**
 * Geração do mundo — versão mínima da fase 0 (20 clubes fictícios com
 * elencos simples). A fase 1 substitui por ~300 clubes brasileiros, 60
 * estrangeiros, ~10 mil jogadores, rivalidades e banco editável.
 */

const SQUAD_TEMPLATE: ReadonlyArray<readonly [Position, number]> = [
  ["GOL", 3],
  ["ZAG", 4],
  ["LAT", 4],
  ["VOL", 3],
  ["MEI", 4],
  ["ATA", 4],
];

function playerName(rng: Rng): string {
  if (rng.chance(0.2)) return rng.pick(NICKNAMES);
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`;
}

function shortName(name: string): string {
  const words = name.split(" ").filter((w) => w.length > 2);
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 3);
}

export function generateWorld(seed: number, clubCount = 20): World {
  const rng = new Rng(seed);
  const clubs: Record<string, Club> = {};
  const players: Record<string, Player> = {};
  let playerSeq = 0;

  const cities = [...CITIES];
  for (let i = 0; i < clubCount; i++) {
    const [city, demonym, uf] = cities[i % cities.length];
    const name = rng.pick(CLUB_PATTERNS)({ city, demonym });
    const prestige = Math.round(Math.min(95, Math.max(10, rng.normal(50, 18))));
    const clubId = `c${i + 1}`;
    const playerIds: string[] = [];

    // Clubes de mais prestígio tendem a ter elencos melhores.
    const squadLevel = 45 + prestige * 0.35;
    for (const [position, count] of SQUAD_TEMPLATE) {
      for (let n = 0; n < count; n++) {
        const id = `p${++playerSeq}`;
        players[id] = {
          id,
          name: playerName(rng),
          position,
          age: rng.int(17, 35),
          overall: Math.round(Math.min(95, Math.max(30, rng.normal(squadLevel, 7)))),
        };
        playerIds.push(id);
      }
    }

    clubs[clubId] = {
      id: clubId,
      name,
      shortName: shortName(name),
      state: uf,
      prestige,
      playerIds,
    };
  }

  return { seed, season: 2027, clubs, players, rng: rng.state() };
}
