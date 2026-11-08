"use client";

import type { ComponentType, SVGProps } from "react";
import { GameProvider, useGame } from "./GameProvider";
import { NavigationProvider, useNavigation, type Route } from "./navigation";
import { IconCalendar, IconHome, IconPitch, IconPlayers, IconRotate, IconShield, IconTrophy } from "@/components/ui/icons";
import { HomeView } from "@/components/views/HomeView";
import { ClubsView } from "@/components/views/ClubsView";
import { TournamentsView } from "@/components/views/TournamentsView";
import { PlayersView } from "@/components/views/PlayersView";
import { DatabaseView } from "@/components/views/DatabaseView";
import { PlayerSheet } from "@/components/views/PlayerSheet";
import { TeamView } from "@/components/views/TeamView";
import { AgendaView } from "@/components/views/AgendaView";
import { MatchCenter } from "@/components/views/MatchCenter";
import { TopBar } from "./TopBar";

type NavItem = {
  view: Route["view"];
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  to: Route;
  /** Só faz sentido depois de escolher um clube. */
  needsClub?: boolean;
};

const NAV: NavItem[] = [
  { view: "inicio", label: "Início", icon: IconHome, to: { view: "inicio" } },
  { view: "time", label: "Time", icon: IconPitch, to: { view: "time" }, needsClub: true },
  { view: "agenda", label: "Agenda", icon: IconCalendar, to: { view: "agenda" }, needsClub: true },
  { view: "torneios", label: "Torneios", icon: IconTrophy, to: { view: "torneios" } },
  { view: "clubes", label: "Clubes", icon: IconShield, to: { view: "clubes" } },
  { view: "jogadores", label: "Jogadores", icon: IconPlayers, to: { view: "jogadores" } },
];

function Rail() {
  const { route, navigate } = useNavigation();
  const { status, world } = useGame();
  const hasWorld = status === "ready";
  const hasClub = Boolean(world?.user);
  return (
    <nav
      aria-label="Menu principal"
      className="flex w-[68px] shrink-0 flex-col items-stretch gap-1 border-r border-line bg-pitch/60 py-2 backdrop-blur"
      style={{ paddingLeft: "env(safe-area-inset-left)", boxSizing: "content-box" }}
    >
      {NAV.map((item) => {
        const active = route.view === item.view || (item.view === "inicio" && route.view === "partida");
        const disabled = (!hasWorld && item.view !== "inicio") || (item.needsClub && !hasClub);
        const Icon = item.icon;
        return (
          <button
            key={item.view}
            onClick={() => navigate(item.to)}
            disabled={disabled}
            aria-current={active ? "page" : undefined}
            className={`relative mx-1.5 flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10.5px] font-semibold transition-colors disabled:opacity-30 ${
              active ? "bg-gold/10 text-gold" : "text-chalk-faint hover:text-chalk"
            }`}
          >
            {active && <span className="absolute -left-1.5 top-2 bottom-2 w-[3px] rounded-r bg-gold shadow-[0_0_12px_var(--gold)]" />}
            <Icon className="text-[22px]" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function CurrentView() {
  const { route } = useNavigation();
  const { status, world } = useGame();
  if (status !== "ready" || !world || route.view === "inicio") return <HomeView />;
  const hasClub = Boolean(world.user);
  switch (route.view) {
    case "time":
      return hasClub ? <TeamView /> : <HomeView />;
    case "agenda":
      return hasClub ? <AgendaView /> : <HomeView />;
    case "partida":
      return hasClub ? <MatchCenter key={`${route.fixtureId}-${route.mode}`} fixtureId={route.fixtureId} mode={route.mode} /> : <HomeView />;
    case "torneios":
      return <TournamentsView compId={route.compId} tab={route.tab} stage={route.stage} />;
    case "clubes":
      return <ClubsView clubId={route.clubId} />;
    case "jogadores":
      return <PlayersView />;
    case "banco":
      return <DatabaseView />;
  }
}

/** Durante a partida (pré, ao vivo) o menu e a barra somem, para nada distrair (nem sair sem querer). */
function useFocusMode() {
  const { route } = useNavigation();
  return route.view === "partida" && route.mode === "live";
}

function MaybeRail() {
  return useFocusMode() ? null : <Rail />;
}

/** No pré-jogo a própria tela tem os botões de jogar; a barra só repetiria a ação. */
function MaybeTopBar() {
  const { status } = useGame();
  const { route } = useNavigation();
  const inMatch = route.view === "partida" && route.mode !== "sumula";
  return inMatch || status !== "ready" ? null : <TopBar />;
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
          <MaybeRail />
          <main
            className="relative flex min-w-0 flex-1 flex-col"
            style={{ paddingRight: "env(safe-area-inset-right)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <MaybeTopBar />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <CurrentView />
            </div>
          </main>
          <PlayerSheet />
        </div>
      </NavigationProvider>
    </GameProvider>
  );
}
