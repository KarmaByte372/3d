/**
 * Ana sayfadaki baskı animasyonunun "dilimleyicisi": bir modeli katmanlara ayırır ve her katman için
 * nozulun izleyeceği yolu (çevre, kenar şeridi, dolgu, boşta hareket) üretir. Çizimden bağımsızdır.
 */

export type Pt = { x: number; y: number };
/** kind: wall = dış duvar, brim = kenar şeridi, infill = dolgu, travel = ekstrüzyonsuz hareket */
export type Move = { to: Pt; kind: "wall" | "brim" | "infill" | "travel" };
export type Layer = { z: number; t: number; start: Pt; moves: Move[]; length: number };

export type Model = {
  name: string;
  sides: number;
  /** yükseklik (0..1) → yarıçap */
  radius: (t: number) => number;
  /** yükseklik (0..1) → bükülme açısı (radyan) */
  twist: (t: number) => number;
  height: number;
  layers: number;
};

export const MODELS: Model[] = [
  {
    name: "Bükümlü vazo",
    sides: 9,
    radius: (t) => 0.5 + 0.17 * Math.sin(Math.PI * (t * 1.1 + 0.12)) - 0.1 * t * t,
    twist: (t) => t * 1.1,
    height: 1.2,
    layers: 44,
  },
  {
    name: "Altıgen kalemlik",
    sides: 6,
    radius: (t) => 0.46 + 0.05 * Math.cos(Math.PI * 2 * t),
    twist: (t) => t * 0.55,
    height: 1.0,
    layers: 38,
  },
  {
    name: "Saksı",
    sides: 14,
    radius: (t) => 0.36 + 0.24 * t + 0.03 * Math.sin(t * Math.PI * 6),
    twist: () => 0,
    height: 0.95,
    layers: 36,
  },
];

const SUB = 5; // her kenar için ara nokta: nozul köşeler arasında düz gider

/** Katman çevresi (saat yönü tersine, dikiş noktası her katmanda aynı köşede başlar) */
export function perimeter(m: Model, t: number, offset = 0): Pt[] {
  const r = m.radius(t) + offset;
  const tw = m.twist(t);
  const verts: Pt[] = [];
  for (let j = 0; j < m.sides; j++) {
    const a = (j / m.sides) * Math.PI * 2 + tw - Math.PI / 4;
    verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  const pts: Pt[] = [];
  for (let j = 0; j < m.sides; j++) {
    const a = verts[j];
    const b = verts[(j + 1) % m.sides];
    for (let s = 0; s < SUB; s++) {
      const k = s / SUB;
      pts.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    }
  }
  pts.push(pts[0]); // halkayı kapat
  return pts;
}

/** Dışbükey çokgenin içini verilen açıda zikzak dolgu çizgileriyle doldurur. */
export function infill(poly: Pt[], angle: number, spacing: number): Pt[] {
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  const rot = (p: Pt) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c });
  const back = (p: Pt) => ({ x: p.x * c + p.y * s, y: -p.x * s + p.y * c });
  const rp = poly.map(rot);
  const ys = rp.map((p) => p.y);
  const out: Pt[] = [];
  let flip = false;
  for (let y = Math.min(...ys) + spacing / 2; y < Math.max(...ys); y += spacing) {
    const xs: number[] = [];
    for (let i = 0; i < rp.length - 1; i++) {
      const a = rp[i];
      const b = rp[i + 1];
      if ((a.y - y) * (b.y - y) < 0) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    if (xs.length < 2) continue;
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const seg = flip ? [{ x: x1, y }, { x: x0, y }] : [{ x: x0, y }, { x: x1, y }];
    out.push(back(seg[0]), back(seg[1]));
    flip = !flip;
  }
  return out;
}

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/** Modeli katmanlara böler. 0. katman: kenar şeridi + duvar + dolgu, 1. katman: duvar + ters dolgu, sonrası: duvar. */
export function slice(m: Model): Layer[] {
  const lh = m.height / m.layers;
  const layers: Layer[] = [];
  for (let k = 0; k < m.layers; k++) {
    const t = k / (m.layers - 1);
    const moves: Move[] = [];
    const wall = perimeter(m, t);
    let start = wall[0];
    if (k === 0) {
      for (const off of [0.16, 0.12, 0.08]) {
        const ring = perimeter(m, t, off);
        if (moves.length === 0) start = ring[0];
        else moves.push({ to: ring[0], kind: "travel" });
        for (const p of ring.slice(1)) moves.push({ to: p, kind: "brim" });
      }
      moves.push({ to: wall[0], kind: "travel" });
    }
    for (const p of wall.slice(1)) moves.push({ to: p, kind: "wall" });
    if (k < 2) {
      const inner = perimeter(m, t, -0.035);
      const lines = infill(inner, k === 0 ? Math.PI / 4 : -Math.PI / 4, 0.06);
      if (lines.length) {
        moves.push({ to: lines[0], kind: "travel" });
        for (const p of lines.slice(1)) moves.push({ to: p, kind: "infill" });
      }
    }
    let length = 0;
    let prev = start;
    for (const mv of moves) {
      length += dist(prev, mv.to);
      prev = mv.to;
    }
    layers.push({ z: (k + 1) * lh, t, start, moves, length });
  }
  return layers;
}

/** Filament rengi: yükseklikle turuncu → pembe → mor → camgöbeği geçişli "silk" filament */
const STOPS: [number, [number, number, number]][] = [
  [0, [255, 107, 44]],
  [0.4, [255, 61, 139]],
  [0.7, [168, 85, 247]],
  [1, [34, 211, 238]],
];
export function filamentRgb(t: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1];
      const [t1, c1] = STOPS[i];
      const k = (t - t0) / (t1 - t0);
      return [0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}
