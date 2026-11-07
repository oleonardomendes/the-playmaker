/**
 * Listas para o gerador de nomes de jogadores e clubes.
 */

export const BR_FIRST = [
  "Gabriel", "Lucas", "Matheus", "Pedro", "Rafael", "Gustavo", "Felipe", "Bruno", "Thiago",
  "Diego", "Rodrigo", "Vinícius", "João", "Caio", "Igor", "Leandro", "Marcos", "André",
  "Danilo", "Everton", "Wesley", "Kaique", "Renan", "Luan", "Yuri", "Alisson", "Wellington",
  "Douglas", "Jefferson", "Ramon", "Natan", "Erick", "Kauã", "Arthur", "Samuel", "Davi",
  "Paulo", "Carlos", "Antônio", "Francisco", "José", "Eduardo", "Luiz", "Fernando", "Roberto",
  "Ronaldo", "Fábio", "Márcio", "Anderson", "Robson", "Willian", "Jonathan", "Alex", "Hugo",
  "Vitor", "Henrique", "Murilo", "Otávio", "Raul", "Ruan", "Ícaro", "Jean", "Patrick",
  "Maycon", "Cleiton", "Emerson", "Adriano", "Juliano", "Rogério", "Sérgio", "Daniel",
  "Guilherme", "Leonardo", "Marcelo", "Ricardo", "Tiago", "Wagner", "Wanderson", "Gilberto",
  "Matias", "Nicolas", "Enzo", "Lorenzo", "Bernardo", "Heitor", "Miguel", "Benício", "Breno",
];

export const BR_MIDDLE = ["Henrique", "Pedro", "Paulo", "Vitor", "Gabriel", "Augusto", "Eduardo", "Lucas", "Carlos", "Felipe"];

export const BR_SURNAME = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Ferreira", "Costa", "Rodrigues",
  "Almeida", "Nascimento", "Carvalho", "Araújo", "Ribeiro", "Gomes", "Martins", "Barbosa",
  "Rocha", "Moura", "Teixeira", "Cardoso", "Freitas", "Mendes", "Batista", "Vieira",
  "Monteiro", "Correia", "Dias", "Nunes", "Moreira", "Pinto", "Cavalcanti", "Azevedo",
  "Fonseca", "Lopes", "Machado", "Ramos", "Campos", "Andrade", "Castro", "Sales", "Brandão",
  "Medeiros", "Siqueira", "Bezerra", "Queiroz", "Farias", "Peixoto", "Tavares", "Xavier",
];

/** Diminutivos e apelidos derivados do nome, no estilo do futebol brasileiro. */
export const BR_DIMINUTIVE: Record<string, string> = {
  Paulo: "Paulinho", João: "Joãozinho", Ronaldo: "Ronaldinho", Marcos: "Marquinhos",
  Carlos: "Carlinhos", Antônio: "Toninho", Francisco: "Chico", José: "Zé", Eduardo: "Dudu",
  Luiz: "Luizinho", Pedro: "Pedrinho", Fernando: "Fernandinho", Diego: "Dieguinho",
  Roberto: "Betinho", Rodrigo: "Digão", Guilherme: "Gui", Wellington: "Tom", Ricardo: "Cacá",
  Gabriel: "Biel", Vinícius: "Vini", Matheus: "Matheuzinho", Felipe: "Felipinho",
  Daniel: "Dani", Leonardo: "Léo", Alexandre: "Xande", Gustavo: "Guga", Rafael: "Rafinha",
  Henrique: "Rick", Juliano: "Juju", Márcio: "Marcinho", Robson: "Robinho", Adriano: "Didi",
};

/** Apelidos que viram o nome do jogador. */
export const BR_NICKNAME = [
  "Juninho", "Neguinho", "Pitbull", "Baiano", "Fumaça", "Gordinho", "Tchê", "Pelezinho",
  "Bolinha", "Foguete", "Tanque", "Bigode", "Careca", "Cabeção", "Magrão", "Gaúcho",
  "Alemão", "Índio", "Paraíba", "Cuiabano", "Mineirinho", "Sabiá", "Canário", "Pardal",
  "Grafite", "Jacaré", "Tatu", "Coelho", "Cebola", "Pimenta", "Tico", "Neto", "Nenê",
  "Didi", "Dodô", "Lelê", "Kiko", "Tuta", "Bebeto", "Cafu", "Fofão", "Formiga", "Mosquito",
];

export const ES_FIRST = [
  "Juan", "Santiago", "Matías", "Nicolás", "Facundo", "Lautaro", "Agustín", "Joaquín",
  "Franco", "Gonzalo", "Tomás", "Emiliano", "Rodrigo", "Diego", "Sebastián", "Martín",
  "Federico", "Ignacio", "Maximiliano", "Leandro", "Cristian", "Brian", "Kevin", "Jhon",
  "Andrés", "Felipe", "Jorge", "Luis", "Carlos", "José", "Miguel", "Esteban", "Alexis",
  "Bryan", "Yeferson", "Wilmar", "Darwin", "Edinson", "Fernando", "Gastón",
];

