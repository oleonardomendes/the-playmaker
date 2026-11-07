import type { MatchEvent, World } from "@/engine/types";

/**
 * Narração em texto a partir dos lances do motor. Os textos variam, mas
 * são escolhidos de forma estável (o mesmo lance gera sempre a mesma frase).
 */

export interface CommentaryLine {
  minute: string;
  text: string;
  kind: "gol" | "chance" | "cartao" | "vermelho" | "lesao" | "troca" | "penalti" | "info";
  side?: 0 | 1;
}

function pick(list: string[], key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
}

const GOAL = [
  "GOOOL! {p} balança a rede para o {club}{assist}.",
  "É gol do {club}! {p} finaliza com categoria{assist}.",
  "Gol! {p} aparece na área e não perdoa{assist}.",
  "Lá dentro! {p} marca para o {club}{assist}.",
  "Golaço de {p}! A torcida do {club} vai à loucura{assist}.",
];
const SAVE = [
  "{p} bate firme e o goleiro faz grande defesa.",
  "Que defesa! O goleiro espalma a finalização de {p}.",
  "{p} cabeceia e o goleiro segura firme.",
  "Chute de {p}, o goleiro vai buscar no canto.",
];
const WIDE = [
  "{p} arrisca de fora da área e manda por cima.",
  "{p} tenta, mas a bola sai pela linha de fundo.",
  "{p} recebe livre e chuta para fora. Perdeu uma boa.",
  "Finalização de {p}, sem direção.",
];
const POST = ["NA TRAVE! {p} quase marca para o {club}.", "Uh! {p} acerta o travessão."];
const YELLOW = ["Cartão amarelo para {p}, do {club}.", "{p} chega atrasado e leva o amarelo.", "Amarelo para {p} por reclamação."];
const RED = ["Expulso! {p} recebe o vermelho e o {club} fica com um a menos.", "Vermelho para {p}! O {club} vai jogar com dez."];
const INJURY = ["{p} sente a lesão e não tem condições de seguir.", "Preocupação no {club}: {p} se machuca e sai de campo."];
const SUB = ["Substituição no {club}: sai {p}, entra {x}.", "Mexida no {club}: {x} no lugar de {p}."];

export function minuteLabel(minute: number): string {
  if (minute >= 200) return "Pên.";
  if (minute > 90) return `90+${minute - 90}'`;
  return `${minute}'`;
}

export function describeEvent(world: World, event: MatchEvent, clubs: [string, string]): CommentaryLine {
  const [minute, type, side, playerId, extra] = event;
  const name = (id?: string) => (id ? world.players[id]?.knownAs ?? "?" : "?");
  const club = world.clubs[clubs[side]]?.name ?? "";
  const key = `${minute}${type}${playerId}`;
  const values = { p: name(playerId), x: name(extra), club, assist: "" };
  const label = minuteLabel(minute);
  switch (type) {
    case "G":
      values.assist = extra ? `, depois de passe de ${name(extra)}` : "";
      return { minute: label, text: fill(pick(GOAL, key), values), kind: "gol", side };
    case "C":
      return {
        minute: label,
        text: fill(pick(extra === "defesa" ? SAVE : extra === "trave" ? POST : WIDE, key), values),
        kind: "chance",
        side,
      };
    case "Y":
      return { minute: label, text: fill(pick(YELLOW, key), values), kind: "cartao", side };
    case "R":
      return { minute: label, text: fill(pick(RED, key), values), kind: "vermelho", side };
    case "I":
      return { minute: label, text: fill(pick(INJURY, key), values), kind: "lesao", side };
    case "S":
      return { minute: label, text: fill(pick(SUB, key), values), kind: "troca", side };
    case "P":
      return {
        minute: label,
        text: extra === "1" ? `${values.p} cobra e converte para o ${club}.` : `${values.p} cobra… e perde! Defesa do goleiro.`,
        kind: "penalti",
        side,
      };
  }
}
