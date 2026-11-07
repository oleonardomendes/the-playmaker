import { Rng } from "../rng";
import { expectedGoals } from "../sim/quickMatch";
import type { MatchEvent, MatchResult, Mentality, Player, Position, Pressing, Style, Tactic } from "../types";
import { effectiveRating, FORMATIONS } from "./tactics";

/**
 * Motor de partida minuto a minuto.
 *
 * O ritmo de gols parte do mesmo modelo calibrado da simulação rápida
 * (força dos titulares + mando de campo) e é ajustado pela tática,
 * pelo cansaço, pelas expulsões e pelo placar. Cada minuto pode ter
 * finalização, cartão ou lesão. O mesmo motor roda todas as partidas do
 * mundo; só as do seu clube guardam lances perdidos, escalações e notas.
 */

export interface SideSetup {
  clubId: string;
  tactic: Pick<Tactic, "formation" | "mentality" | "style" | "pressing">;
  /** Titulares na ordem dos slots da formação. */
  starters: string[];
  bench: string[];
  /** true = o técnico da IA cuida das trocas e da mentalidade. */
  auto: boolean;
}

export interface MatchSetup {
  home: SideSetup;
  away: SideSetup;
  seed: number;
  /** Guarda lances perdidos, escalações e notas (partidas do seu clube). */
  detailed: boolean;
  /** Campo neutro: sem vantagem de mando. */
  neutral?: boolean;
  /** Mata-mata: se o placar somado ao agregado empatar, vai para os pênaltis. */
  knockout?: { agg: [number, number] };
}

export interface InjuryOutcome {
  playerId: string;
  name: string;
  days: number;
}

export interface MatchOutcome {
  result: MatchResult;
  /** Condição física de quem jogou, ao fim da partida. */
  conditions: Record<string, number>;
  minutes: Record<string, number>;
  /** Nota de todos que jogaram (guardada na partida só quando detalhada). */
  ratings: Record<string, number>;
  injuries: InjuryOutcome[];
}

/* ---------- Ajustes táticos ---------- */

const MENTALITY_ATTACK: Record<Mentality, number> = { defensiva: 0.8, cautelosa: 0.9, equilibrada: 1, ofensiva: 1.1, total: 1.2 };
const MENTALITY_EXPOSURE: Record<Mentality, number> = { defensiva: 0.8, cautelosa: 0.9, equilibrada: 1, ofensiva: 1.1, total: 1.24 };
const PRESS_ATTACK: Record<Pressing, number> = { baixa: 0.97, media: 1, alta: 1.05 };
const PRESS_SUPPRESS: Record<Pressing, number> = { baixa: 1, media: 1, alta: 0.96 };
const PRESS_FATIGUE: Record<Pressing, number> = { baixa: 0.8, media: 1, alta: 1.3 };
const PRESS_CARDS: Record<Pressing, number> = { baixa: 0.85, media: 1, alta: 1.25 };

/** Bônus de estilo contra a postura do adversário. */
function styleEdge(own: Style, oppMentality: Mentality): number {
  if (own === "contra-ataque") return oppMentality === "ofensiva" || oppMentality === "total" ? 1.08 : 0.97;
  if (own === "direto") return 1.03;
  return 1;
}
/** Toque de bola segura o adversário longe do gol; jogo direto abre a partida. */
function styleSuppress(own: Style): number {
  if (own === "posse") return 0.95;
  if (own === "direto") return 1.03;
  return 1;
}

/** Conversão média das finalizações. */
const CONVERSION = 0.11;
const YELLOWS_PER_TEAM = 2.3;
const STRAIGHT_REDS_PER_TEAM = 0.035;
const INJURIES_PER_TEAM = 0.13;
const MAX_SUBS = 5;

