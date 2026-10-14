import { describe, expect, it } from "vitest";
import { filamentRgb, infill, MODELS, perimeter, slice } from "@/components/print-sim";

describe("baskı animasyonu dilimleyicisi", () => {
  it("her model için katmanları üretir; ilk katmanda kenar şeridi ve dolgu, sonra yalnız duvar", () => {
    for (const m of MODELS) {
      const L = slice(m);
      expect(L).toHaveLength(m.layers);
      const kinds = (i: number) => new Set(L[i].moves.map((x) => x.kind));
      expect(kinds(0)).toEqual(new Set(["brim", "travel", "wall", "infill"]));
      expect(kinds(1)).toEqual(new Set(["wall", "travel", "infill"]));
      expect(kinds(5)).toEqual(new Set(["wall"]));
      expect(L.at(-1)!.z).toBeCloseTo(m.height);
      for (const l of L) expect(l.length).toBeGreaterThan(0);
    }
  });
  it("çevre kapalı halkadır ve dolgu çokgenin içinde kalır", () => {
    const m = MODELS[0];
    const p = perimeter(m, 0.5);
    expect(p[0]).toEqual(p.at(-1));
    const r = m.radius(0.5);
    for (const q of infill(p, Math.PI / 4, 0.06)) expect(Math.hypot(q.x, q.y)).toBeLessThanOrEqual(r + 1e-9);
  });
  it("filament rengi uçlarda turuncu ve camgöbeği", () => {
    expect(filamentRgb(0)).toEqual([255, 107, 44]);
    expect(filamentRgb(1)).toEqual([34, 211, 238]);
  });
});