export const ES_SURNAME = [
  "González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez",
  "García", "Sánchez", "Romero", "Sosa", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores",
  "Acosta", "Benítez", "Medina", "Herrera", "Suárez", "Aguirre", "Giménez", "Molina",
  "Castro", "Ortiz", "Rojas", "Morales", "Vargas", "Cabrera", "Ríos", "Mendoza", "Paredes",
];

/* ---------- Clubes ---------- */

/**
 * Palavras de identidade de clube. Sempre combinadas com a cidade fictícia,
 * para o nome final não coincidir com o de um clube real.
 */
export const BR_CLUB_IDENTITY = [
  "Aurora", "Estrela", "Ferroviário", "Operário", "Comercial", "Industrial", "Olímpico",
  "Atlântico", "Primavera", "Tamoio", "Bandeirante", "Colonial", "Imperial", "Democrata",
  "União", "Princesa", "Real", "Grêmio", "Usina", "Alvorada", "Horizonte", "Sertanejo",
  "Litoral", "Planalto", "Fronteira", "Cometa", "Trabalhista", "Recreativo", "Mocidade",
];

export const BR_CLUB_PATTERNS: ReadonlyArray<(city: string, identity: string) => string> = [
  (city) => `${city} Esporte Clube`,
  (city) => `Esporte Clube ${city}`,
  (city) => `Associação Atlética ${city}`,
  (city) => `${city} Futebol Clube`,
  (city) => `Sociedade Esportiva ${city}`,
  (city) => `Clube Atlético ${city}`,
  (city, identity) => `${identity} ${city}`,
  (city, identity) => `${identity} Futebol Clube ${city}`,
  (city, identity) => `Sport Club ${identity} de ${city}`,
  (city, identity) => `Associação ${identity} ${city}`,
];

export const ES_CLUB_IDENTITY = [
  "Unión", "Progreso", "Defensores", "Juventud", "Atlas", "Cóndor", "Deportivo",
  "Sportivo", "Universitario", "Aurora", "Fénix", "Centenario", "Ferrocarril", "Obreros",
];

export const ES_CLUB_PATTERNS: ReadonlyArray<(city: string, identity: string) => string> = [
  (city) => `Club Atlético ${city}`,
  (city) => `Deportivo ${city}`,
  (city) => `Racing de ${city}`,
  (city) => `Sportivo ${city}`,
  (city, identity) => `Club ${identity} de ${city}`,
  (city, identity) => `${identity} ${city}`,
];

/** Combinações de cores [principal, secundária, terceira?] e o apelido que geram. */
export const COLOR_SETS: ReadonlyArray<{ colors: string[]; nickname: string }> = [
  { colors: ["#111111", "#f5f5f0"], nickname: "Alvinegro" },
  { colors: ["#0f7a3c", "#f5f5f0"], nickname: "Alviverde" },
  { colors: ["#c8102e", "#111111"], nickname: "Rubro-Negro" },
  { colors: ["#c8102e", "#f5f5f0"], nickname: "Alvirrubro" },
  { colors: ["#1d4fa3", "#f5f5f0"], nickname: "Alviceleste" },
  { colors: ["#6fa8dc", "#f5f5f0"], nickname: "Celeste" },
  { colors: ["#0f7a3c", "#f2c230"], nickname: "Canarinho" },
  { colors: ["#f2c230", "#111111"], nickname: "Aurinegro" },
  { colors: ["#7b1e3a", "#f5f5f0"], nickname: "Grená" },
  { colors: ["#e66a1f", "#111111"], nickname: "Leão Laranja" },
  { colors: ["#1d4fa3", "#c8102e", "#f5f5f0"], nickname: "Tricolor" },
  { colors: ["#0f7a3c", "#c8102e", "#f5f5f0"], nickname: "Tricolor" },
  { colors: ["#c8102e", "#111111", "#f5f5f0"], nickname: "Tricolor" },
  { colors: ["#1d4fa3", "#111111", "#f5f5f0"], nickname: "Tricolor" },
  { colors: ["#0b2a6b", "#f2c230"], nickname: "Azulão" },
  { colors: ["#0f7a3c", "#111111"], nickname: "Verdinegro" },
  { colors: ["#5b2a86", "#f5f5f0"], nickname: "Roxinho" },
  { colors: ["#c8102e", "#1d4fa3"], nickname: "Azulgrana" },
];

/** Sobrenomes usados para batizar estádios em homenagem. */
export const STADIUM_HONOREES_FIRST = ["Antônio", "José", "João", "Manoel", "Francisco", "Raimundo", "Joaquim", "Sebastião", "Benedito", "Olavo", "Romeu", "Arlindo"];