const SHOT_WEIGHT: Record<Position, number> = { GOL: 0, ZAG: 0.45, LD: 0.5, LE: 0.5, VOL: 0.8, MEI: 2.2, PD: 3, PE: 3, ATA: 5 };
const ASSIST_WEIGHT: Record<Position, number> = { GOL: 0.05, ZAG: 0.3, LD: 1.5, LE: 1.5, VOL: 1, MEI: 3, PD: 3, PE: 3, ATA: 1.5 };
const CARD_WEIGHT: Record<Position, number> = { GOL: 0.2, ZAG: 1.4, LD: 1.1, LE: 1.1, VOL: 1.6, MEI: 0.9, PD: 0.8, PE: 0.8, ATA: 0.8 };
const ATTACK_UNIT: Record<Position, number> = { GOL: 0, ZAG: 0.1, LD: 0.3, LE: 0.3, VOL: 0.3, MEI: 0.7, PD: 0.9, PE: 0.9, ATA: 1 };
const MIDFIELD_UNIT: Record<Position, number> = { GOL: 0, ZAG: 0.2, LD: 0.3, LE: 0.3, VOL: 1, MEI: 1, PD: 0.5, PE: 0.5, ATA: 0.2 };

const INJURY_NAMES: ReadonlyArray<{ name: string; min: number; max: number; weight: number }> = [
  { name: "Pancada", min: 3, max: 7, weight: 30 },
  { name: "Entorse no tornozelo", min: 7, max: 18, weight: 20 },
  { name: "Lesão muscular na coxa", min: 12, max: 30, weight: 22 },
  { name: "Estiramento na panturrilha", min: 8, max: 20, weight: 14 },
  { name: "Lesão no joelho", min: 25, max: 60, weight: 9 },
  { name: "Ruptura de ligamento", min: 120, max: 220, weight: 2 },
  { name: "Fratura no pé", min: 50, max: 90, weight: 3 },
];

interface PlayerState {
  id: string;
  slot: Position;
  cond: number;
  minutes: number;
  yellow: number;
  goals: number;
  assists: number;
  sentOff: boolean;
}

interface SideState {
  setup: SideSetup;
  mentality: Mentality;
  onPitch: PlayerState[];
  appeared: Map<string, PlayerState>;
  bench: string[];
  subsLeft: number;
  /** Jogadores a menos (expulsões e lesões sem troca). */
  missing: number;
  goals: number;
  shots: number;
  onTarget: number;
  subMinutes: number[];
}

