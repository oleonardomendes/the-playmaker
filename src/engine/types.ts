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

/* ---------- Táticas ---------- */

export type Formation = "4-3-3" | "4-2-3-1" | "4-4-2" | "4-1-4-1" | "3-5-2" | "3-4-3" | "5-3-2";
export type Mentality = "defensiva" | "cautelosa" | "equilibrada" | "ofensiva" | "total";
export type Style = "posse" | "equilibrado" | "contra-ataque" | "direto";
export type Pressing = "baixa" | "media" | "alta";

export interface Tactic {
  formation: Formation;
  mentality: Mentality;
  style: Style;
  pressing: Pressing;
  /** Titulares na ordem dos slots da formação (null = vazio). Vazio = escalação automática. */
  lineup: (string | null)[];
  /** Reservas escolhidos; vazio = automático. */
  bench: string[];
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
  tactic: Tactic;
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
  /** Condição física 0–100: cai com os jogos e volta com o descanso. */
  condition: number;
  injury?: Injury;
  season: PlayerSeason;
}

export interface Injury {
  name: string;
  /** Data (AAAA-MM-DD) em que volta a ficar disponível. */
  until: string;
}

/** Números do jogador na temporada, somando todas as competições. */
export interface PlayerSeason {
  apps: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  /** Soma das notas, para calcular a média. */
  ratingSum: number;
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

/* ---------- Competições e partidas ---------- */

export type CompetitionKind = "liga" | "estadual" | "copa" | "continental" | "copa-estadual";

export type ZoneKind = "titulo" | "acesso" | "classifica" | "continental" | "sul" | "rebaixa";

export interface Zone {
  /** Posições inclusivas, começando em 1. */
  from: number;
  to: number;
  kind: ZoneKind;
}

export interface Group {
  name: string;
  clubIds: string[];
}

/** Confronto de mata-mata (jogo único ou ida e volta). */
export interface Tie {
  id: string;
  /** Mandante do primeiro jogo. */
  first: string;
  second: string;
  fixtureIds: string[];
  winnerId?: string;
}

export interface Stage {
  name: string;
  type: "grupos" | "mata-mata";
  /** 1 = turno único / jogo único; 2 = turno e returno / ida e volta. */
  legs: 1 | 2;
  /** Data de cada rodada (grupos) ou de cada jogo do confronto (mata-mata). */
  dates: string[];
  groups: Group[];
  ties: Tie[];
  zones: Zone[];
  started: boolean;
  done: boolean;
}

export interface Discipline {
  yellow: number;
  /** Jogos de suspensão a cumprir nesta competição. */
  banned: number;
}

export interface Competition {
  id: string;
  name: string;
  short: string;
  kind: CompetitionKind;
  season: number;
  /** Divisão (ligas nacionais) ou UF (estaduais). */
  tier?: "A" | "B" | "C" | "D";
  uf?: string;
  clubIds: string[];
  stages: Stage[];
  current: number;
  discipline: Record<string, Discipline>;
  championId?: string;
  done: boolean;
}

/** G gol · Y amarelo · R vermelho · I lesão · S substituição · C chance perdida · P pênalti na disputa. */
export type MatchEventType = "G" | "Y" | "R" | "I" | "S" | "C" | "P";

/**
 * [minuto, tipo, lado (0 mandante, 1 visitante), jogador, extra]
 * extra: assistência (G), quem entrou (S), "defesa" | "fora" | "trave" (C), "1" | "0" convertido (P).
 */
export type MatchEvent = [number, MatchEventType, 0 | 1, string, string?];

export interface MatchStats {
  shots: [number, number];
  onTarget: [number, number];
  /** Posse do mandante, em %. */
  possession: number;
}

export interface MatchResult {
  hg: number;
  ag: number;
  /** Disputa de pênaltis, se houve. */
  pens?: [number, number];
  events: MatchEvent[];
  stats: MatchStats;
  /** Só nas partidas do seu clube. */
  lineups?: [string[], string[]];
  ratings?: Record<string, number>;
}

export interface Fixture {
  id: string;
  comp: string;
  stage: number;
  /** Índice da data dentro de stage.dates. */
  round: number;
  date: string;
  home: string;
  away: string;
  group?: string;
  tie?: string;
  leg?: 1 | 2;
  /** Final em campo neutro, sem vantagem de mando. */
  neutral?: boolean;
  result?: MatchResult;
}

export interface SeasonRecord {
  season: number;
  champions: Record<string, { name: string; clubId: string }>;
  /** Classificação final da Série A (ids). */
  serieA: string[];
  promoted: Record<"A" | "B" | "C" | "D", string[]>;
  relegated: Record<"A" | "B" | "C" | "D", string[]>;
  topScorer?: { playerId: string; name: string; clubId: string; goals: number };
  user?: { clubId: string; summary: string };
}

export interface World {
  seed: number;
  season: number;
  /** Dia atual do jogo (AAAA-MM-DD). */
  date: string;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  /** Clubes de cada série nacional. */
  divisions: Record<"A" | "B" | "C" | "D", string[]>;
  states: Record<string, StateInfo>;
  countries: Partial<Record<Country, CountryInfo>>;
  competitions: Record<string, Competition>;
  fixtures: Record<string, Fixture>;
  /** Data -> partidas do dia. */
  schedule: Record<string, string[]>;
  history: SeasonRecord[];
  /** Clube que você comanda. A carreira completa de técnico chega na fase 6. */
  user?: { clubId: string };
  rng: RngState;
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
