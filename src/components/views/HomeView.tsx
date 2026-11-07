"use client";

import { useMemo, useState } from "react";
import { useGame } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { TierBadge } from "@/components/ui/bits";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconChevronRight } from "@/components/ui/icons";
import { formatInt } from "@/lib/format";

function Brand() {
  return (
    <div>
      <h1 className="font-display text-[40px] font-bold leading-[0.88] tracking-tight">
        The
        <br />
        Playmaker
      </h1>
      <p className="mt-1.5 text-chalk-dim">Manager de futebol brasileiro</p>
    </div>
  );
}

function ErrorBanner() {
  const { error, clearError } = useGame();
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm">
      <span>{error}</span>
      <button onClick={clearError} className="text-chalk-dim hover:text-chalk">
        Fechar
      </button>
    </div>
  );
}

function EmptyHome() {
  const { createWorld, busy, status } = useGame();
  return (
    <div className="scroll-pane flex h-full items-center gap-10 px-8 py-5">
      <div className="flex w-[300px] shrink-0 flex-col gap-6">
        <Brand />
        <ErrorBanner />
      </div>
      <div className="max-w-md">
        <p className="font-display text-2xl font-bold">Comece criando o seu mundo do futebol</p>
        <p className="mt-2 text-chalk-dim">
          São 302 clubes brasileiros em 27 estados, das Séries A a D até quem só joga o estadual, mais 60 clubes da América do
          Sul e cerca de 9 mil jogadores. Cada mundo é único e fica salvo neste aparelho.
        </p>
        <button
          onClick={createWorld}
          disabled={busy || status === "loading"}
          className="mt-5 rounded-lg bg-gold px-6 py-3 font-display text-xl font-bold text-pitch disabled:opacity-50"
        >
          {busy ? "Criando o mundo…" : status === "loading" ? "Carregando…" : "Criar mundo"}
        </button>
      </div>
    </div>
  );
}

function WorldHome() {
  const { world, strength, createWorld, busy } = useGame();
  const { navigate } = useNavigation();
  const [confirm, setConfirm] = useState(false);

  const summary = useMemo(() => {
    if (!world) return null;
    const clubs = Object.values(world.clubs);
    const top = (ids: string[]) => [...ids].sort((a, b) => strength[b] - strength[a]).slice(0, 4);
    return {
      brazil: clubs.filter((c) => c.country === "BR").length,
      abroad: clubs.length - clubs.filter((c) => c.country === "BR").length,
      players: Object.keys(world.players).length,
      states: Object.keys(world.states).length,
      divisions: (["A", "B", "C", "D"] as const).map((d) => ({ tier: d, count: world.divisions[d].length, top: top(world.divisions[d]) })),
    };
  }, [world, strength]);

  if (!world || !summary) return null;

  return (
    <div className="flex h-full gap-8 px-8 py-5">
      <div className="scroll-pane flex w-[260px] shrink-0 flex-col gap-4">
        <Brand />
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-0.5 text-sm">
          <dt className="text-chalk-dim">Temporada</dt>
          <dd className="font-display text-lg font-bold">{world.season}</dd>
          <dt className="text-chalk-dim">Clubes no Brasil</dt>
          <dd className="font-display text-lg font-bold">{summary.brazil}</dd>
          <dt className="text-chalk-dim">No exterior</dt>
          <dd className="font-display text-lg font-bold">{summary.abroad}</dd>
          <dt className="text-chalk-dim">Jogadores</dt>
          <dd className="font-display text-lg font-bold">{formatInt(summary.players)}</dd>
        </dl>
        <ErrorBanner />
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => navigate({ view: "clubes" })}
            className="rounded-lg bg-gold px-5 py-2.5 font-display text-lg font-bold text-pitch"
          >
            Explorar clubes
          </button>
          <button onClick={() => setConfirm(true)} disabled={busy} className="py-1.5 text-sm text-chalk-dim hover:text-chalk disabled:opacity-50">
            Criar outro mundo
          </button>
        </div>
      </div>

      <section aria-label="Divisões nacionais" className="scroll-pane flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm text-chalk-dim">
          A carreira de técnico chega nas próximas fases. Por enquanto, explore o mundo. Ao lado de cada série, os quatro elencos
          mais fortes.
        </p>
        {summary.divisions.map((d) => (
          <button
            key={d.tier}
            onClick={() => navigate({ view: "competicoes", tab: d.tier })}
            className="group flex items-center gap-4 rounded-xl bg-pitch-2 px-4 py-3 text-left transition-colors hover:bg-pitch-3"
          >
            <TierBadge tier={d.tier} />
            <span className="w-20 shrink-0 text-sm text-chalk-dim">{d.count} clubes</span>
            <span className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-hidden">
              {d.top.map((id) => (
                <span key={id} title={world.clubs[id].name} className="flex shrink-0 items-center gap-1">
                  <Crest club={world.clubs[id]} size={20} />
                  <span className="hidden font-display text-[15px] font-semibold xl:inline">{world.clubs[id].shortName}</span>
                </span>
              ))}
            </span>
            <IconChevronRight className="text-chalk-faint group-hover:text-chalk" />
          </button>
        ))}
        <button
          onClick={() => navigate({ view: "competicoes", tab: "estaduais" })}
          className="group flex items-center gap-4 rounded-xl bg-pitch-2 px-4 py-3 text-left transition-colors hover:bg-pitch-3"
        >
          <TierBadge tier="E" />
          <span className="flex-1 text-sm text-chalk-dim">{summary.states} estaduais, de janeiro a março</span>
          <IconChevronRight className="text-chalk-faint group-hover:text-chalk" />
        </button>
      </section>

      <ConfirmDialog
        open={confirm}
        title="Criar outro mundo?"
        message="O mundo atual e as edições de pack serão substituídos por um mundo novo. Isso não pode ser desfeito."
        confirmLabel="Criar outro mundo"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          void createWorld();
        }}
      />
    </div>
  );
}

export function HomeView() {
  const { status } = useGame();
  return status === "ready" ? <WorldHome /> : <EmptyHome />;
}
