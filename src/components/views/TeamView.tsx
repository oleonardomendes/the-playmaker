"use client";

import { useWorld } from "@/components/game/GameProvider";
import { upcomingUserFixtures } from "@/engine/season/season";
import { TeamEditor } from "./TeamEditor";

export function TeamView() {
  const world = useWorld();
  const next = upcomingUserFixtures(world, 1)[0];
  return <TeamEditor compId={next?.comp} />;
}
