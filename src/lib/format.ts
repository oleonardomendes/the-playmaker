import { COUNTRY_NAMES } from "@/engine/world/geography";
import type { Country, Foot, Rival, Tier } from "@/engine/types";

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("pt-BR");

/** 17.201.981 → "17,2 mi"; 48.200 → "48,2 mil". */
export const formatCompact = (n: number) => compact.format(n);
export const formatInt = (n: number) => integer.format(n);

export const TIER_LABEL: Record<Tier, string> = {
  A: "Série A",
  B: "Série B",
  C: "Série C",
  D: "Série D",
  E: "Estadual",
  INT: "Exterior",
};

export const FOOT_LABEL: Record<Foot, string> = { D: "Destro", E: "Canhoto", A: "Ambidestro" };

export const RIVAL_LABEL: Record<Rival["intensity"], string> = {
  3: "Maior clássico",
  2: "Clássico",
  1: "Rival regional",
};

export const countryName = (c: Country) => COUNTRY_NAMES[c];

/** Sigla curta do país para tabelas. */
export const COUNTRY_SHORT: Record<Country, string> = {
  BR: "BRA", AR: "ARG", UY: "URU", CO: "COL", CL: "CHI", PY: "PAR", EC: "EQU", PE: "PER", BO: "BOL", VE: "VEN",
};
