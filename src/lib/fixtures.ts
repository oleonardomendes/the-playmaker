import { tieAggregate } from "@/engine/competitions/fixtures";
import type { Fixture, World } from "@/engine/types";

/** "Série A · Rodada 12", "Copa Nacional · Oitavas, ida". */
export function fixtureLabel(world: World, fixture: Fixture): string {
  const comp = world.competitions[fixture.comp];
  if (!comp) return "";
  const stage = comp.stages[fixture.stage];
  if (stage.type === "grupos") {
    const groupName = fixture.group && stage.groups.length > 1 ? `Grupo ${fixture.group}, ` : "";
    const phase = comp.stages.length > 1 ? `${stage.name}, ` : "";
    return `${comp.name} · ${phase}${groupName}rodada ${fixture.round + 1}`;
  }
  const leg = stage.legs === 2 ? (fixture.leg === 1 ? ", ida" : ", volta") : "";
  return `${comp.name} · ${stage.name}${leg}`;
}

/** V / E / D do ponto de vista do clube (pênaltis contam como empate no jogo). */
export function outcomeFor(fixture: Fixture, clubId: string): "V" | "E" | "D" | null {
  const r = fixture.result;
  if (!r) return null;
  const own = fixture.home === clubId ? r.hg : r.ag;
  const opp = fixture.home === clubId ? r.ag : r.hg;
  return own > opp ? "V" : own < opp ? "D" : "E";
}

/** "2–1" com os gols do clube primeiro. */
export function ownScore(fixture: Fixture, clubId: string): string {
  const r = fixture.result;
  if (!r) return "";
  const home = fixture.home === clubId;
  return `${home ? r.hg : r.ag}–${home ? r.ag : r.hg}${r.pens ? "*" : ""}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function scoreLine(fixture: Fixture): string {
  const r = fixture.result;
  if (!r) return "×";
  const pens = r.pens ? ` (${r.pens[0]}–${r.pens[1]} pên.)` : "";
  return `${r.hg} × ${r.ag}${pens}`;
}

/** Placar agregado de um confronto de ida e volta, do ponto de vista do mandante deste jogo. */
export function aggregateNote(world: World, fixture: Fixture): string | null {
  if (!fixture.tie || fixture.leg !== 2) return null;
  const comp = world.competitions[fixture.comp];
  const tie = comp.stages[fixture.stage].ties.find((t) => t.id === fixture.tie);
  if (!tie) return null;
  const agg = tieAggregate(world, tie);
  return `Agregado ${agg[fixture.home]} × ${agg[fixture.away]}`;
}

export const RESULT_STYLE: Record<"V" | "E" | "D", string> = {
  V: "bg-[#3fa35b] text-pitch",
  E: "bg-chalk-faint text-pitch",
  D: "bg-red text-white",
};
