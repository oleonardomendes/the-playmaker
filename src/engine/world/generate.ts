import { Rng } from "../rng";
import type {
  Club,
  Country,
  CountryInfo,
  CrestPattern,
  CrestShape,
  Foot,
  Player,
  Position,
  Rival,
  StateInfo,
  Tier,
  World,
} from "../types";
import { brazilianCityName, COUNTRIES, spanishCityName, STATES, type StateDef } from "./geography";
import {
  BR_CLUB_IDENTITY,
  BR_CLUB_PATTERNS,
  BR_DIMINUTIVE,
  BR_FIRST,
  BR_MIDDLE,
  BR_NICKNAME,
  BR_SURNAME,
  COLOR_SETS,
  ES_CLUB_IDENTITY,
  ES_CLUB_PATTERNS,
  ES_FIRST,
  ES_SURNAME,
  STADIUM_HONOREES_FIRST,
} from "./names";

/**
 * Geração do mundo: ~300 clubes brasileiros (Séries A a D e clubes só de
 * estadual), 60 clubes sul-americanos e cerca de 9 mil jogadores.
 * Tudo sai da semente: a mesma semente gera exatamente o mesmo mundo.
 */

export const FIRST_SEASON = 2027;

/* ---------- Parâmetros por nível ---------- */

interface TierProfile {
  /**
   * Nível-base do elenco. Os 11 melhores ficam cerca de 7 pontos acima, então
   * a força dos titulares fica em torno de A 75, B 69, C 63, D 57, E 50.
   */
  level: number;
  prestige: [number, number];
  squad: number;
  capacity: [number, number];
  fans: [number, number];
  /** Chance de um jogador do elenco ser estrangeiro. */
  foreignShare: number;
}

const TIERS: Record<Exclude<Tier, "INT">, TierProfile> = {
  A: { level: 68, prestige: [66, 96], squad: 30, capacity: [28000, 78000], fans: [1_200_000, 38_000_000], foreignShare: 0.09 },
  B: { level: 62, prestige: [48, 74], squad: 28, capacity: [14000, 45000], fans: [250_000, 3_500_000], foreignShare: 0.04 },
  C: { level: 56, prestige: [36, 60], squad: 26, capacity: [8000, 26000], fans: [60_000, 900_000], foreignShare: 0.02 },
  D: { level: 50, prestige: [24, 48], squad: 25, capacity: [4000, 16000], fans: [15_000, 220_000], foreignShare: 0.01 },
  E: { level: 44, prestige: [8, 34], squad: 23, capacity: [1500, 9000], fans: [2_000, 60_000], foreignShare: 0 },
};

/** Elenco-base de 24 jogadores; elencos maiores ganham reforços em EXTRA_ORDER. */
const SQUAD_BASE: ReadonlyArray<readonly [Position, number]> = [
  ["GOL", 3], ["ZAG", 4], ["LD", 2], ["LE", 2], ["VOL", 3], ["MEI", 3], ["PD", 2], ["PE", 2], ["ATA", 3],
];
const EXTRA_ORDER: readonly Position[] = ["ZAG", "MEI", "ATA", "VOL", "LD", "LE", "PD", "PE"];
const TRIM_ORDER: readonly Position[] = ["PD", "GOL", "MEI", "ZAG"];

