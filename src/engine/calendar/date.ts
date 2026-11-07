/** Datas do jogo no formato AAAA-MM-DD, sempre em UTC para não depender do fuso do aparelho. */

const DAY_MS = 86_400_000;

export function toDay(iso: string): number {
  return Math.round(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY_MS);
}

export function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return fromDay(toDay(iso) + days);
}

export function daysBetween(a: string, b: string): number {
  return toDay(b) - toDay(a);
}

/** 0 = domingo … 6 = sábado. */
export function weekday(iso: string): number {
  return new Date(toDay(iso) * DAY_MS).getUTCDay();
}

export const SUN = 0;
export const MON = 1;
export const TUE = 2;
export const WED = 3;
export const THU = 4;
export const FRI = 5;
export const SAT = 6;

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "dom, 11 abr" */
export function formatDate(iso: string): string {
  return `${WEEKDAYS[weekday(iso)]}, ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

/** "11/04" */
export function formatShortDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
