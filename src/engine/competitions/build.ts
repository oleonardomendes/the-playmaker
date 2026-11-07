import { Rng } from "../rng";
import { teamStrength } from "../sim/quickMatch";
import type { Club, Competition, Country, Stage, World, Zone } from "../types";
import { FRI, MON, SAT, SUN, THU, TUE, WED, fromDay, toDay, weekday } from "../calendar/date";
import { roundCount } from "./roundRobin";
import { createGroupFixtures, createTies } from "./fixtures";

/**
 * Monta as competições de uma temporada, reserva as datas de todas as
 * rodadas sem que nenhum clube jogue duas vezes com menos de 3 dias de
 * intervalo, e cria as partidas que já podem ser definidas.
 *
 * Calendário-base (aproximado ao futebol brasileiro):
 *  jan–mar  estaduais; copa nacional começa em fevereiro
 *  abr–dez  Séries A e B; C até outubro; D até outubro
 *  abr–nov  copas continentais, às terças, quartas e quintas
 *  jul–out  copas estaduais do 2º semestre para quem não tem calendário
 */

export const COMPETITION_NAMES = {
  a: "Série A",
  b: "Série B",
  c: "Série C",
  d: "Série D",
  copa: "Copa Nacional",
  lib: "Copa Continental",
  sul: "Copa Sul-Continental",
} as const;

const REGION: Record<string, number> = {
  AM: 0, PA: 0, AC: 0, RO: 0, RR: 0, AP: 0, TO: 0,
  MA: 1, PI: 1, CE: 1, RN: 1, PB: 1, PE: 1, AL: 1, SE: 1, BA: 1,
  MT: 2, MS: 2, GO: 2, DF: 2,
  SP: 3, RJ: 3, MG: 3, ES: 3,
  PR: 4, SC: 4, RS: 4,
};

const LIB_QUOTA: Partial<Record<Country, number>> = { AR: 5, UY: 3, CO: 3, CL: 3, PY: 3, EC: 3, PE: 2, BO: 2, VE: 2 };
const SUL_QUOTA: Partial<Record<Country, number>> = { AR: 7, UY: 3, CO: 3, CL: 3, PY: 3, EC: 3, PE: 2, BO: 1, VE: 1 };
export const CONTINENTAL_SLOTS_BR = 6;

interface RoundWindow {
  from: string;
  to: string;
  days: number[];
}

interface PlannedCompetition {
  comp: Competition;
  /** Janelas de cada data, por fase. */
  windows: RoundWindow[][];
}

/* ---------- Utilitários ---------- */

const GROUP_NAMES = "ABCDEFGH".split("");

function stage(partial: Partial<Stage> & Pick<Stage, "name" | "type" | "legs">): Stage {
  return { dates: [], groups: [], ties: [], zones: [], started: false, done: false, ...partial };
}

function spread(season: number, from: string, to: string, n: number, days: number[]): RoundWindow[] {
  const start = toDay(`${season}-${from}`);
  const end = toDay(`${season}-${to}`);
  const span = end - start;
  return Array.from({ length: n }, (_, i) => ({
    from: fromDay(start + Math.floor((i * span) / n)),
    to: `${season}-${to}`,
    days,
  }));
}

function fixed(season: number, ranges: Array<[string, string]>, days: number[]): RoundWindow[] {
  return ranges.map(([from, to]) => ({ from: `${season}-${from}`, to: `${season}-${to}`, days }));
}

