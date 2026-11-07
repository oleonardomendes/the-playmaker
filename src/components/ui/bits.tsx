import type { ReactNode } from "react";
import type { Tier } from "@/engine/types";
import { TIER_LABEL } from "@/lib/format";

/** Peças pequenas reaproveitadas em várias telas. */

const TIER_STYLE: Record<Tier, string> = {
  A: "bg-gold text-pitch",
  B: "bg-[#c9d3cc] text-pitch",
  C: "bg-[#c98f55] text-pitch",
  D: "bg-[#5f9e74] text-pitch",
  E: "bg-pitch-3 text-chalk-dim",
  INT: "bg-[#5b8fd6] text-pitch",
};

export function TierBadge({ tier, short }: { tier: Tier; short?: boolean }) {
  const label = short ? (tier === "E" ? "Est" : tier === "INT" ? "Ext" : tier) : TIER_LABEL[tier];
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded px-1.5 font-display text-[13px] font-semibold leading-none ${TIER_STYLE[tier]}`}
    >
      {label}
    </span>
  );
}

/** Força 1–100 com cor por faixa (dourado para craques). */
export function Strength({ value, className = "" }: { value: number; className?: string }) {
  const tone = value >= 80 ? "text-gold" : value >= 68 ? "text-chalk" : value >= 55 ? "text-chalk-dim" : "text-chalk-faint";
  return <span className={`font-display font-bold tabular-nums ${tone} ${className}`}>{Math.round(value)}</span>;
}

/** Barra fina 0–100, usada para prestígio. */
export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-pitch-3" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className="block h-full rounded-full bg-chalk-dim" style={{ width: `${value}%` }} />
    </span>
  );
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-pitch-2 px-3 py-2">
      <dt className="text-xs text-chalk-dim">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-bold leading-tight">{children}</dd>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-display text-2xl font-bold">{title}</p>
      {children && <div className="max-w-sm text-sm text-chalk-dim">{children}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-lg bg-pitch-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-md px-3 py-1.5 font-display text-[15px] font-semibold transition-colors ${
            o.value === value ? "bg-chalk text-pitch" : "text-chalk-dim hover:text-chalk"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
