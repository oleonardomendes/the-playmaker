@AGENTS.md

# The Playmaker — instruções do projeto

- Leia o README para a arquitetura e as regras do motor.
- Textos do jogo e comentários em português do Brasil.
- `src/engine/` é TypeScript puro: sem DOM, sem React, sem `Math.random()` (use `Rng`).
- Antes de concluir uma mudança: `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
- Mudou o formato do save: aumente `SCHEMA_VERSION` e adicione a migração.
- Nomes reais de clubes, jogadores e competições ficam de fora (marcas e direitos de imagem); o banco é fictício e editável.
