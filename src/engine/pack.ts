import type { Club, Player, World } from "./types";

/**
 * Packs: arquivos JSON que editam o banco do mundo (nomes de clubes, cores,
 * estádios, nomes de jogadores). É por eles que a comunidade pode colocar
 * nomes reais no jogo, sem o jogo distribuir conteúdo de terceiros.
 *
 * As chaves ficam em português para facilitar a edição à mão.
 */

export const PACK_FORMAT = "the-playmaker-pack";
export const PACK_VERSION = 1;

export interface PackClub {
  id: string;
  nome?: string;
  sigla?: string;
  apelido?: string;
  cidade?: string;
  cores?: string[];
  estadio?: string;
  capacidade?: number;
}

export interface PackPlayer {
  id: string;
  nome?: string;
  nomeCompleto?: string;
}

export interface Pack {
  formato: typeof PACK_FORMAT;
  versao: number;
  nome: string;
  clubes?: PackClub[];
  jogadores?: PackPlayer[];
}

export interface PackReport {
  clubs: number;
  players: number;
  /** Itens ignorados, com o motivo, para mostrar ao jogador. */
  skipped: string[];
}

export class PackError extends Error {}

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_TEXT = 60;

function text(value: unknown, field: string, max = MAX_TEXT): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new PackError(`"${field}" precisa ser texto`);
  const trimmed = value.trim();
  if (!trimmed) throw new PackError(`"${field}" está vazio`);
  if (trimmed.length > max) throw new PackError(`"${field}" passa de ${max} caracteres`);
  return trimmed;
}

/** Monta o pack com o banco atual, pronto para ser editado e reimportado. */
export function exportPack(world: World, name = "Banco atual"): Pack {
  return {
    formato: PACK_FORMAT,
    versao: PACK_VERSION,
    nome: name,
    clubes: Object.values(world.clubs).map((c) => ({
      id: c.id,
      nome: c.name,
      sigla: c.shortName,
      apelido: c.nickname,
      cidade: c.city,
      cores: c.colors,
      estadio: c.stadium.name,
      capacidade: c.stadium.capacity,
    })),
    jogadores: Object.values(world.players).map((p) => ({
      id: p.id,
      nome: p.knownAs,
      nomeCompleto: p.fullName,
    })),
  };
}

export function parsePack(raw: unknown): Pack {
  if (typeof raw !== "object" || raw === null) throw new PackError("O arquivo não é um pack válido.");
  const pack = raw as Record<string, unknown>;
  if (pack.formato !== PACK_FORMAT) {
    throw new PackError("Este arquivo não é um pack do The Playmaker.");
  }
  if (typeof pack.versao !== "number" || pack.versao > PACK_VERSION) {
    throw new PackError("Pack feito para uma versão mais nova do jogo.");
  }
  if (pack.clubes !== undefined && !Array.isArray(pack.clubes)) throw new PackError('"clubes" precisa ser uma lista.');
  if (pack.jogadores !== undefined && !Array.isArray(pack.jogadores)) {
    throw new PackError('"jogadores" precisa ser uma lista.');
  }
  return {
    formato: PACK_FORMAT,
    versao: pack.versao,
    nome: typeof pack.nome === "string" && pack.nome.trim() ? pack.nome.trim().slice(0, MAX_TEXT) : "Pack sem nome",
    clubes: pack.clubes as PackClub[] | undefined,
    jogadores: pack.jogadores as PackPlayer[] | undefined,
  };
}

function patchClub(club: Club, entry: PackClub): Club {
  const name = text(entry.nome, "nome");
  const shortName = text(entry.sigla, "sigla", 4);
  const nickname = text(entry.apelido, "apelido");
  const city = text(entry.cidade, "cidade");
  const stadiumName = text(entry.estadio, "estadio");
  let colors = club.colors;
  if (entry.cores !== undefined) {
    if (!Array.isArray(entry.cores) || entry.cores.length < 2 || entry.cores.length > 3) {
      throw new PackError('"cores" precisa ter 2 ou 3 cores');
    }
    if (!entry.cores.every((c) => typeof c === "string" && HEX.test(c))) {
      throw new PackError('"cores" usa o formato #RRGGBB');
    }
    colors = entry.cores.map((c) => c.toLowerCase());
  }
  let capacity = club.stadium.capacity;
  if (entry.capacidade !== undefined) {
    if (typeof entry.capacidade !== "number" || !Number.isInteger(entry.capacidade) || entry.capacidade < 500 || entry.capacidade > 200000) {
      throw new PackError('"capacidade" precisa ser um número entre 500 e 200000');
    }
    capacity = entry.capacidade;
  }
  return {
    ...club,
    name: name ?? club.name,
    shortName: shortName ? shortName.toUpperCase() : club.shortName,
    nickname: nickname ?? club.nickname,
    city: city ?? club.city,
    colors,
    stadium: { name: stadiumName ?? club.stadium.name, capacity },
  };
}

function patchPlayer(player: Player, entry: PackPlayer): Player {
  return {
    ...player,
    knownAs: text(entry.nome, "nome") ?? player.knownAs,
    fullName: text(entry.nomeCompleto, "nomeCompleto", 90) ?? player.fullName,
  };
}

/**
 * Aplica o pack ao mundo e devolve um mundo novo. Itens com problema são
 * ignorados um a um (com o motivo no relatório), sem invalidar o resto.
 */
export function applyPack(world: World, pack: Pack): { world: World; report: PackReport } {
  const clubs = { ...world.clubs };
  const players = { ...world.players };
  const report: PackReport = { clubs: 0, players: 0, skipped: [] };

  for (const entry of pack.clubes ?? []) {
    const id = typeof entry?.id === "string" ? entry.id : "";
    const club = clubs[id];
    if (!club) {
      report.skipped.push(`Clube "${id || "sem id"}" não existe neste mundo`);
      continue;
    }
    try {
      clubs[id] = patchClub(club, entry);
      report.clubs++;
    } catch (err) {
      report.skipped.push(`Clube ${id}: ${(err as Error).message}`);
    }
  }

  for (const entry of pack.jogadores ?? []) {
    const id = typeof entry?.id === "string" ? entry.id : "";
    const player = players[id];
    if (!player) {
      report.skipped.push(`Jogador "${id || "sem id"}" não existe neste mundo`);
      continue;
    }
    try {
      players[id] = patchPlayer(player, entry);
      report.players++;
    } catch (err) {
      report.skipped.push(`Jogador ${id}: ${(err as Error).message}`);
    }
  }

  return { world: { ...world, clubs, players }, report };
}
