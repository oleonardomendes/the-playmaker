/**
 * Listas iniciais para o gerador de nomes. A fase 1 amplia com nomes por
 * região, apelidos compostos ("Juninho + cidade") e mais variação.
 */

export const FIRST_NAMES = [
  "Gabriel", "Lucas", "Matheus", "Pedro", "Rafael", "Gustavo", "Felipe",
  "Bruno", "Thiago", "Diego", "Rodrigo", "Vinícius", "João", "Caio", "Igor",
  "Leandro", "Marcos", "André", "Danilo", "Everton", "Wesley", "Kaique",
  "Renan", "Luan", "Yuri", "Alisson", "Wellington", "Douglas", "Jefferson",
  "Ramon", "Natan", "Erick", "Kauã", "Arthur", "Samuel", "Davi",
] as const;

export const SURNAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Ferreira",
  "Costa", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Araújo",
  "Ribeiro", "Gomes", "Martins", "Barbosa", "Rocha", "Moura", "Teixeira",
  "Cardoso", "Freitas", "Mendes", "Batista", "Vieira", "Monteiro",
] as const;

/** Apelidos no estilo do futebol brasileiro; usados no lugar do nome completo. */
export const NICKNAMES = [
  "Juninho", "Neguinho", "Pitbull", "Baiano", "Paulinho", "Toninho",
  "Cebolinha", "Marquinhos", "Zé Love", "Carlinhos", "Dudu", "Fumaça",
  "Gordinho", "Tchê", "Biro", "Pelezinho", "Chiquinho", "Bolinha",
] as const;

/** Cidades usadas para clubes fictícios: [cidade, gentílico, UF]. */
export const CITIES: ReadonlyArray<readonly [string, string, string]> = [
  ["Sorocaba", "Sorocabano", "SP"],
  ["Campinas", "Campineiro", "SP"],
  ["Ribeirão Preto", "Ribeirão-pretano", "SP"],
  ["Santos", "Praiano", "SP"],
  ["Niterói", "Niteroiense", "RJ"],
  ["Petrópolis", "Petropolitano", "RJ"],
  ["Juiz de Fora", "Juiz-forano", "MG"],
  ["Uberlândia", "Uberlandense", "MG"],
  ["Caxias do Sul", "Caxiense", "RS"],
  ["Pelotas", "Pelotense", "RS"],
  ["Londrina", "Londrinense", "PR"],
  ["Joinville", "Joinvilense", "SC"],
  ["Feira de Santana", "Feirense", "BA"],
  ["Campina Grande", "Campinense", "PB"],
  ["Caruaru", "Caruaruense", "PE"],
  ["Juazeiro do Norte", "Juazeirense", "CE"],
  ["Anápolis", "Anapolino", "GO"],
  ["Santarém", "Santareno", "PA"],
  ["Mossoró", "Mossoroense", "RN"],
  ["Rondonópolis", "Rondonopolitano", "MT"],
];

type ClubPlace = { city: string; demonym: string };

export const CLUB_PATTERNS = [
  ({ city }: ClubPlace) => `Esporte Clube ${city}`,
  ({ city }: ClubPlace) => `${city} Futebol Clube`,
  ({ demonym }: ClubPlace) => `Atlético ${demonym}`,
  ({ demonym }: ClubPlace) => `Sociedade Esportiva ${demonym}`,
  ({ city }: ClubPlace) => `Associação Atlética ${city}`,
] as const;
