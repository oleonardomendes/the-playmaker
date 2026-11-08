import { useId, type ReactNode } from "react";
import type { Player, Position } from "@/engine/types";

/**
 * Peças visuais de jogador: anel de força, selo de posição, rosto ilustrado
 * e o cartão usado no campo. Tudo desenhado por código, sem fotos.
 */

/* ---------- Setores e cores ---------- */

export type Sector = "gol" | "def" | "mei" | "ata";

export const SECTOR: Record<Position, Sector> = {
  GOL: "gol",
  ZAG: "def",
  LD: "def",
  LE: "def",
  VOL: "mei",
  MEI: "mei",
  PD: "ata",
  PE: "ata",
  ATA: "ata",
};

export const SECTOR_COLOR: Record<Sector, string> = {
  gol: "var(--pos-gol)",
  def: "var(--pos-def)",
  mei: "var(--pos-mei)",
  ata: "var(--pos-ata)",
};

export function positionColor(pos: Position) {
  return SECTOR_COLOR[SECTOR[pos]];
}

/** Selo da posição com a cor do setor. */
export function PosTag({ pos, className = "", off }: { pos: Position; className?: string; off?: boolean }) {
  return (
    <span
      className={`inline-flex h-[18px] min-w-[30px] items-center justify-center rounded-[5px] px-1 font-display text-[12px] font-bold leading-none tracking-wide ${className}`}
      style={{ color: off ? "var(--red)" : positionColor(pos), background: `color-mix(in srgb, ${off ? "var(--red)" : positionColor(pos)} 16%, transparent)` }}
    >
      {pos}
    </span>
  );
}

/* ---------- Anel de força ---------- */

/** Cor da força: dourado para craques, verde bom, branco regular, apagado fraco. */
export function strengthColor(v: number) {
  return v >= 80 ? "var(--gold)" : v >= 70 ? "var(--good)" : v >= 60 ? "#b9c6dd" : "var(--chalk-faint)";
}

/**
 * Número dentro de um anel que preenche conforme o valor (0–100).
 * Para condição física, passe `tone` para colorir pelo estado.
 */
export function Ring({
  value,
  size = 30,
  stroke = 2.6,
  color,
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const tone = color ?? strengthColor(value);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-label={label}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(7,11,22,0.65)" stroke="rgba(160,180,230,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <span className="relative font-display font-bold tabular-nums leading-none text-chalk" style={{ fontSize: size * 0.44 }}>
        {children ?? Math.round(value)}
      </span>
    </span>
  );
}

export function conditionColor(c: number) {
  return c >= 90 ? "var(--good)" : c >= 75 ? "var(--gold)" : c >= 60 ? "var(--warn)" : "var(--red)";
}

/* ---------- Rosto ilustrado ---------- */

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Sequência de escolhas determinística a partir do id do jogador. */
function picker(seed: string) {
  let h = hash(seed);
  return (n: number) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return (h >>> 0) % n;
  };
}

const SKINS = ["#f3d2b8", "#e9bf9c", "#d9a47c", "#c38a62", "#a86f4a", "#8a5638", "#6b4029", "#4e2e1e"];
const HAIRS = ["#1b1310", "#2b1d15", "#3d2a1c", "#5a3d24", "#8a5a30", "#b88a4e", "#d9b676"];

/** Peso dos tons de pele por país, para os elencos parecerem com a região. */
function skinIndex(p: Player, pick: (n: number) => number) {
  const spread: Record<string, [number, number]> = {
    BR: [0, 8],
    AR: [0, 4],
    UY: [0, 4],
    CL: [1, 5],
    PY: [1, 5],
    BO: [2, 6],
    PE: [2, 6],
    EC: [2, 7],
    CO: [1, 8],
    VE: [1, 8],
  };
  const [lo, hi] = spread[p.nationality] ?? [0, 8];
  return lo + pick(hi - lo);
}

/**
 * Rosto do jogador desenhado em SVG. O mesmo id gera sempre o mesmo rosto;
 * a idade muda o cabelo (grisalho, entradas) e a camisa usa a cor do clube.
 */
