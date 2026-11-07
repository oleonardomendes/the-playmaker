"use client";

import { useMemo } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { useNavigation, type CompetitionTab } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { Segmented, Strength, TierBadge } from "@/components/ui/bits";
import type { Country } from "@/engine/types";
import { formatCompact } from "@/lib/format";

const TABS: ReadonlyArray<{ value: CompetitionTab; label: string }> = [
  { value: "A", label: "Série A" },
  { value: "B", label: "Série B" },
  { value: "C", label: "Série C" },
  { value: "D", label: "Série D" },
  { value: "estaduais", label: "Estaduais" },
  { value: "exterior", label: "Exterior" },
];

const NOTES: Record<CompetitionTab, string> = {
  A: "20 clubes em pontos corridos, de abril a dezembro. Os 4 últimos caem.",
  B: "20 clubes em pontos corridos. Os 4 primeiros sobem e os 4 últimos caem.",
  C: "20 clubes em turno único; os 8 melhores vão a dois grupos de 4. Sobem 4.",
  D: "64 clubes em grupos regionais e mata-mata. Sobem 4.",
  estaduais: "disputado de janeiro a março, antes do Brasileirão. Clubes ordenados pela força do elenco.",
  exterior: "Clubes sul-americanos que cruzam com os brasileiros nas copas continentais.",
};

export function CompetitionsView({ tab, uf, country }: { tab: CompetitionTab; uf?: string; country?: string }) {
  const world = useWorld();
  const { strength } = useGame();
  const { navigate } = useNavigation();

  const states = useMemo(() => Object.values(world.states).sort((a, b) => b.clubIds.length - a.clubIds.length || a.name.localeCompare(b.name)), [world]);
  const countries = useMemo(() => Object.values(world.countries).filter((c) => c !== undefined), [world]);

  const activeUf = uf ?? states[0]?.uf;
  const activeCountry = (country ?? countries[0]?.code) as Country;

  const ids = useMemo(() => {
    if (tab === "estaduais") return world.states[activeUf]?.clubIds ?? [];
    if (tab === "exterior") return world.countries[activeCountry]?.clubIds ?? [];
    return world.divisions[tab];
  }, [tab, world, activeUf, activeCountry]);

  const ranked = useMemo(() => [...ids].sort((a, b) => strength[b] - strength[a]).map((id) => world.clubs[id]), [ids, strength, world]);

  const go = (next: Partial<{ tab: CompetitionTab; uf: string; country: string }>) =>
    navigate({ view: "competicoes", tab: next.tab ?? tab, uf: next.uf ?? uf, country: next.country ?? country }, { replace: true });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b border-line px-4 py-2.5">
        <Segmented label="Competições" value={tab} onChange={(t) => go({ tab: t })} options={TABS} />
        {tab === "estaduais" && (
          <div className="flex gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Estado">
            {states.map((s) => (
              <button
                key={s.uf}
                role="tab"
                aria-selected={s.uf === activeUf}
                title={s.name}
                onClick={() => go({ uf: s.uf })}
                className={`shrink-0 rounded-md px-2 py-1 font-display text-sm font-semibold ${
                  s.uf === activeUf ? "bg-pitch-3 text-gold" : "text-chalk-dim hover:text-chalk"
                }`}
              >
                {s.uf}
              </button>
            ))}
          </div>
        )}
        {tab === "exterior" && (
          <div className="flex gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="País">
            {countries.map((c) => (
              <button
                key={c.code}
                role="tab"
                aria-selected={c.code === activeCountry}
                onClick={() => go({ country: c.code })}
                className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-medium ${
                  c.code === activeCountry ? "bg-pitch-3 text-gold" : "text-chalk-dim hover:text-chalk"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="scroll-pane min-h-0 flex-1">
        <p className="px-4 pt-3 text-sm text-chalk-dim">
          {tab === "estaduais" && world.states[activeUf] ? `Estadual de ${world.states[activeUf].name}, ${NOTES.estaduais}` : NOTES[tab]}
        </p>
        <table className="mt-2 w-full table-fixed text-left">
          <thead className="sticky top-0 bg-pitch text-xs text-chalk-faint">
            <tr>
              <th className="w-10 py-1.5 pl-4 font-medium">#</th>
              <th className="font-medium">Clube</th>
              <th className="w-[22%] font-medium">Cidade</th>
              <th className="w-16 font-medium">Divisão</th>
              <th className="w-20 font-medium">Torcida</th>
              <th className="w-16 pr-4 text-right font-medium">Força</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((c, i) => (
              <tr key={c.id} onClick={() => navigate({ view: "clubes", clubId: c.id })} className="cursor-pointer border-t border-line hover:bg-pitch-2">
                <td className="py-1.5 pl-4 font-display text-chalk-faint tabular-nums">{i + 1}</td>
                <td className="pr-2">
                  <span className="flex items-center gap-2">
                    <Crest club={c} size={20} />
                    <span className="truncate font-medium">{c.name}</span>
                  </span>
                </td>
                <td className="truncate pr-2 text-chalk-dim">{c.city}</td>
                <td>
                  <TierBadge tier={c.tier} short />
                </td>
                <td className="tabular-nums text-chalk-dim">{formatCompact(c.fans)}</td>
                <td className="pr-4 text-right">
                  <Strength value={strength[c.id]} className="text-lg" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
