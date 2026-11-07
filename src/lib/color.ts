/** Luminância relativa (WCAG) de uma cor #rrggbb. */
export function luminance(hex: string): number {
  const v = hex.replace("#", "");
  const channel = (i: number) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** Texto legível (quase preto ou quase branco) sobre a cor dada. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.4 ? "#10140f" : "#f7faf5";
}
