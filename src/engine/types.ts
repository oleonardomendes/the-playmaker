import type { RngState } from "./rng";

/**
 * Modelo de dados do motor.
 * Fase 1: mundo completo (clubes, jogadores, divisões, estados, exterior).
 * As fases seguintes acrescentam atributos detalhados, finanças, contratos etc.
 */

export type Position = "GOL" | "ZAG" | "LD" | "LE" | "VOL" | "MEI" | "PD" | "PE" | "ATA";

export const POSITIONS: readonly Position[] = ["GOL", "ZAG", "LD", "LE", "VOL", "MEI", "PD", "PE", "ATA"];

export const POSITION_NAMES: Record<Position, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LD: "Lateral-direito",
  LE: "Lateral-esquerdo",
  VOL: "Volante",
  MEI: "Meia",
  PD: "Ponta-direita",
  PE: "Ponta-esquerda",
  ATA: "Centroavante",
};

/** Divisão nacional do clube; "E" = só disputa o estadual; "INT" = clube estrangeiro. */
export type Tier = "A" | "B" | "C" | "D" | "E" | "INT";

export type Foot = "D" | "E" | "A";

/** Códigos de país usados no jogo. */
export type Country = "BR" | "AR" | "UY" | "CO" | "CL" | "PY" | "EC" | "PE" | "BO" | "VE";

export type CrestShape = "escudo" | "redondo" | "classico";
export type CrestPattern = "liso" | "listras" | "faixa" | "diagonal" | "metade";

export interface Crest {
  shape: CrestShape;
  pattern: CrestPattern;
}

export interface Stadium {
  name: string;
  capacity: number;
}

export interface Rival {
  clubId: string;
  /** 1 = rivalidade regional, 2 = clássico, 3 = maior clássico do clube. */
  intensity: 1 | 2 | 3;
}

export interface Club {
  id: string;
  name: string;
  /** Sigla de 3 letras usada em placares e tabelas. */
  shortName: string;
  /** Apelido pelas cores, ex.: "Alvinegro". */
  nickname: string;
  city: string;
  /** UF para clubes brasileiros; vazio para estrangeiros. */
  state: string;
  country: Country;
  tier: Tier;
  founded: number;
  /** Cores em hex: principal, secundária e, às vezes, uma terceira. */
  colors: string[];
  crest: Crest;
  /** Prestígio histórico 1–100. */
  prestige: number;
  /** Tamanho estimado da torcida. */
  fans: number;
  stadium: Stadium;
  rivals: Rival[];
  playerIds: string[];
}

export interface Player {
  id: string;
  /** Nome pelo qual é conhecido no futebol (apelido ou nome curto). */
  knownAs: string;
  fullName: string;
  birthYear: number;
  nationality: Country;
  position: Position;
  foot: Foot;
  /** Força atual 1–100. Na fase 3 vira atributos detalhados de 1 a 20. */
  overall: number;
  /** Teto de evolução, oculto ao jogador (revelado aos poucos pelos olheiros). */
  potential: number;
  clubId: string;
}

export interface StateInfo {
  uf: string;
  name: string;
  /** Gentílico, usado em apelidos ("Juninho Paulista"). */
  demonym: string;
  clubIds: string[];
}

export interface CountryInfo {
  code: Country;
  name: string;
  clubIds: string[];
}

export interface World {
  seed: number;
  season: number;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  /** Clubes de cada série nacional. */
  divisions: Record<"A" | "B" | "C" | "D", string[]>;
  states: Record<string, StateInfo>;
  countries: Partial<Record<Country, CountryInfo>>;
  rng: RngState;
}

export interface MatchResult {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface SaveGame {
  /** Versão do esquema do save; ver src/lib/save/migrations.ts. */
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  world: World;
}