function byStrength(world: World, ids: string[]): string[] {
  const s = new Map(ids.map((id) => [id, teamStrength(world, world.clubs[id])]));
  return [...ids].sort((a, b) => s.get(b)! - s.get(a)!);
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newCompetition(world: World, partial: Omit<Competition, "season" | "current" | "discipline" | "done">): Competition {
  return { ...partial, season: world.season, current: 0, discipline: {}, done: false };
}

/* ---------- Participantes ---------- */

/** Classificados brasileiros às copas continentais. */
function brazilianContinental(world: World): { lib: string[]; sul: string[] } {
  const last = world.history.at(-1);
  const lib: string[] = [];
  const sul: string[] = [];
  if (last) {
    const copaChampion = last.champions.copa?.clubId;
    if (copaChampion) lib.push(copaChampion);
    for (const id of last.serieA) {
      if (lib.length >= CONTINENTAL_SLOTS_BR) break;
      if (!lib.includes(id)) lib.push(id);
    }
    for (const id of last.serieA) {
      if (sul.length >= CONTINENTAL_SLOTS_BR) break;
      if (!lib.includes(id)) sul.push(id);
    }
  } else {
    const ranked = byStrength(world, world.divisions.A);
    lib.push(...ranked.slice(0, CONTINENTAL_SLOTS_BR));
    sul.push(...ranked.slice(CONTINENTAL_SLOTS_BR, CONTINENTAL_SLOTS_BR * 2));
  }
  return { lib, sul };
}

function foreignContinental(world: World): { lib: string[]; sul: string[] } {
  const lib: string[] = [];
  const sul: string[] = [];
  for (const info of Object.values(world.countries)) {
    if (!info) continue;
    const ranked = byStrength(world, info.clubIds);
    const l = LIB_QUOTA[info.code] ?? 0;
    const s = SUL_QUOTA[info.code] ?? 0;
    lib.push(...ranked.slice(0, l));
    sul.push(...ranked.slice(l, l + s));
  }
  return { lib, sul };
}

/** Sorteio de 8 grupos de 4 por potes de força, evitando clubes do mesmo país no grupo. */
function drawContinentalGroups(world: World, clubIds: string[], rng: Rng): string[][] {
  const ranked = byStrength(world, clubIds);
  const pots = [0, 1, 2, 3].map((i) => ranked.slice(i * 8, i * 8 + 8));
  const groups: string[][] = GROUP_NAMES.map(() => []);
  for (const pot of pots) {
    let best: string[] | null = null;
    for (let attempt = 0; attempt < 60 && !best; attempt++) {
      const order = shuffle(rng, pot);
      const ok = order.every((id, g) => !groups[g].some((other) => world.clubs[other].country === world.clubs[id].country));
      if (ok) best = order;
    }
    (best ?? shuffle(rng, pot)).forEach((id, g) => groups[g].push(id));
  }
  return groups;
}

/** Até 12 clubes por estadual: os de divisão nacional primeiro, depois os melhores locais. */
export function estadualEntrants(world: World, uf: string): string[] {
  const ids = world.states[uf].clubIds;
  const national = ids.filter((id) => world.clubs[id].tier !== "E");
  const tierOrder = { A: 0, B: 1, C: 2, D: 3, E: 4, INT: 5 } as const;
  const nationalSorted = byStrength(world, national).sort((a, b) => tierOrder[world.clubs[a].tier] - tierOrder[world.clubs[b].tier]);
  const local = byStrength(world, ids.filter((id) => world.clubs[id].tier === "E"));
  return [...nationalSorted, ...local].slice(0, 12);
}

/* ---------- Planos de cada competição ---------- */

function planLeagues(world: World, rng: Rng): PlannedCompetition[] {
  const s = world.season;
  const plans: PlannedCompetition[] = [];

  const a = newCompetition(world, {
    id: "a",
    name: COMPETITION_NAMES.a,
    short: "Série A",
    kind: "liga",
    tier: "A",
    clubIds: [...world.divisions.A],
    stages: [
      stage({
        name: "Pontos corridos",
        type: "grupos",
        legs: 2,
        groups: [{ name: "Única", clubIds: shuffle(rng, world.divisions.A) }],
        zones: [
          { from: 1, to: 1, kind: "titulo" },
          { from: 2, to: CONTINENTAL_SLOTS_BR, kind: "continental" },
          { from: CONTINENTAL_SLOTS_BR + 1, to: CONTINENTAL_SLOTS_BR * 2, kind: "sul" },
          { from: 17, to: 20, kind: "rebaixa" },
        ],
      }),
    ],
  });
  plans.push({ comp: a, windows: [spread(s, "04-10", "12-06", 38, [SUN, WED, SAT, THU])] });

  const b = newCompetition(world, {
    id: "b",
    name: COMPETITION_NAMES.b,
    short: "Série B",
    kind: "liga",
    tier: "B",
    clubIds: [...world.divisions.B],
    stages: [
      stage({
        name: "Pontos corridos",
        type: "grupos",
        legs: 2,
        groups: [{ name: "Única", clubIds: shuffle(rng, world.divisions.B) }],
        zones: [
          { from: 1, to: 4, kind: "acesso" },
          { from: 17, to: 20, kind: "rebaixa" },
        ],
      }),
    ],
  });
  plans.push({ comp: b, windows: [spread(s, "04-03", "11-28", 38, [SAT, TUE, FRI, SUN])] });

  const c = newCompetition(world, {
    id: "c",
    name: COMPETITION_NAMES.c,
    short: "Série C",
    kind: "liga",
    tier: "C",
    clubIds: [...world.divisions.C],
    stages: [
      stage({
        name: "Primeira fase",
        type: "grupos",
        legs: 1,
        groups: [{ name: "Única", clubIds: shuffle(rng, world.divisions.C) }],
        zones: [
          { from: 1, to: 8, kind: "classifica" },
          { from: 17, to: 20, kind: "rebaixa" },
        ],
      }),
      stage({ name: "Quadrangulares", type: "grupos", legs: 2, zones: [{ from: 1, to: 2, kind: "acesso" }] }),
      stage({ name: "Final", type: "mata-mata", legs: 2 }),
    ],
  });
  plans.push({
    comp: c,
    windows: [
      spread(s, "04-10", "08-29", 19, [SUN, WED, SAT]),
      spread(s, "09-04", "10-10", 6, [SUN, WED, SAT]),
      fixed(s, [["10-14", "10-24"], ["10-21", "10-31"]], [SUN, WED, SAT]),
    ],
  });

  // Série D: 8 grupos regionais de 8.
  const dSorted = [...world.divisions.D].sort((x, y) => {
    const cx = world.clubs[x];
    const cy = world.clubs[y];
    return (REGION[cx.state] ?? 9) - (REGION[cy.state] ?? 9) || cx.state.localeCompare(cy.state);
  });
  const dGroups = GROUP_NAMES.map((name, i) => ({ name, clubIds: dSorted.slice(i * 8, i * 8 + 8) }));
  const d = newCompetition(world, {
    id: "d",
    name: COMPETITION_NAMES.d,
    short: "Série D",
    kind: "liga",
    tier: "D",
    clubIds: [...world.divisions.D],
    stages: [
      stage({
        name: "Fase de grupos",
        type: "grupos",
        legs: 2,
        groups: dGroups,
        zones: [
          { from: 1, to: 4, kind: "classifica" },
          { from: 8, to: 8, kind: "rebaixa" },
        ],
      }),
      stage({ name: "Segunda fase", type: "mata-mata", legs: 2 }),
      stage({ name: "Oitavas", type: "mata-mata", legs: 2 }),
      stage({ name: "Quartas (vale o acesso)", type: "mata-mata", legs: 2 }),
      stage({ name: "Semifinal", type: "mata-mata", legs: 2 }),
      stage({ name: "Final", type: "mata-mata", legs: 2 }),
    ],
  });
  const dDays = [SAT, SUN, WED];
  plans.push({
    comp: d,
    windows: [
      spread(s, "04-17", "07-25", 14, dDays),
      fixed(s, [["07-31", "08-08"], ["08-07", "08-15"]], dDays),
      fixed(s, [["08-14", "08-22"], ["08-21", "08-29"]], dDays),
      fixed(s, [["08-28", "09-05"], ["09-04", "09-12"]], dDays),
      fixed(s, [["09-11", "09-19"], ["09-18", "09-26"]], dDays),
      fixed(s, [["09-25", "10-03"], ["10-02", "10-10"]], dDays),
    ],
  });

  return plans;
}

function planCups(world: World, rng: Rng): PlannedCompetition[] {
  const s = world.season;
  const plans: PlannedCompetition[] = [];

  // Copa Nacional: Séries A, B e C e os 4 mais fortes da D.
  const copaClubs = [
    ...world.divisions.A,
    ...world.divisions.B,
    ...world.divisions.C,
    ...byStrength(world, world.divisions.D).slice(0, 4),
  ];
  const cupDays = [WED, THU, TUE];
  const copa = newCompetition(world, {
    id: "copa",
    name: COMPETITION_NAMES.copa,
    short: "Copa",
    kind: "copa",
    clubIds: copaClubs,
    stages: [
      stage({ name: "Primeira fase", type: "mata-mata", legs: 1 }),
      stage({ name: "Segunda fase", type: "mata-mata", legs: 1 }),
      stage({ name: "Oitavas", type: "mata-mata", legs: 2 }),
      stage({ name: "Quartas", type: "mata-mata", legs: 2 }),
      stage({ name: "Semifinal", type: "mata-mata", legs: 2 }),
      stage({ name: "Final", type: "mata-mata", legs: 2 }),
    ],
  });
  plans.push({
    comp: copa,
    windows: [
      fixed(s, [["02-17", "03-12"]], cupDays),
      fixed(s, [["03-10", "04-08"]], cupDays),
      fixed(s, [["05-11", "05-23"], ["05-18", "06-02"]], cupDays),
      fixed(s, [["07-27", "08-08"], ["08-03", "08-18"]], cupDays),
      fixed(s, [["09-07", "09-19"], ["09-14", "09-29"]], cupDays),
      fixed(s, [["10-19", "10-31"], ["10-26", "11-10"]], cupDays),
    ],
  });

  const br = brazilianContinental(world);
  const foreign = foreignContinental(world);
  const contDays = [TUE, WED, THU];
  const contWindows = () => [
    fixed(s, [["04-06", "04-16"], ["04-20", "04-30"], ["05-04", "05-14"], ["05-25", "06-04"], ["06-01", "06-11"], ["06-08", "06-18"]], contDays),
    fixed(s, [["08-02", "08-13"], ["08-09", "08-20"]], contDays),
    fixed(s, [["08-23", "09-03"], ["08-30", "09-10"]], contDays),
    fixed(s, [["09-20", "10-01"], ["09-27", "10-08"]], contDays),
    fixed(s, [["11-20", "11-29"]], [SAT, SUN]),
  ];
  const continental = (id: "lib" | "sul", clubIds: string[]) => {
    const groups = drawContinentalGroups(world, clubIds, rng).map((ids, i) => ({ name: GROUP_NAMES[i], clubIds: ids }));
    const comp = newCompetition(world, {
      id,
      name: COMPETITION_NAMES[id],
      short: id === "lib" ? "Continental" : "Sul-Continental",
      kind: "continental",
      clubIds,
      stages: [
        stage({ name: "Fase de grupos", type: "grupos", legs: 2, groups, zones: [{ from: 1, to: 2, kind: "classifica" }] }),
        stage({ name: "Oitavas", type: "mata-mata", legs: 2 }),
        stage({ name: "Quartas", type: "mata-mata", legs: 2 }),
        stage({ name: "Semifinal", type: "mata-mata", legs: 2 }),
        stage({ name: "Final", type: "mata-mata", legs: 1 }),
      ],
    });
    plans.push({ comp, windows: contWindows() });
  };
  continental("lib", [...br.lib, ...foreign.lib]);
  continental("sul", [...br.sul, ...foreign.sul]);

  return plans;
}

function planStates(world: World, rng: Rng): PlannedCompetition[] {
  const s = world.season;
  const plans: PlannedCompetition[] = [];
  const days = [SUN, WED, SAT, THU];
  for (const info of Object.values(world.states)) {
    const clubIds = estadualEntrants(world, info.uf);
    const n = clubIds.length;
    const withQuarters = n >= 8;
    const classify = withQuarters ? 8 : 4;
    const zones: Zone[] = [{ from: 1, to: classify, kind: "classifica" }];
    const stages: Stage[] = [
      stage({ name: "Primeira fase", type: "grupos", legs: 1, groups: [{ name: "Única", clubIds: shuffle(rng, clubIds) }], zones }),
    ];
    const windows: RoundWindow[][] = [spread(s, "01-16", "03-06", roundCount(n, 1), days)];
    if (withQuarters) {
      stages.push(stage({ name: "Quartas", type: "mata-mata", legs: 1 }));
      windows.push(fixed(s, [["03-07", "03-15"]], days));
      stages.push(stage({ name: "Semifinal", type: "mata-mata", legs: 1 }));
      windows.push(fixed(s, [["03-14", "03-22"]], days));
      stages.push(stage({ name: "Final", type: "mata-mata", legs: 2 }));
      windows.push(fixed(s, [["03-21", "03-29"], ["03-25", "04-05"]], days));
    } else {
      stages.push(stage({ name: "Semifinal", type: "mata-mata", legs: 1 }));
      windows.push(fixed(s, [["03-07", "03-15"]], days));
      stages.push(stage({ name: "Final", type: "mata-mata", legs: 2 }));
      windows.push(fixed(s, [["03-14", "03-22"], ["03-21", "03-29"]], days));
    }
    plans.push({
      comp: newCompetition(world, {
        id: `est-${info.uf}`,
        name: `Estadual ${info.demonym === "Paulista" ? "Paulista" : `de ${info.name}`}`,
        short: `Estadual ${info.uf}`,
        kind: "estadual",
        uf: info.uf,
        clubIds,
        stages,
      }),
      windows,
    });

    // Copa do 2º semestre para os clubes locais sem divisão nacional.
    const local = byStrength(world, info.clubIds.filter((id) => world.clubs[id].tier === "E")).slice(0, 8);
    if (local.length >= 4) {
      plans.push({
        comp: newCompetition(world, {
          id: `cpe-${info.uf}`,
          name: `Copa ${info.name}`,
          short: `Copa ${info.uf}`,
          kind: "copa-estadual",
          uf: info.uf,
          clubIds: local,
          stages: [
            stage({
              name: "Fase única",
              type: "grupos",
              legs: 1,
              groups: [{ name: "Única", clubIds: shuffle(rng, local) }],
              zones: [{ from: 1, to: 2, kind: "classifica" }],
            }),
            stage({ name: "Final", type: "mata-mata", legs: 1 }),
          ],
        }),
        windows: [spread(s, "07-03", "10-02", roundCount(local.length, 1), [SAT, SUN, WED]), fixed(s, [["10-09", "10-24"]], [SAT, SUN, WED])],
      });
    }
  }
  return plans;
}

/* ---------- Agendador ---------- */

const MIN_GAP = 3;

class Scheduler {
  /** Datas (em dias) já ocupadas por cada clube. */
  private busy = new Map<string, number[]>();

  private free(clubIds: string[], day: number): boolean {
    for (const id of clubIds) {
      const days = this.busy.get(id);
      if (!days) continue;
      for (const d of days) if (Math.abs(d - day) < MIN_GAP) return false;
    }
    return true;
  }

  private take(clubIds: string[], day: number) {
    for (const id of clubIds) {
      const days = this.busy.get(id);
      if (days) days.push(day);
      else this.busy.set(id, [day]);
    }
  }

  /** Reserva uma data por janela, em ordem, respeitando o intervalo mínimo. */
  scheduleStage(name: string, clubIds: string[], windows: RoundWindow[], after: number): { dates: string[]; last: number } {
    const dates: string[] = [];
    let prev = after;
    for (const w of windows) {
      const from = Math.max(toDay(w.from), prev + MIN_GAP);
      const to = toDay(w.to);
      let chosen = this.search(clubIds, from, to, w.days);
      // Sem vaga na janela: estica duas semanas e aceita qualquer dia.
      chosen ??= this.search(clubIds, from, to + 14, [SUN, MON, TUE, WED, THU, FRI, SAT]);
      if (chosen === undefined) throw new Error(`Sem data disponível para ${name} a partir de ${fromDay(from)}`);
      this.take(clubIds, chosen);
      dates.push(fromDay(chosen));
      prev = chosen;
    }
    return { dates, last: prev };
  }

  /** Primeiro dia permitido e livre para todos os clubes dentro da janela. */
  private search(clubIds: string[], from: number, to: number, days: number[]): number | undefined {
    for (let d = from; d <= to; d++) {
      if (days.includes(weekday(fromDay(d))) && this.free(clubIds, d)) return d;
    }
    return undefined;
  }
}

/**
 * Cria todas as competições da temporada atual do mundo (mutando-o):
 * competições, datas reservadas e as partidas das fases iniciais.
 */
export function buildSeason(world: World): void {
  const rng = new Rng(world.rng);
  const plans = [...planCups(world, rng), ...planLeagues(world, rng), ...planStates(world, rng)];
  // Ordem de prioridade na agenda: continentais, copa, ligas, estaduais e copas do 2º semestre.
  const priority = (c: Competition) =>
    c.kind === "continental" ? 0 : c.kind === "copa" ? 1 : c.kind === "liga" ? 2 : c.kind === "estadual" ? 3 : 4;
  plans.sort((x, y) => priority(x.comp) - priority(y.comp));

  const scheduler = new Scheduler();
  world.competitions = {};
  world.fixtures = {};
  world.schedule = {};
  for (const { comp, windows } of plans) {
    let last = -Infinity;
    comp.stages.forEach((st, i) => {
      const { dates, last: end } = scheduler.scheduleStage(`${comp.name} (${st.name})`, comp.clubIds, windows[i], last);
      st.dates = dates;
      last = end;
    });
    world.competitions[comp.id] = comp;
  }

  // Partidas que já dá para definir: fases de grupos iniciais e a 1ª fase da copa.
  for (const comp of Object.values(world.competitions)) {
    const first = comp.stages[0];
    if (first.type === "grupos") createGroupFixtures(world, comp, 0, rng);
  }
  const copa = world.competitions.copa;
  if (copa) {
    // Potes: os 32 mais fortes contra os 32 mais fracos; o mais fraco manda o jogo único.
    const ranked = byStrength(world, copa.clubIds);
    const strong = shuffle(rng, ranked.slice(0, 32));
    const weak = shuffle(rng, ranked.slice(32));
    createTies(world, copa, 0, strong.map((id, i) => [weak[i], id] as [string, string]));
  }

  world.rng = rng.state();
}

/** Clubes ordenados pela força: usado para mando de campo no mata-mata. */
export function strongerFirst(world: World, a: string, b: string): [string, string] {
  const clubs: Club[] = [world.clubs[a], world.clubs[b]];
  const sa = teamStrength(world, clubs[0]);
  const sb = teamStrength(world, clubs[1]);
  return sa >= sb ? [a, b] : [b, a];
}