export function Face({ player, size = 40, shirt = "#2a3550", season }: { player: Player; size?: number; shirt?: string; season?: number }) {
  const uid = useId().replace(/:/g, "");
  const pick = picker(player.id);
  const si = skinIndex(player, pick);
  const skin = SKINS[si];
  const dark = si >= 5;
  const age = season ? season - player.birthYear : 26;
  let hairColor = HAIRS[dark ? pick(2) : Math.min(HAIRS.length - 1, pick(si <= 1 ? 7 : 4))];
  if (age >= 33 && pick(3) === 0) hairColor = "#8d8a86";
  const hairStyles = dark ? ["buzz", "afro", "curto", "careca", "tranca", "buzz"] : ["curto", "topete", "liso", "buzz", "careca", "franja", "curto"];
  const hair = hairStyles[pick(hairStyles.length)];
  const beards = ["nenhuma", "nenhuma", "rala", "cheia", "cavanhaque", "bigode"];
  const beard = age < 20 ? "nenhuma" : beards[pick(beards.length)];
  const brow = pick(3);
  const jaw = 3 + pick(5);
  const clip = `face-${uid}`;
  const shade = "rgba(0,0,0,0.16)";

  return (
    <svg viewBox="7 6 50 50" width={size} height={size} aria-hidden className="shrink-0">
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="31" r="25" />
        </clipPath>
        <radialGradient id={`${clip}-bg`} cx="50%" cy="30%" r="80%">
          <stop offset="0" stopColor="#2c3a5c" />
          <stop offset="1" stopColor="#141c30" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={`url(#${clip}-bg)`} />
        {/* camisa e pescoço */}
        <path d="M6 64c2-11 12-15 26-15s24 4 26 15z" fill={shirt} />
        <path d="M26 46h12v6c-2 3-10 3-12 0z" fill={skin} />
        <path d="M26 49c3 2 9 2 12 0v2c-3 2-9 2-12 0z" fill={shade} />
        {/* cabelo de trás (longo/afro/trança) */}
        {hair === "afro" && <ellipse cx="32" cy="23" rx="18" ry="15" fill={hairColor} />}
        {hair === "liso" && <path d="M14 26c0-12 8-18 18-18s18 6 18 18v12h-5V27H19v11h-5z" fill={hairColor} />}
        {/* orelhas e cabeça */}
        <ellipse cx="17" cy="31" rx="3" ry="4.5" fill={skin} />
        <ellipse cx="47" cy="31" rx="3" ry="4.5" fill={skin} />
        <path d={`M17 28C17 17 24 11 32 11C40 11 47 17 47 28C47 38 ${47 - jaw} 46 32 46C${17 + jaw} 46 17 38 17 28Z`} fill={skin} />
        <path d="M17 30c0 9 4 17 15 17-8-2-12-8-13-17z" fill={shade} />
        {/* cabelo da frente */}
        {hair === "curto" && <path d="M16 27c-1-10 6-17 16-17s17 7 16 17c-2-5-5-8-9-9-5 2-12 2-18 0-3 2-4 5-5 9z" fill={hairColor} />}
        {hair === "topete" && <path d="M16 27c-1-9 4-14 9-16 6-4 15-3 20 2 3 3 4 8 3 14-2-5-4-7-8-8-6 1-13 1-18-1-3 2-5 5-6 9z" fill={hairColor} />}
        {hair === "liso" && <path d="M16 27c0-10 7-17 16-17s16 7 16 17c-4-6-10-9-16-9s-12 3-16 9z" fill={hairColor} />}
        {hair === "franja" && <path d="M16 28c-1-11 6-18 16-18s17 7 16 18c-3-3-6-6-11-6-3 2-9 3-14 1-3 1-5 3-7 5z" fill={hairColor} />}
        {hair === "buzz" && <path d="M17 26c0-9 6-15 15-15s15 6 15 15c-3-4-8-6-15-6s-12 2-15 6z" fill={hairColor} opacity="0.85" />}
        {hair === "afro" && <path d="M16 26c0-9 6-14 16-14s16 5 16 14c-4-4-9-5-16-5s-12 1-16 5z" fill={hairColor} />}
        {hair === "tranca" && (
          <g fill={hairColor}>
            <path d="M17 26c0-9 6-15 15-15s15 6 15 15c-3-4-8-6-15-6s-12 2-15 6z" />
            {[20, 25, 30, 35, 40, 44].map((x) => (
              <rect key={x} x={x - 1} y="12" width="2" height="12" rx="1" opacity="0.6" fill="#000" />
            ))}
          </g>
        )}
        {hair === "careca" && <path d="M19 20c3-5 8-8 13-8s10 3 13 8c-4-2-8-3-13-3s-9 1-13 3z" fill="rgba(255,255,255,0.12)" />}
        {/* sobrancelhas, olhos, nariz, boca */}
        <g stroke={dark ? "#1a100b" : "#3a2618"} strokeWidth={brow === 2 ? 2.2 : 1.7} strokeLinecap="round">
          <path d={brow === 1 ? "M22 26.5l6-1" : "M22 26l6 0"} />
          <path d={brow === 1 ? "M36 25.5l6 1" : "M36 26l6 0"} />
        </g>
        <ellipse cx="25" cy="30.5" rx="1.7" ry="1.4" fill="#1a1412" />
        <ellipse cx="39" cy="30.5" rx="1.7" ry="1.4" fill="#1a1412" />
        <path d="M32 31c-1 4-2 6-3 7 1 1 4 1 5 0" fill="none" stroke={shade} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M27.5 41.5c3 1.5 6 1.5 9 0" fill="none" stroke="#5b2f26" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        {/* barba */}
        {beard === "rala" && <path d="M19 33c1 9 6 14 13 14s12-5 13-14c-2 6-6 9-13 9s-11-3-13-9z" fill={hairColor} opacity="0.35" />}
        {beard === "cheia" && <path d="M18 31c0 11 6 16 14 16s14-5 14-16c-2 5-4 7-7 8-2-2-11-2-14 0-3-1-5-3-7-8zM28 41.5c3 1 5 1 8 0" fill={hairColor} opacity="0.92" />}
        {beard === "cavanhaque" && <path d="M27 40c2 2 8 2 10 0 0 4-2 7-5 7s-5-3-5-7z" fill={hairColor} opacity="0.9" />}
        {beard === "bigode" && <path d="M26.5 39.5c2-1.5 9-1.5 11 0-2 1-9 1-11 0z" fill={hairColor} />}
        {age >= 32 && <path d="M21 35c1 1 2 2 3 2M43 35c-1 1-2 2-3 2" stroke={shade} strokeWidth="1" fill="none" />}
      </g>
    </svg>
  );
}

/* ---------- Nome no estilo de placar ---------- */

/** "Gabriel Brazão" → inicial + sobrenome em caixa alta quando é longo. */
export function pitchName(name: string, max = 11) {
  const parts = name.trim().split(/\s+/);
  if (name.length <= max || parts.length === 1) return name.toUpperCase();
  return `${parts[0][0]}. ${parts[parts.length - 1]}`.toUpperCase();
}
