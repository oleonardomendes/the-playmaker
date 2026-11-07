"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Navegação interna do app. Cada mudança de tela entra no histórico do
 * navegador, então o gesto/botão "voltar" do celular volta para a tela
 * anterior em vez de fechar o jogo.
 */

export type TournamentTab = "tabela" | "jogos" | "artilharia";

export type Route =
  | { view: "inicio" }
  | { view: "time" }
  | { view: "agenda" }
  | { view: "partida"; fixtureId: string; mode: "pre" | "live" | "sumula" }
  | { view: "torneios"; compId?: string; tab?: TournamentTab; stage?: number }
  | { view: "clubes"; clubId?: string }
  | { view: "jogadores" }
  | { view: "banco" };

interface NavigationValue {
  route: Route;
  navigate: (route: Route, options?: { replace?: boolean }) => void;
  /** Jogador aberto na ficha lateral, por cima de qualquer tela. */
  playerId: string | null;
  openPlayer: (id: string | null) => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function useNavigation(): NavigationValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation precisa estar dentro de NavigationProvider");
  return ctx;
}

interface HistoryState {
  playmaker: true;
  route: Route;
}

function isHistoryState(value: unknown): value is HistoryState {
  return typeof value === "object" && value !== null && (value as HistoryState).playmaker === true;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ view: "inicio" });
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const initial = isHistoryState(window.history.state) ? window.history.state.route : { view: "inicio" as const };
    window.history.replaceState({ playmaker: true, route: initial } satisfies HistoryState, "");
    // Restaura a tela salva no histórico (ex.: ao recarregar a página).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoute(initial);
    const onPop = (event: PopStateEvent) => {
      if (isHistoryState(event.state)) setRoute(event.state.route);
      setPlayerId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Route, options?: { replace?: boolean }) => {
    const state: HistoryState = { playmaker: true, route: next };
    if (options?.replace) window.history.replaceState(state, "");
    else window.history.pushState(state, "");
    setRoute(next);
    setPlayerId(null);
  }, []);

  const value = useMemo(
    () => ({ route, navigate, playerId, openPlayer: setPlayerId }),
    [route, navigate, playerId],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