export function squadPositions(size: number): Position[] {
  const counts = new Map<Position, number>(SQUAD_BASE.map(([p, n]) => [p, n]));
  for (let i = 0; i < size - 24; i++) {
    const p = EXTRA_ORDER[i % EXTRA_ORDER.length];
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  for (let i = 0; i < 24 - size; i++) {
    const p = TRIM_ORDER[i % TRIM_ORDER.length];
    counts.set(p, (counts.get(p) ?? 0) - 1);
  }
  return SQUAD_BASE.flatMap(([p]) => Array<Position>(counts.get(p) ?? 0).fill(p));
}

/* ---------- Utilitários ---------- */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const between = (rng: Rng, [min, max]: [number, number]) => min + rng.next() * (max - min);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const STOPWORDS = new Set([
  "esporte", "clube", "futebol", "associacao", "atletica", "atletico", "sociedade", "esportiva",
  "sport", "club", "de", "da", "do", "das", "dos", "fc", "racing", "deportivo", "sportivo", "la", "los", "del",
]);

export function makeShortName(name: string, taken: Set<string>): string {
  const words = stripAccents(name)
    .replace(/[^A-Za-z ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()));
  const base = words.length ? words : stripAccents(name).split(/\s+/);
  const candidates: string[] = [];
  if (base.length === 1) {
    const w = base[0].toUpperCase();
    candidates.push(w.slice(0, 3), w[0] + w.slice(2, 4), w[0] + w[1] + w[w.length - 1]);
  } else {
    const initials = base.map((w) => w[0].toUpperCase()).join("");
    candidates.push(initials.slice(0, 3));
    candidates.push((base[0].slice(0, 2) + base[1][0]).toUpperCase());
    candidates.push((base[0][0] + base[1].slice(0, 2)).toUpperCase());
  }
  for (const c of candidates) {
    if (c.length === 3 && !taken.has(c)) {
      taken.add(c);
      return c;
    }
  }
  const root = (candidates[0] + "XXX").slice(0, 2);
  for (let i = 0; i < 26; i++) {
    const c = root + String.fromCharCode(65 + i);
    if (!taken.has(c)) {
      taken.add(c);
      return c;
    }
  }
  return candidates[0].slice(0, 3);
}

/* ---------- Jogadores ---------- */

function brazilianName(rng: Rng, demonym: string): { knownAs: string; fullName: string } {
  const first = rng.pick(BR_FIRST);
  const middle = rng.chance(0.35) ? ` ${rng.pick(BR_MIDDLE)}` : "";
  const s1 = rng.pick(BR_SURNAME);
  const s2 = rng.chance(0.6) ? ` ${rng.pick(BR_SURNAME)}` : "";
  const fullName = `${first}${middle} ${s1}${s2}`;

  const r = rng.next();
  let knownAs: string;
  if (r < 0.4) knownAs = `${first} ${s1}`;
  else if (r < 0.58) knownAs = first;
  else if (r < 0.7) knownAs = BR_DIMINUTIVE[first] ?? `${first} ${s1}`;
  else if (r < 0.8) knownAs = middle ? `${first}${middle}` : `${first} ${s1}`;
  else if (r < 0.9) knownAs = rng.pick(BR_NICKNAME);
  else if (r < 0.95 && demonym) knownAs = `${BR_DIMINUTIVE[first] ?? first} ${demonym}`;
  else if (r < 0.95) knownAs = `${first} ${s1}`;
  else knownAs = `Zé ${rng.pick(BR_FIRST)}`;
  return { knownAs, fullName };
}

function spanishName(rng: Rng): { knownAs: string; fullName: string } {
  const first = rng.pick(ES_FIRST);
  const s1 = rng.pick(ES_SURNAME);
  const s2 = rng.pick(ES_SURNAME);
  const fullName = `${first} ${s1} ${s2}`;
  const knownAs = rng.chance(0.75) ? `${first} ${s1}` : s1;
  return { knownAs, fullName };
}

const SOUTH_AMERICA: readonly Country[] = ["AR", "UY", "CO", "CL", "PY", "EC", "PE", "BO", "VE"];

function ageEffect(age: number): number {
  if (age < 20) return -9;
  if (age < 23) return -4;
  if (age < 26) return -1;
  if (age < 31) return 1;
  if (age < 34) return 0;
  return -3;
}

function potentialGap(rng: Rng, age: number): number {
  if (age < 20) return rng.int(4, 24);
  if (age < 23) return rng.int(2, 14);
  if (age < 26) return rng.int(0, 7);
  return rng.int(0, 2);
}

function rollAge(rng: Rng): number {
  // Concentra entre 21 e 31, com cauda de garotos e veteranos.
  return clamp(Math.round(rng.normal(26, 4.6)), 17, 39);
}

function rollFoot(rng: Rng, position: Position): Foot {
  if (rng.chance(0.05)) return "A";
  // Laterais-esquerdos são canhotos; pontas costumam jogar com o pé invertido
  // para cortar para dentro (ponta-direita canhoto).
  const leftChance = position === "LE" || position === "PD" ? 0.75 : 0.2;
  return rng.chance(leftChance) ? "E" : "D";
}

interface PlayerContext {
  clubId: string;
  country: Country;
  level: number;
  foreignShare: number;
  demonym: string;
  /** Nomes já usados no elenco, para não repetir. */
  namesInSquad: Set<string>;
}

/* ---------- Clubes ---------- */

function pickCrest(rng: Rng): { shape: CrestShape; pattern: CrestPattern } {
  const shapes: CrestShape[] = ["escudo", "redondo", "classico"];
  const patterns: CrestPattern[] = ["liso", "listras", "faixa", "diagonal", "metade"];
  return { shape: rng.pick(shapes), pattern: rng.pick(patterns) };
}

function stadiumName(rng: Rng, city: string, tier: Tier, spanish: boolean): string {
  const r = rng.next();
  if (spanish) {
    if (r < 0.5) return `Estadio ${rng.pick(ES_FIRST)} ${rng.pick(ES_SURNAME)}`;
    return `Estadio Municipal de ${city}`;
  }
  if ((tier === "A" || tier === "B") && r < 0.3) return `Arena ${city}`;
  if (r < 0.7) return `Estádio ${rng.pick(STADIUM_HONOREES_FIRST)} ${rng.pick(BR_SURNAME)}`;
  return `Estádio Municipal de ${city}`;
}

function foundedYear(rng: Rng, prestige: number): number {
  // Clubes mais tradicionais tendem a ser mais antigos.
  const base = 1985 - prestige * 0.85;
  return clamp(Math.round(rng.normal(base, 9)), 1895, 2015);
}

/* ---------- Gerador ---------- */

class WorldBuilder {
  readonly rng: Rng;
  readonly clubs: Record<string, Club> = {};
  readonly players: Record<string, Player> = {};
  readonly shortNames = new Set<string>();
  readonly clubNames = new Set<string>();
  readonly cityNames = new Set<string>();
  private clubSeq = 0;
  private playerSeq = 0;
  readonly next: () => number;

  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.next = () => this.rng.next();
  }

  uniqueCity(spanish: boolean): string {
    for (let i = 0; i < 50; i++) {
      const name = spanish ? spanishCityName(this.next) : brazilianCityName(this.next);
      if (!this.cityNames.has(name)) {
        this.cityNames.add(name);
        return name;
      }
    }
    const fallback = `${spanish ? spanishCityName(this.next) : brazilianCityName(this.next)} ${this.cityNames.size}`;
    this.cityNames.add(fallback);
    return fallback;
  }

  uniqueClubName(city: string, spanish: boolean): string {
    const patterns = spanish ? ES_CLUB_PATTERNS : BR_CLUB_PATTERNS;
    const identities = spanish ? ES_CLUB_IDENTITY : BR_CLUB_IDENTITY;
    for (let i = 0; i < 40; i++) {
      const name = this.rng.pick(patterns)(city, this.rng.pick(identities));
      if (!this.clubNames.has(name)) {
        this.clubNames.add(name);
        return name;
      }
    }
    const name = `${city} Clube ${this.clubNames.size}`;
    this.clubNames.add(name);
    return name;
  }

  addPlayer(position: Position, ctx: PlayerContext, rankBonus: number): Player {
    const rng = this.rng;
    let nationality: Country = ctx.country;
    if (ctx.country === "BR") {
      if (rng.chance(ctx.foreignShare)) nationality = rng.pick(SOUTH_AMERICA);
    } else if (rng.chance(0.05)) {
      nationality = "BR";
    } else if (rng.chance(0.1)) {
      nationality = rng.pick(SOUTH_AMERICA);
    }
    // Dois "Paraíba" no mesmo elenco confundem: tenta outro nome se repetir.
    let name = nationality === "BR" ? brazilianName(rng, ctx.demonym) : spanishName(rng);
    for (let i = 0; i < 6 && ctx.namesInSquad.has(name.knownAs); i++) {
      name = nationality === "BR" ? brazilianName(rng, ctx.demonym) : spanishName(rng);
    }
    if (ctx.namesInSquad.has(name.knownAs)) name = { ...name, knownAs: name.fullName };
    ctx.namesInSquad.add(name.knownAs);
    const age = rollAge(rng);
    // Estrangeiros contratados por clubes brasileiros costumam vir para ser titulares.
    const importBonus = ctx.country === "BR" && nationality !== "BR" ? 3 : 0;
    const overall = Math.round(
      clamp(rng.normal(ctx.level + ageEffect(age) + rankBonus + importBonus, 4.5), 25, 94),
    );
    const potential = clamp(overall + potentialGap(rng, age), overall, 99);
    const id = `p${++this.playerSeq}`;
    const player: Player = {
      id,
      knownAs: name.knownAs,
      fullName: name.fullName,
      birthYear: FIRST_SEASON - age,
      nationality,
      position,
      foot: rollFoot(rng, position),
      overall,
      potential,
      clubId: ctx.clubId,
    };
    this.players[id] = player;
    return player;
  }

  addClub(opts: {
    city: string;
    state: string;
    country: Country;
    tier: Tier;
    prestige: number;
    level: number;
    squad: number;
    capacity: [number, number];
    fans: [number, number];
    foreignShare: number;
    demonym: string;
  }): Club {
    const rng = this.rng;
    const spanish = opts.country !== "BR";
    const id = `c${++this.clubSeq}`;
    const name = this.uniqueClubName(opts.city, spanish);
    const colorSet = rng.pick(COLOR_SETS);
    // Torcida e estádio crescem com o prestígio dentro da faixa do nível.
    const t = clamp((opts.prestige - 5) / 95, 0, 1);
    const fans = Math.round(
      opts.fans[0] * Math.pow(opts.fans[1] / opts.fans[0], clamp(t + rng.normal(0, 0.12), 0, 1)),
    );
    const capacity = Math.round(between(rng, opts.capacity) / 100) * 100;

    const club: Club = {
      id,
      name,
      shortName: makeShortName(name, this.shortNames),
      nickname: colorSet.nickname,
      city: opts.city,
      state: opts.state,
      country: opts.country,
      tier: opts.tier,
      founded: foundedYear(rng, opts.prestige),
      colors: [...colorSet.colors],
      crest: pickCrest(rng),
      prestige: Math.round(opts.prestige),
      fans,
      stadium: { name: stadiumName(rng, opts.city, opts.tier, spanish), capacity },
      rivals: [],
      playerIds: [],
    };
    this.clubs[id] = club;

    // Clubes de mais prestígio dentro do nível têm elencos um pouco melhores.
    const level = opts.level + (opts.prestige - 50) * 0.08;
    const ctx: PlayerContext = {
      clubId: id,
      country: opts.country,
      level,
      foreignShare: opts.foreignShare,
      demonym: opts.demonym,
      namesInSquad: new Set(),
    };
    const positions = squadPositions(opts.squad);
    const seen = new Map<Position, number>();
    for (const position of positions) {
      const order = seen.get(position) ?? 0;
      seen.set(position, order + 1);
      // O primeiro de cada posição tende a ser titular; os demais, reservas.
      const rankBonus = order === 0 ? 3 : order === 1 ? 0 : -4;
      club.playerIds.push(this.addPlayer(position, ctx, rankBonus).id);
    }
    return club;
  }

  /** Clubes de um estado: os de mais prestígio ocupam as séries mais altas. */
  buildState(def: StateDef): StateInfo {
    const rng = this.rng;
    const tiers: Tier[] = [];
    for (const t of ["A", "B", "C", "D"] as const) for (let i = 0; i < def.quota[t]; i++) tiers.push(t);
    while (tiers.length < def.clubs) tiers.push("E");

    // Capital: concentra os maiores clubes do estado (até 4), como no Brasil real.
    const capital = this.uniqueCity(false);
    const national = tiers.filter((t) => t !== "E").length;
    const capitalSlots = clamp(Math.ceil(national * 0.45), 2, 4);
    const sharedCities: string[] = [];

    const clubIds: string[] = [];
    tiers.forEach((tier, index) => {
      const profile = TIERS[tier as Exclude<Tier, "INT">];
      let city: string;
      if (index < capitalSlots) city = capital;
      else if (sharedCities.length && rng.chance(0.15)) city = rng.pick(sharedCities);
      else {
        city = this.uniqueCity(false);
        sharedCities.push(city);
      }
      const prestige = clamp(
        between(rng, profile.prestige) - (tier === "E" ? index * 0.3 : 0),
        profile.prestige[0] - 4,
        profile.prestige[1],
      );
      const club = this.addClub({
        city,
        state: def.uf,
        country: "BR",
        tier,
        prestige,
        level: profile.level,
        squad: profile.squad,
        capacity: profile.capacity,
        fans: profile.fans,
        foreignShare: profile.foreignShare,
        demonym: def.demonym,
      });
      clubIds.push(club.id);
    });
    return { uf: def.uf, name: def.name, demonym: def.demonym, clubIds };
  }

  buildCountry(def: (typeof COUNTRIES)[number]): CountryInfo {
    const rng = this.rng;
    const capital = this.uniqueCity(true);
    const clubIds: string[] = [];
    for (let i = 0; i < def.clubs; i++) {
      const city = i < 3 ? capital : this.uniqueCity(true);
      // Os primeiros clubes de cada país são os grandes.
      const rankFactor = 1 - i / def.clubs;
      const prestige = clamp(rng.normal(35 + rankFactor * 50 + (def.level - 60), 6), 15, 95);
      const club = this.addClub({
        city,
        state: "",
        country: def.code,
        tier: "INT",
        prestige,
        level: def.level - 9 + rankFactor * 8,
        squad: 26,
        capacity: [8000 + rankFactor * 30000, 20000 + rankFactor * 50000],
        fans: [30_000, 300_000 + rankFactor * 6_000_000],
        foreignShare: 0,
        demonym: "",
      });
      clubIds.push(club.id);
    }
    return { code: def.code, name: def.name, clubIds };
  }

  addRival(a: Club, b: Club, intensity: Rival["intensity"]) {
    const link = (from: Club, to: Club) => {
      const existing = from.rivals.find((r) => r.clubId === to.id);
      if (existing) existing.intensity = Math.max(existing.intensity, intensity) as Rival["intensity"];
      else from.rivals.push({ clubId: to.id, intensity });
    };
    link(a, b);
    link(b, a);
  }

  /** Rivalidades: mesma cidade, os maiores do estado e vizinhos de nível. */
  buildRivalries(groups: string[][]) {
    const big = (c: Club) => c.tier === "A" || c.tier === "B" || (c.tier === "INT" && c.prestige >= 60);
    for (const ids of groups) {
      const clubs = ids.map((id) => this.clubs[id]);
      const byCity = new Map<string, Club[]>();
      for (const c of clubs) byCity.set(c.city, [...(byCity.get(c.city) ?? []), c]);
      for (const cityClubs of byCity.values()) {
        for (let i = 0; i < cityClubs.length; i++) {
          for (let j = i + 1; j < cityClubs.length; j++) {
            const a = cityClubs[i];
            const b = cityClubs[j];
            this.addRival(a, b, big(a) && big(b) ? 3 : 2);
          }
        }
      }
      const top = [...clubs].sort((a, b) => b.prestige - a.prestige).slice(0, 4);
      for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
          if (top[i].city !== top[j].city) this.addRival(top[i], top[j], 2);
        }
      }
      for (const c of clubs) {
        if (c.rivals.length > 0) continue;
        const nearest = clubs
          .filter((o) => o.id !== c.id)
          .sort((x, y) => Math.abs(x.prestige - c.prestige) - Math.abs(y.prestige - c.prestige))[0];
        if (nearest) this.addRival(c, nearest, 1);
      }
    }
    for (const c of Object.values(this.clubs)) {
      c.rivals.sort((x, y) => y.intensity - x.intensity);
    }
  }
}

export function generateWorld(seed: number): World {
  const b = new WorldBuilder(seed);

  const states: Record<string, StateInfo> = {};
  for (const def of STATES) states[def.uf] = b.buildState(def);

  const countries: World["countries"] = {};
  for (const def of COUNTRIES) countries[def.code] = b.buildCountry(def);

  b.buildRivalries([
    ...Object.values(states).map((s) => s.clubIds),
    ...Object.values(countries).map((c) => c!.clubIds),
  ]);

  const divisions: World["divisions"] = { A: [], B: [], C: [], D: [] };
  for (const club of Object.values(b.clubs)) {
    if (club.tier === "A" || club.tier === "B" || club.tier === "C" || club.tier === "D") {
      divisions[club.tier].push(club.id);
    }
  }

  return {
    seed,
    season: FIRST_SEASON,
    clubs: b.clubs,
    players: b.players,
    divisions,
    states,
    countries,
    rng: b.rng.state(),
  };
}
