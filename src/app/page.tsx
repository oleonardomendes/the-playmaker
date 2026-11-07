import { GameShell } from "@/components/GameShell";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-chalk-dim">Football Manager</p>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">The Playmaker</h1>
      </header>
      <GameShell />
    </main>
  );
}
