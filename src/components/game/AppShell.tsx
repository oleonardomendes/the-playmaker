"use client";

import type { ComponentType, SVGProps } from "react";
import { GameProvider, useGame } from "./GameProvider";
import { NavigationProvider, useNavigation, type Route } from "./navigation";
import { IconDatabase, IconHome, IconPlayers, IconRotate, IconShield, IconTrophy } from "@/components/ui/icons";
import { HomeView } from "@/components/views/HomeView";
import { ClubsView } from "@/components/views/ClubsView";
import { CompetitionsView } from "@/components/views/CompetitionsView";
import { PlayersView } from "@/components/views/PlayersView";
import { DatabaseView } from "@/components/views/DatabaseView";
import { PlayerSheet } from "@/components/views/PlayerSheet";

type NavItem = {
  view: Route["view"];
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  to: Route;
};

const NAV: NavItem[] = [
  { view: "inicio", label: "Início", icon: IconHome, to: { view: "inicio" } },
  { view: "clubes", label: "Clubes", icon: IconShield, to: { view: "clubes" } },
  { view: "competicoes", label: "Torneios", icon: IconTrophy, to: { view: "competicoes", tab: "A" } },
  { view: "jogadores", label: "Jogadores", icon: IconPlayers, to: { view: "jogadores" } },
  { view: "banco", label: "Banco", icon: IconDatabase, to: { view: "banco" } },
];

function Rail() {
  const { route, navigate } = useNavigation();
  const { status } = useGame();
  const hasWorld = status === "ready";
  return (
    <nav
      aria-label="Menu principal"
      className="flex w-[72px] shrink-0 flex-col items-stretch gap-1 border-r border-line bg-pitch py-2"
      style={{ paddingLeft: "env(safe-area-inset-left)", boxSizing: "content-box" }}
    >
      {NAV.map((item) => {
        const active = route.view === item.view;
        const disabled = !hasWorld && item.view !== "inicio";
        const Icon = item.icon;
        return (
          <button
            key={item.view}
            onClick={() => navigate(item.to)}
            disabled={disabled}
            aria-current={active ? "page" : undefined}
            className={`mx-1.5 flex flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] font-medium transition-colors disabled:opacity-30 ${
              active ? "bg-pitch-3 text-chalk" : "text-chalk-dim hover:text-chalk"
            }`}
          >
            <Icon className={`text-[22px] ${active ? "text-gold" : ""}`} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function CurrentView() {
  const { route } = useNavigation();
  const { status } = useGame();
  if (status !== "ready" || route.view === "inicio") return <HomeView />;
  switch (route.view) {
    case "clubes":
      return <ClubsView clubId={route.clubId} />;
    case "competicoes":
      return <CompetitionsView tab={route.tab} uf={route.uf} country={route.country} />;
    case "jogadores":
      return <PlayersView />;
    case "banco":
      return <DatabaseView />;
  }
}

function RotateHint() {
  return (
    <div className="rotate-hint fixed inset-0 z-50 flex-col items-center justify-center gap-4 bg-pitch p-8 text-center">
      <IconRotate className="tilt text-6xl text-gold" />
      <p className="font-display text-3xl font-bold">Gire o celular</p>
      <p className="max-w-xs text-chalk-dim">The Playmaker é jogado com o celular deitado, para caber tabela, elenco e detalhes na mesma tela.</p>
    </div>
  );
}

export function AppShell() {
  return (
    <GameProvider>
      <NavigationProvider>
        <RotateHint />
        <div className="app-frame flex h-dvh overflow-hidden">
          <Rail />
          <main
            className="relative flex min-w-0 flex-1 flex-col"
            style={{ paddingRight: "env(safe-area-inset-right)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <CurrentView />
          </main>
          <PlayerSheet />
        </div>
      </NavigationProvider>
    </GameProvider>
  );
}
