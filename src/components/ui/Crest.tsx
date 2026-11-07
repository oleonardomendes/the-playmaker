import { useId } from "react";
import type { Club } from "@/engine/types";
import { readableOn } from "@/lib/color";

/**
 * Escudo gerado a partir das cores, do formato e do padrão do clube.
 * Packs que trocam as cores mudam o escudo automaticamente.
 */

const SHAPES = {
  escudo: "M10 6h80v52c0 30-22 46-40 54C32 104 10 88 10 58z",
  classico: "M8 10C30 2 70 2 92 10v50c0 28-18 44-42 54C26 104 8 88 8 60z",
  redondo: "M50 8a52 52 0 1 0 0.01 0z",
} as const;

export function Crest({ club, size = 32, showInitials }: { club: Club; size?: number; showInitials?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const clip = `crest-${uid}`;
  const [c0, c1, c2] = club.colors;
  const rim = c2 ?? c1;
  const path = club.crest.shape === "redondo" ? undefined : SHAPES[club.crest.shape];
  const initials = showInitials ?? size >= 48;

  const pattern = (() => {
    switch (club.crest.pattern) {
      case "listras":
        return [0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={i * 20} y={0} width={20} height={120} fill={i % 2 === 0 ? c0 : c1} />
        ));
      case "faixa":
        return (
          <>
            <rect width={100} height={120} fill={c0} />
            <rect y={44} width={100} height={26} fill={c1} />
          </>
        );
      case "diagonal":
        return (
          <>
            <rect width={100} height={120} fill={c0} />
            <path d="M-10 30 30 -10 110 90 70 130z" fill={c1} />
          </>
        );
      case "metade":
        return (
          <>
            <rect width={50} height={120} fill={c0} />
            <rect x={50} width={50} height={120} fill={c1} />
          </>
        );
      default:
        return <rect width={100} height={120} fill={c0} />;
    }
  })();

  // A sigla fica sobre a cor principal, com contraste garantido.
  const labelBg = club.crest.pattern === "liso" ? c0 : c1;

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      role="img"
      aria-label={`Escudo do ${club.name}`}
      className="shrink-0"
    >
      <defs>
        <clipPath id={clip}>
          {path ? <path d={path} /> : <circle cx={50} cy={60} r={46} />}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>{pattern}</g>
      {path ? (
        <path d={path} fill="none" stroke={rim} strokeWidth={6} />
      ) : (
        <circle cx={50} cy={60} r={46} fill="none" stroke={rim} strokeWidth={6} />
      )}
      {initials && (
        <>
          <rect x={22} y={47} width={56} height={24} rx={4} fill={labelBg} />
          <text
            x={50}
            y={65}
            textAnchor="middle"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight={700}
            fontSize={21}
            letterSpacing={1}
            fill={readableOn(labelBg)}
          >
            {club.shortName}
          </text>
        </>
      )}
    </svg>
  );
}
