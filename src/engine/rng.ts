/**
 * Gerador de números aleatórios determinístico (sfc32).
 *
 * Toda aleatoriedade do motor passa por aqui: a mesma semente sempre gera o
 * mesmo mundo e os mesmos resultados, o que permite reproduzir bugs,
 * balancear com simulações em lote e salvar só o estado do gerador.
 */

export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

export class Rng {
  private s: RngState;

  constructor(seed: number | RngState) {
    if (typeof seed === "number") {
      // Espalha a semente nos quatro registradores (splitmix32).
      let x = seed >>> 0;
      const next = () => {
        x = (x + 0x9e3779b9) >>> 0;
        let z = x;
        z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
        z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
        return (z ^ (z >>> 16)) >>> 0;
      };
      this.s = { a: next(), b: next(), c: next(), d: next() };
      for (let i = 0; i < 12; i++) this.next();
    } else {
      this.s = { ...seed };
    }
  }

  /** Número em [0, 1). */
  next(): number {
    const s = this.s;
    const t = (((s.a + s.b) >>> 0) + s.d) >>> 0;
    s.d = (s.d + 1) >>> 0;
    s.a = s.b ^ (s.b >>> 9);
    s.b = (s.c + (s.c << 3)) >>> 0;
    s.c = ((s.c << 21) | (s.c >>> 11)) >>> 0;
    s.c = (s.c + t) >>> 0;
    return t / 4294967296;
  }

  /** Inteiro em [min, max], inclusivo. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Verdadeiro com probabilidade p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("pick() em lista vazia");
    return items[Math.floor(this.next() * items.length)];
  }

  /** Normal aproximada (Box-Muller). */
  normal(mean = 0, sd = 1): number {
    const u = 1 - this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Sorteio de Poisson (algoritmo de Knuth, adequado para lambda pequeno). */
  poisson(lambda: number): number {
    const limit = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.next();
    } while (p > limit);
    return k - 1;
  }

  /** Estado serializável, para salvar junto com o save. */
  state(): RngState {
    return { ...this.s };
  }
}
