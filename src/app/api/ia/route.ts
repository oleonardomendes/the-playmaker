/**
 * Rota de IA generativa. O motor decide o que acontece; esta rota só
 * transforma o resultado em fala de personagem (presidente, jogador,
 * empresário, jornalista).
 *
 * Fase 0: valida o pedido e devolve o texto de fallback. A fase 7 liga o
 * provedor de LLM aqui, usando a chave guardada só no servidor (LLM_API_KEY),
 * nunca exposta no navegador.
 */

const PERSONAS = ["presidente", "jogador", "empresario", "jornalista", "imprensa"] as const;
type Persona = (typeof PERSONAS)[number];

interface DialogueRequest {
  persona: Persona;
  /** Fatos do jogo já decididos pelo motor. */
  context: string;
  /** Texto que o jogo usa se a IA estiver indisponível. */
  fallback: string;
}

const MAX_CONTEXT = 4000;
const MAX_FALLBACK = 1000;

function parse(body: unknown): DialogueRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { persona, context, fallback } = body as Record<string, unknown>;
  if (!PERSONAS.includes(persona as Persona)) return null;
  if (typeof context !== "string" || context.length === 0 || context.length > MAX_CONTEXT) return null;
  if (typeof fallback !== "string" || fallback.length === 0 || fallback.length > MAX_FALLBACK) return null;
  return { persona: persona as Persona, context, fallback };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const dialogue = parse(body);
  if (!dialogue) {
    return Response.json({ error: "Pedido inválido" }, { status: 400 });
  }

  // TODO (fase 7): chamar o provedor de LLM quando process.env.LLM_API_KEY existir.
  return Response.json({ text: dialogue.fallback, source: "fallback" as const });
}
