import type { Country } from "../types";

/**
 * Geografia do mundo. Estados e países são reais; as cidades dos clubes são
 * fictícias (geradas), para nenhum clube coincidir com um clube real.
 * Quem quiser o futebol real instala um pack com nomes reais.
 */

export interface StateDef {
  uf: string;
  name: string;
  demonym: string;
  /** Total de clubes do estado no mundo. */
  clubs: number;
  /** Quantos clubes do estado estão em cada série nacional. */
  quota: { A: number; B: number; C: number; D: number };
}

export const STATES: readonly StateDef[] = [
  { uf: "SP", name: "São Paulo", demonym: "Paulista", clubs: 34, quota: { A: 5, B: 3, C: 2, D: 3 } },
  { uf: "RJ", name: "Rio de Janeiro", demonym: "Carioca", clubs: 20, quota: { A: 4, B: 1, C: 0, D: 3 } },
  { uf: "MG", name: "Minas Gerais", demonym: "Mineiro", clubs: 20, quota: { A: 3, B: 2, C: 1, D: 3 } },
  { uf: "RS", name: "Rio Grande do Sul", demonym: "Gaúcho", clubs: 18, quota: { A: 2, B: 1, C: 1, D: 3 } },
  { uf: "PR", name: "Paraná", demonym: "Paranaense", clubs: 16, quota: { A: 2, B: 2, C: 1, D: 3 } },
  { uf: "SC", name: "Santa Catarina", demonym: "Catarinense", clubs: 14, quota: { A: 0, B: 3, C: 1, D: 3 } },
  { uf: "BA", name: "Bahia", demonym: "Baiano", clubs: 14, quota: { A: 1, B: 1, C: 1, D: 3 } },
  { uf: "PE", name: "Pernambuco", demonym: "Pernambucano", clubs: 14, quota: { A: 1, B: 2, C: 1, D: 3 } },
  { uf: "CE", name: "Ceará", demonym: "Cearense", clubs: 12, quota: { A: 1, B: 1, C: 1, D: 3 } },
  { uf: "GO", name: "Goiás", demonym: "Goiano", clubs: 12, quota: { A: 1, B: 2, C: 1, D: 3 } },
  { uf: "PA", name: "Pará", demonym: "Paraense", clubs: 10, quota: { A: 0, B: 1, C: 2, D: 2 } },
  { uf: "AM", name: "Amazonas", demonym: "Amazonense", clubs: 8, quota: { A: 0, B: 0, C: 1, D: 2 } },
  { uf: "MA", name: "Maranhão", demonym: "Maranhense", clubs: 8, quota: { A: 0, B: 0, C: 1, D: 2 } },
  { uf: "PB", name: "Paraíba", demonym: "Paraibano", clubs: 8, quota: { A: 0, B: 0, C: 1, D: 2 } },
  { uf: "RN", name: "Rio Grande do Norte", demonym: "Potiguar", clubs: 8, quota: { A: 0, B: 0, C: 1, D: 2 } },
  { uf: "AL", name: "Alagoas", demonym: "Alagoano", clubs: 8, quota: { A: 0, B: 1, C: 0, D: 2 } },
  { uf: "PI", name: "Piauí", demonym: "Piauiense", clubs: 8, quota: { A: 0, B: 0, C: 1, D: 2 } },
  { uf: "SE", name: "Sergipe", demonym: "Sergipano", clubs: 8, quota: { A: 0, B: 0, C: 1, D: 2 } },
  { uf: "ES", name: "Espírito Santo", demonym: "Capixaba", clubs: 8, quota: { A: 0, B: 0, C: 0, D: 2 } },
  { uf: "MT", name: "Mato Grosso", demonym: "Mato-grossense", clubs: 8, quota: { A: 0, B: 0, C: 1, D: 2 } },
  { uf: "MS", name: "Mato Grosso do Sul", demonym: "Sul-mato-grossense", clubs: 8, quota: { A: 0, B: 0, C: 1, D: 2 } },
  { uf: "DF", name: "Distrito Federal", demonym: "Brasiliense", clubs: 8, quota: { A: 0, B: 0, C: 0, D: 2 } },
  { uf: "TO", name: "Tocantins", demonym: "Tocantinense", clubs: 6, quota: { A: 0, B: 0, C: 0, D: 2 } },
  { uf: "RO", name: "Rondônia", demonym: "Rondoniense", clubs: 6, quota: { A: 0, B: 0, C: 0, D: 2 } },
  { uf: "AC", name: "Acre", demonym: "Acreano", clubs: 6, quota: { A: 0, B: 0, C: 0, D: 2 } },
  { uf: "AP", name: "Amapá", demonym: "Amapaense", clubs: 6, quota: { A: 0, B: 0, C: 0, D: 2 } },
  { uf: "RR", name: "Roraima", demonym: "Roraimense", clubs: 6, quota: { A: 0, B: 0, C: 0, D: 2 } },
];