function weightedPick<T>(rng: Rng, items: T[], weight: (item: T) => number): T | undefined {
  let total = 0;
  for (const item of items) total += Math.max(0, weight(item));
  if (total <= 0) return undefined;
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

export class MatchSim {
  readonly rng: Rng;
  readonly sides: [SideState, SideState];
  readonly events: MatchEvent[] = [];
  readonly length: number;
  minute = 0;
  done = false;
  private injuries: InjuryOutcome[] = [];
  private pens?: [number, number];
  private rates: [number, number] = [0, 0];
  private ratesAt = -1;

  constructor(
    private readonly players: Record<string, Player>,
    private readonly setup: MatchSetup,
    private readonly birthYearBase = 2027,
  ) {
    this.rng = new Rng(setup.seed);
    this.sides = [this.makeSide(setup.home), this.makeSide(setup.away)];
    this.length = 90 + this.rng.int(1, 5);
    for (const side of this.sides) {
      side.subMinutes = [this.rng.int(57, 64), this.rng.int(68, 74), this.rng.int(78, 84)];
    }
  }

  private makeSide(setup: SideSetup): SideState {
    const slots = FORMATIONS[setup.tactic.formation];
    const onPitch: PlayerState[] = setup.starters.slice(0, 11).map((id, i) => ({
      id,
      slot: slots[i] ?? this.players[id].position,
      cond: this.players[id].condition,
      minutes: 0,
      yellow: 0,
      goals: 0,
      assists: 0,
      sentOff: false,
    }));
    return {
      setup,
      mentality: setup.tactic.mentality,
      onPitch,
      appeared: new Map(onPitch.map((p) => [p.id, p])),
      bench: [...setup.bench],
      subsLeft: MAX_SUBS,
      missing: Math.max(0, 11 - onPitch.length),
      goals: 0,
      shots: 0,
      onTarget: 0,
      subMinutes: [],
    };
  }

  private eff(p: PlayerState): number {
    return effectiveRating(this.players[p.id], p.slot, p.cond);
  }

  private strength(side: SideState): number {
    if (side.onPitch.length === 0) return 0;
    return side.onPitch.reduce((s, p) => s + this.eff(p), 0) / side.onPitch.length;
  }

  private unit(side: SideState, weights: Record<Position, number>): number {
    let sum = 0;
    let w = 0;
    for (const p of side.onPitch) {
      sum += this.eff(p) * weights[p.slot];
      w += weights[p.slot];
    }
    return w > 0 ? sum / w : 0;
  }

  private keeper(side: SideState): number {
    const gk = side.onPitch.find((p) => p.slot === "GOL");
    return gk ? this.eff(gk) : 35;
  }

  /** Mentalidade do técnico da IA conforme o placar. */
  private updateAutoMentality(side: SideState, index: 0 | 1) {
    if (!side.setup.auto || this.minute < 70) return;
    const diff = this.sides[index].goals - this.sides[1 - index].goals + this.aggDiff(index);
    if (diff < 0) side.mentality = this.minute >= 80 && diff <= -1 ? "total" : "ofensiva";
    else if (diff > 0) side.mentality = "cautelosa";
    else side.mentality = side.setup.tactic.mentality;
  }

  /** Diferença no agregado de um mata-mata, do ponto de vista do lado. */
  private aggDiff(index: 0 | 1): number {
    const agg = this.setup.knockout?.agg;
    if (!agg) return 0;
    return index === 0 ? agg[0] - agg[1] : agg[1] - agg[0];
  }

  private computeRates() {
    const [home, away] = this.sides;
    this.updateAutoMentality(home, 0);
    this.updateAutoMentality(away, 1);
    const sh = this.strength(home);
    const sa = this.strength(away);
    let xg = expectedGoals(sh, sa);
    if (this.setup.neutral) {
      const mean = (xg.home + xg.away) / 2;
      const ratio = Math.sqrt(xg.home / xg.away);
      xg = { home: mean * ratio, away: mean / ratio };
    }
    const rate = (own: SideState, opp: SideState, base: number) => {
      // Ataque contra defesa adversária acrescenta um pouco de nuance ao placar.
      const matchup = Math.exp((this.unit(own, ATTACK_UNIT) - this.unit(opp, MIDFIELD_UNIT)) / 120);
      return (
        (base / 90) *
        MENTALITY_ATTACK[own.mentality] *
        MENTALITY_EXPOSURE[opp.mentality] *
        PRESS_ATTACK[own.setup.tactic.pressing] *
        PRESS_SUPPRESS[opp.setup.tactic.pressing] *
        styleEdge(own.setup.tactic.style, opp.mentality) *
        styleSuppress(opp.setup.tactic.style) *
        Math.pow(0.8, own.missing) *
        Math.pow(1.16, opp.missing) *
        matchup
      );
    };
    this.rates = [rate(home, away, xg.home), rate(away, home, xg.away)];
    this.ratesAt = this.minute;
  }

  private emit(event: MatchEvent, out: MatchEvent[]) {
    this.events.push(event);
    out.push(event);
  }

  /** Avança um minuto e devolve os lances desse minuto. */
  step(): MatchEvent[] {
    if (this.done) return [];
    this.minute += 1;
    const out: MatchEvent[] = [];
    if (this.ratesAt < 0 || this.minute - this.ratesAt >= 5) this.computeRates();

    for (const index of [0, 1] as const) {
      const side = this.sides[index];
      const opp = this.sides[1 - index];
      const fatigue = 0.2 * PRESS_FATIGUE[side.setup.tactic.pressing];
      for (const p of side.onPitch) {
        const age = this.birthYearBase - this.players[p.id].birthYear;
        p.cond = Math.max(20, p.cond - fatigue * (age >= 31 ? 1.15 : 1));
        p.minutes += 1;
      }
      this.tryShot(index, side, opp, out);
      this.tryCards(index, side, out);
      this.tryInjury(index, side, out);
      this.autoSubs(index, side, out);
    }

    if (this.minute >= this.length) this.finishMatch(out);
    return out;
  }

  private tryShot(index: 0 | 1, side: SideState, opp: SideState, out: MatchEvent[]) {
    const pShot = Math.min(0.5, this.rates[index] / CONVERSION);
    if (!this.rng.chance(pShot)) return;
    const shooter = weightedPick(this.rng, side.onPitch, (p) => SHOT_WEIGHT[p.slot] * (this.eff(p) / 70) ** 2);
    if (!shooter) return;
    side.shots += 1;
    const quality = Math.min(1.45, Math.max(0.7, Math.sqrt(this.eff(shooter) / Math.max(30, this.keeper(opp)))));
    if (this.rng.chance(CONVERSION * quality)) {
      side.goals += 1;
      side.onTarget += 1;
      shooter.goals += 1;
      let assistId: string | undefined;
      if (this.rng.chance(0.72)) {
        const assist = weightedPick(this.rng, side.onPitch.filter((p) => p !== shooter), (p) => ASSIST_WEIGHT[p.slot] * (this.eff(p) / 70));
        if (assist) {
          assist.assists += 1;
          assistId = assist.id;
        }
      }
      this.emit([this.minute, "G", index, shooter.id, assistId], out);
      // O placar muda o comportamento: recalcula no minuto seguinte.
      this.ratesAt = -1;
      return;
    }
    const roll = this.rng.next();
    const kind = roll < 0.36 ? "defesa" : roll < 0.46 ? "trave" : "fora";
    if (kind === "defesa") side.onTarget += 1;
    if (this.setup.detailed) this.emit([this.minute, "C", index, shooter.id, kind], out);
  }

  private sendOff(index: 0 | 1, side: SideState, player: PlayerState, out: MatchEvent[]) {
    player.sentOff = true;
    side.onPitch = side.onPitch.filter((p) => p !== player);
    side.missing += 1;
    this.emit([this.minute, "R", index, player.id], out);
    this.ratesAt = -1;
  }

  private tryCards(index: 0 | 1, side: SideState, out: MatchEvent[]) {
    const late = this.minute > 75 ? 1.2 : 1;
    const pYellow = (YELLOWS_PER_TEAM / 90) * PRESS_CARDS[side.setup.tactic.pressing] * late;
    if (this.rng.chance(pYellow)) {
      // Quem já tem amarelo segura a mão.
      const player = weightedPick(this.rng, side.onPitch, (p) => CARD_WEIGHT[p.slot] * (p.yellow > 0 ? 0.3 : 1));
      if (player) {
        player.yellow += 1;
        this.emit([this.minute, "Y", index, player.id], out);
        if (player.yellow >= 2) this.sendOff(index, side, player, out);
      }
    }
    if (this.rng.chance(STRAIGHT_REDS_PER_TEAM / 90)) {
      const player = weightedPick(this.rng, side.onPitch, (p) => CARD_WEIGHT[p.slot]);
      if (player) this.sendOff(index, side, player, out);
    }
  }

  private tryInjury(index: 0 | 1, side: SideState, out: MatchEvent[]) {
    const tiredness = side.onPitch.reduce((s, p) => s + (100 - p.cond), 0) / Math.max(1, side.onPitch.length);
    const p = (INJURIES_PER_TEAM / 90) * (0.6 + tiredness / 30);
    if (!this.rng.chance(p)) return;
    const player = weightedPick(this.rng, side.onPitch, (pl) => 110 - pl.cond);
    if (!player) return;
    const kind = weightedPick(this.rng, [...INJURY_NAMES], (k) => k.weight)!;
    this.injuries.push({ playerId: player.id, name: kind.name, days: this.rng.int(kind.min, kind.max) });
    this.emit([this.minute, "I", index, player.id], out);
    // Lesionado sai: o auxiliar faz a troca, se ainda houver substituições.
    const replacement = this.bestBench(side, player.slot);
    if (replacement && side.subsLeft > 0) {
      this.doSub(index, side, player, replacement, out);
    } else {
      side.onPitch = side.onPitch.filter((pl) => pl !== player);
      side.missing += 1;
      this.ratesAt = -1;
    }
  }

  private bestBench(side: SideState, slot: Position): string | undefined {
    let best: string | undefined;
    let bestScore = -1;
    for (const id of side.bench) {
      const score = effectiveRating(this.players[id], slot);
      if (score > bestScore) {
        best = id;
        bestScore = score;
      }
    }
    return best;
  }

  private doSub(index: 0 | 1, side: SideState, out: PlayerState, inId: string, events: MatchEvent[]) {
    const incoming: PlayerState = {
      id: inId,
      slot: out.slot,
      cond: this.players[inId].condition,
      minutes: 0,
      yellow: 0,
      goals: 0,
      assists: 0,
      sentOff: false,
    };
    side.onPitch = side.onPitch.map((p) => (p === out ? incoming : p));
    side.appeared.set(inId, incoming);
    side.bench = side.bench.filter((id) => id !== inId);
    side.subsLeft -= 1;
    this.emit([this.minute, "S", index, out.id, inId], events);
    this.ratesAt = -1;
  }

  private autoSubs(index: 0 | 1, side: SideState, out: MatchEvent[]) {
    if (!side.setup.auto || !side.subMinutes.includes(this.minute)) return;
    const late = this.minute >= 75;
    const candidates = [...side.onPitch].filter((p) => p.slot !== "GOL").sort((a, b) => a.cond - b.cond);
    let made = 0;
    for (const p of candidates) {
      if (made >= 2 || side.subsLeft <= 0) break;
      const replacementId = this.bestBench(side, p.slot);
      if (!replacementId) break;
      const gain = effectiveRating(this.players[replacementId], p.slot) - this.eff(p);
      // Troca quem está cansado, quem já tem amarelo no fim, ou quando o reserva rende mais agora.
      const booked = late && p.yellow > 0;
      if (p.cond < 76 || gain > 1 || booked || (late && gain > -8)) {
        this.doSub(index, side, p, replacementId, out);
        made += 1;
      }
    }
  }

  /* ---------- Controles do técnico (partida ao vivo) ---------- */

  setMentality(index: 0 | 1, mentality: Mentality) {
    this.sides[index].mentality = mentality;
    this.ratesAt = -1;
  }

  setTactic(index: 0 | 1, tactic: Partial<Pick<Tactic, "style" | "pressing">>) {
    const side = this.sides[index];
    side.setup = { ...side.setup, tactic: { ...side.setup.tactic, ...tactic } };
    this.ratesAt = -1;
  }

  /** Faz uma substituição; devolve o motivo se não for possível. */
  substitute(index: 0 | 1, outId: string, inId: string): string | null {
    const side = this.sides[index];
    if (this.done) return "A partida já acabou.";
    if (side.subsLeft <= 0) return "Você já fez as 5 substituições.";
    const out = side.onPitch.find((p) => p.id === outId);
    if (!out) return "Esse jogador não está em campo.";
    if (!side.bench.includes(inId)) return "Esse jogador não está no banco.";
    this.doSub(index, side, out, inId, []);
    return null;
  }

  /* ---------- Fim de jogo ---------- */

  private finishMatch(out: MatchEvent[]) {
    this.done = true;
    const ko = this.setup.knockout;
    if (!ko) return;
    const [home, away] = this.sides;
    if (home.goals + ko.agg[0] !== away.goals + ko.agg[1]) return;
    this.pens = this.shootout(out);
  }

  private shootout(out: MatchEvent[]): [number, number] {
    const takers = this.sides.map((side) =>
      [...side.onPitch]
        .sort((a, b) => (a.slot === "GOL" ? 1 : 0) - (b.slot === "GOL" ? 1 : 0) || this.eff(b) - this.eff(a))
        .map((p) => p),
    );
    const score: [number, number] = [0, 0];
    let minute = 200;
    const kick = (index: 0 | 1, round: number) => {
      const list = takers[index];
      const taker = list[round % Math.max(1, list.length)];
      const gk = this.keeper(this.sides[1 - index]);
      const p = Math.min(0.9, Math.max(0.55, 0.74 + (this.eff(taker) - 70) / 200 - (gk - 70) / 300));
      const scored = this.rng.chance(p);
      if (scored) score[index] += 1;
      this.emit([minute++, "P", index, taker.id, scored ? "1" : "0"], out);
    };
    // Série de 5 cobranças, encerrada antes quando um lado não consegue mais alcançar.
    const decided = (homeLeft: number, awayLeft: number) =>
      score[0] > score[1] + awayLeft || score[1] > score[0] + homeLeft;
    let finished = false;
    for (let round = 0; round < 5 && !finished; round++) {
      kick(0, round);
      if (decided(4 - round, 5 - round)) finished = true;
      else {
        kick(1, round);
        if (decided(4 - round, 4 - round)) finished = true;
      }
    }
    let round = 5;
    while (score[0] === score[1]) {
      kick(0, round);
      kick(1, round);
      round += 1;
    }
    return score;
  }

  /** Simula até o fim e devolve o resultado. */
  run(): MatchOutcome {
    while (!this.done) this.step();
    return this.outcome();
  }

  outcome(): MatchOutcome {
    const [home, away] = this.sides;
    const possession = Math.round(
      Math.min(
        68,
        Math.max(
          32,
          50 +
            (this.unit(home, MIDFIELD_UNIT) - this.unit(away, MIDFIELD_UNIT)) * 0.7 +
            (home.setup.tactic.style === "posse" ? 5 : home.setup.tactic.style === "contra-ataque" ? -5 : 0) -
            (away.setup.tactic.style === "posse" ? 5 : away.setup.tactic.style === "contra-ataque" ? -5 : 0),
        ),
      ),
    );

    const conditions: Record<string, number> = {};
    const minutes: Record<string, number> = {};
    const ratings: Record<string, number> = {};
    this.sides.forEach((side, index) => {
      const opp = this.sides[1 - index];
      const diff = side.goals - opp.goals;
      const avg = this.strength(side) || 60;
      for (const p of side.appeared.values()) {
        conditions[p.id] = Math.round(p.cond);
        minutes[p.id] = p.minutes;
        let r = 6.3 + p.goals * 0.9 + p.assists * 0.5 + Math.max(-1, Math.min(1, diff)) * 0.35;
        r += (effectiveRating(this.players[p.id], p.slot, p.cond) - avg) / 25;
        if ((p.slot === "GOL" || p.slot === "ZAG") && opp.goals === 0) r += 0.5;
        if (p.slot === "GOL") r -= Math.max(0, opp.goals - 1) * 0.3;
        if (p.yellow > 0) r -= 0.3;
        if (p.sentOff) r -= 1.5;
        r += this.rng.normal(0, 0.35);
        if (p.minutes < 20) r = 6 + (r - 6) * 0.5;
        ratings[p.id] = Math.round(Math.min(10, Math.max(3, r)) * 10) / 10;
      }
    });

    const result: MatchResult = {
      hg: home.goals,
      ag: away.goals,
      events: this.events,
      stats: {
        shots: [home.shots, away.shots],
        onTarget: [home.onTarget, away.onTarget],
        possession,
      },
    };
    if (this.pens) result.pens = this.pens;
    if (this.setup.detailed) {
      result.lineups = [home.setup.starters.slice(), away.setup.starters.slice()];
      result.ratings = ratings;
    }
    return { result, conditions, minutes, ratings, injuries: this.injuries };
  }

  /** Retrato para a interface da partida ao vivo. */
  snapshot() {
    return {
      minute: this.minute,
      length: this.length,
      done: this.done,
      score: [this.sides[0].goals, this.sides[1].goals] as [number, number],
      pens: this.pens,
      sides: this.sides.map((s) => ({
        clubId: s.setup.clubId,
        mentality: s.mentality,
        style: s.setup.tactic.style,
        pressing: s.setup.tactic.pressing,
        subsLeft: s.subsLeft,
        onPitch: s.onPitch.map((p) => ({ id: p.id, slot: p.slot, cond: Math.round(p.cond), yellow: p.yellow })),
        bench: [...s.bench],
        shots: s.shots,
        onTarget: s.onTarget,
      })),
    };
  }
}

export function simulateMatch(players: Record<string, Player>, setup: MatchSetup, season: number): MatchOutcome {
  return new MatchSim(players, setup, season).run();
}
