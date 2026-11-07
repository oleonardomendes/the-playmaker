# The Playmaker: Football Manager

Manager de futebol brasileiro para celular: carreira de técnico, clubes que existem sem você, mercado de transferências de verdade e personagens com voz própria via IA generativa.

O design completo do jogo está no documento de design (link com o Léo).

## Stack

- **Next.js + TypeScript**, publicado no Vercel como PWA (instalável na tela inicial do Android e do iPhone).
- **Motor do jogo em TypeScript puro** (`src/engine/`), rodando num **Web Worker** para a interface não travar.
- **Saves no aparelho** (IndexedDB) com versão de esquema e migrações; backup no **Supabase** na sequência.
- **IA generativa** via rota `/api/ia` no servidor: o motor decide, o LLM só dá voz.

## Estrutura

```
src/
  app/               telas, manifest do PWA e rota /api/ia
  components/
    game/            estado do jogo (GameProvider), navegação e o layout do app
    views/           telas: início, clubes, torneios, jogadores, banco, ficha do jogador
    ui/              peças visuais (escudo gerado, selos de divisão, ícones)
  engine/            motor do jogo (sem DOM; testável em Node)
    rng.ts           gerador aleatório determinístico — toda aleatoriedade passa por ele
    types.ts         modelo de dados
    world/           geração do mundo (geografia, nomes, clubes, jogadores, rivalidades)
    match/           motor de partida (engine.ts) e táticas/escalação (tactics.ts)
    competitions/    montagem das competições, agenda de datas, tabelas e mata-mata
    season/          ciclo da temporada: avançar, jogar o dia, virar o ano
    calendar/        datas do jogo
    sim/             modelo-base de gols (força + mando de campo)
    pack.ts          packs: exportar/importar edições do banco (nomes reais ficam por conta da comunidade)
    engine.worker.ts Web Worker que expõe o motor para a interface
    protocol.ts      contrato de mensagens interface <-> motor
  lib/
    engine-client.ts chamadas tipadas ao Worker
    save/            saves locais e migrações de esquema
    supabase/        cliente Supabase (opcional)
```

## Rodando localmente

```bash
cp .env.example .env.local   # opcional na fase 0
npm install
npm run dev                  # http://localhost:3000
npm test                     # testes do motor
npm run typecheck
npm run lint
```

## Fases do MVP

| Fase | Entrega |
| --- | --- |
| **0. Setup** ✅ | PWA, motor em Web Worker, save local, rota de IA |
| **1. Mundo** ✅ | 302 clubes BR + 60 sul-americanos, ~9 mil jogadores, rivalidades, packs, interface paisagem |
| **2. Partida, táticas e calendário** ✅ | motor minuto a minuto, táticas, partida ao vivo, Séries A–D, 27 estaduais, Copa Nacional, 2 continentais, copas do 2º semestre, virada de temporada |
| 3. Elenco, treino e trajetórias | perfis de carreira, lesões, base, olheiros |
| 4. Finanças e política | dívida, SAF, votações, eleições |
| 5. Mercado de jogadores | propostas, contratos, empréstimos |
| 6. Carreira e comissão técnica | origens, reputação, comissão pessoal |
| 7. IA generativa | presidente, jogador, empresário, imprensa |
| 8. Jornada e interface | tutorial, central de mensagens, conquistas |
| 9. Balanceamento | 10+ temporadas simuladas, testes com amigos |

## Interface

- **Paisagem:** o jogo é horizontal. No Android instalado a orientação fica travada pelo manifest; no iPhone (que não permite travar) aparece o aviso "Gire o celular".
- Layout pensado para telas baixas (~375–430 px de altura): menu lateral, listas à esquerda e detalhes à direita.
- O botão/gesto "voltar" do celular volta para a tela anterior do jogo.

## Regras do motor

- **Determinismo:** nada de `Math.random()` dentro de `src/engine/`; use `Rng`. O estado do gerador vai no save.
- **O motor decide, a IA narra:** o LLM nunca cria jogadores, valores ou eventos.
- **Mudou o formato do save?** Aumente `SCHEMA_VERSION` e escreva a migração em `src/lib/save/migrations.ts`.
- **Realismo calibrado por testes:** gols, empates, mando de campo, cartões e finalizações são verificados em `match.test.ts`; a temporada inteira (sem clube jogando com menos de 3 dias de intervalo) em `season.test.ts`.
- **Partida ao vivo:** a sua partida roda na tela (mesmo motor, mesma semente) e só vai para o save quando termina; as demais rodam no Worker.