export interface CountryDef {
  code: Exclude<Country, "BR">;
  name: string;
  clubs: number;
  /** Nível médio do futebol do país (força média dos titulares do clube típico). */
  level: number;
}

export const COUNTRIES: readonly CountryDef[] = [
  { code: "AR", name: "Argentina", clubs: 14, level: 70 },
  { code: "UY", name: "Uruguai", clubs: 8, level: 64 },
  { code: "CO", name: "Colômbia", clubs: 8, level: 65 },
  { code: "CL", name: "Chile", clubs: 8, level: 62 },
  { code: "PY", name: "Paraguai", clubs: 6, level: 63 },
  { code: "EC", name: "Equador", clubs: 6, level: 64 },
  { code: "PE", name: "Peru", clubs: 4, level: 60 },
  { code: "BO", name: "Bolívia", clubs: 3, level: 57 },
  { code: "VE", name: "Venezuela", clubs: 3, level: 57 },
];

export const COUNTRY_NAMES: Record<Country, string> = {
  BR: "Brasil",
  AR: "Argentina",
  UY: "Uruguai",
  CO: "Colômbia",
  CL: "Chile",
  PY: "Paraguai",
  EC: "Equador",
  PE: "Peru",
  BO: "Bolívia",
  VE: "Venezuela",
};

/* ---------- Cidades fictícias ---------- */

const BR_CITY_PREFIX = [
  "Vila", "Porto", "São", "Santa", "Nova", "Campo", "Bela", "Monte", "Rio", "Serra",
  "Lagoa", "Barra", "Ponte", "Alto", "Boa", "Morro", "Vale", "Pouso", "Cachoeira", "Ribeirão",
];
const BR_CITY_SUFFIX = [
  "Esperança", "Alegre", "Verde", "do Sul", "Dourada", "Formosa", "Bonita", "Grande", "Azul",
  "da Serra", "do Norte", "Clara", "das Flores", "do Oeste", "Nova", "dos Ventos", "Bela",
  "do Leste", "das Pedras", "do Campo", "Serena", "Funda", "Velha", "Rica",
];
const BR_SAINTS = [
  "Benedito", "Jerônimo", "Inácio", "Joaquim", "Bernardo", "Tomé", "Gonçalo", "Silvestre",
  "Leopoldo", "Lourenço", "Cristóvão", "Matias", "Brás",
];
const BR_SAINT_F = ["Rita", "Luzia", "Helena", "Teresa", "Bárbara", "Cecília", "Inês", "Clara", "Mônica"];
const TUPI_START = ["Ita", "Ibi", "Ara", "Jaca", "Pira", "Guara", "Tau", "Coti", "Mira", "Paca", "Ipo", "Itu", "Jabo", "Caru", "Mogu", "Taqua", "Bira", "Anhum", "Juru", "Ubá"];
const TUPI_END = ["quara", "tinga", "rema", "una", "poranga", "guaçu", "mirim", "peba", "juba", "tiba", "tuba", "nema", "rana", "cema", "quera", "piranga", "petinga", "boca"];

function pick<T>(next: () => number, list: readonly T[]): T {
  return list[Math.floor(next() * list.length)];
}

/** Gera um nome de cidade brasileira plausível e fictício. */
export function brazilianCityName(next: () => number): string {
  const r = next();
  if (r < 0.35) return `${pick(next, TUPI_START)}${pick(next, TUPI_END)}`;
  if (r < 0.55) {
    return next() < 0.6 ? `São ${pick(next, BR_SAINTS)}` : `Santa ${pick(next, BR_SAINT_F)}`;
  }
  const prefix = pick(next, BR_CITY_PREFIX.filter((p) => p !== "São" && p !== "Santa"));
  let suffix = pick(next, BR_CITY_SUFFIX);
  if (suffix === prefix) suffix = "Alegre";
  return `${prefix} ${suffix}`;
}

const ES_CITY_PREFIX = ["San", "Villa", "Puerto", "Santa", "Nueva", "Río", "Monte", "Valle", "Cerro", "Laguna"];
const ES_CITY_SUFFIX = [
  "Esperanza", "del Mar", "Alegre", "Verde", "Paraíso", "Rosales", "del Sur", "Hermosa", "Clara",
  "de la Sierra", "del Norte", "Dorada", "Serena", "de los Andes", "del Valle", "Nevado",
];
const ES_SAINTS = ["Martín", "Lorenzo", "Ignacio", "Rafael", "Telmo", "Javier", "Cristóbal", "Fermín", "Ramón"];

export function spanishCityName(next: () => number): string {
  if (next() < 0.35) return `San ${pick(next, ES_SAINTS)}`;
  const prefix = pick(next, ES_CITY_PREFIX.filter((p) => p !== "San"));
  return `${prefix} ${pick(next, ES_CITY_SUFFIX)}`;
}
