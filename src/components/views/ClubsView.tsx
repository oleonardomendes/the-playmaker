"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { EmptyState, Strength, TierBadge } from "@/components/ui/bits";
import { IconSearch } from "@/components/ui/icons";
import type { Club, Tier } from "@/engine/types";
import { ClubDetail } from "./ClubDetail";

type TierFilter = "todos" | Tier;

const TIER_OPTIONS: ReadonlyArray<{ value: TierFilter; label: string }> = [
  { value: "todos", label: "Todas" },
  { value: "A", label: "Série A" },
  { value: "B", label: "Série B" },
  { value: "C", label: "Série C" },
  { value: "D", label: "Série D" },
  { value: "E", label: "Só estadual" },
  { value: "INT", label: "Exterior" },
];

const TIER_ORDER: Record<Tier, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, INT: 5 };

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ClubsView({ clubId }: { clubId?: string }) {
  const world = useWorld();
  const { strength } = useGame();
  const { navigate } = useNavigation();
  const [tier, setTier] = useState<TierFilter>("todos");
  const [uf, setUf] = useState("todos");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const states = useMemo(() => Object.values(world.states).sort((a, b) => a.name.localeCompare(b.name)), [world]);

  const clubs = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return Object.values(world.clubs)
      .filter((c) => tier === "todos" || c.tier === tier)
      .filter((c) => uf === "todos" || c.state === uf)
      .filter((c) => !q || normalize(`${c.name} ${c.shortName} ${c.city}`).includes(q))
      .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || strength[b.id] - strength[a.id]);
  }, [world, tier, uf, deferredQuery, strength]);

  const selected = clubId ? world.clubs[clubId] : undefined;

  const select = (club: Club) => navigate({ view: "clubes", clubId: club.id }, { replace: Boolean(clubId) });

  return (
    <div className="flex h-full min-h-0">
      <section aria-label="Lista de clubes" className="flex w-[clamp(230px,34vw,300px)] shrink-0 flex-col border-r border-line">
        <div className="flex flex-col gap-2 border-b border-line p-2.5">
          <label className="flex items-center gap-2 rounded-lg bg-pitch-2 px-2.5">
            <IconSearch className="text-chalk-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar clube ou cidade"
              className="h-9 min-w-0 flex-1 bg-transparent outline-none placeholder:text-chalk-faint"
            />
          </label>
          <div className="flex gap-2">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as TierFilter)}
              aria-label="Divisão"
              className="h-8 min-w-0 flex-1 rounded-lg bg-pitch-2 px-2 text-sm"
            >
              {TIER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              aria-label="Estado"
              disabled={tier === "INT"}
              className="h-8 w-[96px] rounded-lg bg-pitch-2 px-2 text-sm disabled:opacity-40"
            >
              <option value="todos">Todos</option>
              {states.map((s) => (
                <option key={s.uf} value={s.uf}>
                  {s.name} ({s.uf})
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="px-3 pt-2 text-xs text-chalk-faint">{clubs.length} clubes</p>
        <ul className="scroll-pane min-h-0 flex-1 p-1.5">
          {clubs.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => select(c)}
                aria-current={c.id === clubId ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  c.id === clubId ? "bg-pitch-3" : "hover:bg-pitch-2"
                }`}
              >
                <Crest club={c} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-tight">{c.name}</span>
                  <span className="block truncate text-xs text-chalk-dim">
                    {c.city}
                    {c.state ? `, ${c.state}` : ""}
                  </span>
                </span>
                <TierBadge tier={c.tier} short />
                <Strength value={strength[c.id]} className="w-7 text-right text-lg" />
              </button>
            </li>
          ))}
          {clubs.length === 0 && <li className="p-4 text-center text-sm text-chalk-dim">Nenhum clube com esses filtros.</li>}
        </ul>
      </section>

      <section aria-label="Detalhes do clube" className="@container min-w-0 flex-1">
        {selected ? (
          <ClubDetail key={selected.id} club={selected} />
        ) : (
          <EmptyState title="Escolha um clube">Veja elenco, estádio, torcida e rivais. Os números ao lado de cada clube mostram a força do time titular.</EmptyState>
        )}
      </section>
    </div>
  );
}
