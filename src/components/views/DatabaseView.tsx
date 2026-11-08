"use client";

import { useRef, useState } from "react";
import { useGame } from "@/components/game/GameProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconDownload, IconUpload } from "@/components/ui/icons";
import type { PackReport } from "@/engine/pack";

const EXAMPLE = `{
  "formato": "the-playmaker-pack",
  "versao": 1,
  "nome": "Meu pack",
  "clubes": [
    { "id": "c1", "nome": "Novo nome", "sigla": "NNO",
      "cores": ["#000000", "#ffffff"], "estadio": "Arena Nova" }
  ],
  "jogadores": [
    { "id": "p1", "nome": "Apelido", "nomeCompleto": "Nome Completo" }
  ]
}`;

export function DatabaseView() {
  const { importPack, downloadDatabase, restoreWorld, busy, error, clearError } = useGame();
  const input = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<PackReport | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReport(null);
    clearError();
    const result = await importPack(file);
    if (result) setReport(result);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="scroll-pane flex h-full gap-8 px-8 py-6">
      <div className="flex w-[340px] shrink-0 flex-col gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Banco de dados</h1>
          <p className="mt-2 text-chalk-dim">
            Os clubes e jogadores do jogo são fictícios. Com um pack, você troca nomes, siglas, cores e estádios, e pode até deixar
            tudo com cara de futebol real.
          </p>
        </div>

        <button
          onClick={downloadDatabase}
          className="flex items-center justify-center gap-2 rounded-lg bg-pitch-3 px-4 py-2.5 font-display text-lg font-bold hover:bg-pitch-2"
        >
          <IconDownload className="text-xl" /> Exportar banco atual
        </button>
        <button
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex items-center justify-center gap-2 btn-primary px-4 py-2.5 text-lg"
        >
          <IconUpload className="text-xl" /> {busy ? "Aplicando pack…" : "Importar pack"}
        </button>
        <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

        {error && (
          <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm">
            {error}
          </p>
        )}
        {report && (
          <div role="status" className="rounded-lg bg-pitch-2 px-3 py-2 text-sm">
            <p className="font-medium">
              Pack aplicado: {report.clubs} {report.clubs === 1 ? "clube" : "clubes"} e {report.players}{" "}
              {report.players === 1 ? "jogador" : "jogadores"} atualizados.
            </p>
            {report.skipped.length > 0 && (
              <details className="mt-1 text-chalk-dim">
                <summary className="cursor-pointer">
                  {report.skipped.length} {report.skipped.length === 1 ? "item ignorado" : "itens ignorados"}
                </summary>
                <ul className="mt-1 list-disc pl-5">
                  {report.skipped.slice(0, 20).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <button onClick={() => setConfirm(true)} disabled={busy} className="mt-auto py-1.5 text-sm text-chalk-dim hover:text-chalk disabled:opacity-50">
          Desfazer todos os packs
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold">Como montar um pack</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-chalk-dim">
          <li>Exporte o banco atual: ele já vem com todos os clubes e jogadores e seus códigos (id).</li>
          <li>Edite os nomes que quiser e apague o que não for mudar.</li>
          <li>Importe o arquivo. Só os campos presentes no pack são alterados.</li>
        </ol>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-pitch-2 p-3 text-xs leading-relaxed text-chalk-dim">{EXAMPLE}</pre>
        <p className="mt-2 text-xs text-chalk-faint">
          Packs com nomes reais são feitos pela comunidade e ficam só no seu aparelho. Cores usam o formato #RRGGBB.
        </p>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Desfazer todos os packs?"
        message="Clubes e jogadores voltam aos nomes originais deste mundo."
        confirmLabel="Desfazer packs"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          setReport(null);
          void restoreWorld();
        }}
      />
    </div>
  );
}
