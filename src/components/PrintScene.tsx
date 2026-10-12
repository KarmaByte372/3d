"use client";

import { useEffect, useRef, useState } from "react";
import { filamentRgb, MODELS, slice, type Layer, type Model, type Pt } from "./print-sim";

/**
 * Ana sayfa baskı animasyonu (canvas). Nozul her katmanda gerçek yolu izler: ilk katmanda kenar şeridi ve
 * dolgu, sonra duvarlar. Biten katmanlar ayrı bir tuvalde önbelleğe alınır; her karede yalnızca basılmakta
 * olan katman ve yazıcı kafası çizilir. Görünmüyorken durur; hareket azaltma tercihinde son hali gösterilir.
 */

const PLATE = 1.15; // tabla yarı genişliği (dünya birimi)
const FRAME = 1.32; // çerçeve direkleri
const FRAME_H = 1.75;
const LIGHT = norm({ x: 0.25, y: 1 }); // ön-sol ışık
const VIEW = norm({ x: 1, y: 1 }); // izleyici +x +y yönünde
const HALF = norm({ x: LIGHT.x + VIEW.x, y: LIGHT.y + VIEW.y });

function norm(p: Pt) {
  const l = Math.hypot(p.x, p.y);
  return { x: p.x / l, y: p.y / l };
}

type View = { s: number; cx: number; cy: number; w: number; h: number; dpr: number };

function project(v: View, x: number, y: number, z: number) {
  return { x: v.cx + (x - y) * 0.866 * v.s, y: v.cy + (x + y) * 0.5 * v.s - z * v.s };
}

const rgb = (c: [number, number, number], k: number, add = 0) =>
  `rgb(${c.map((ch) => Math.max(0, Math.min(255, Math.round(ch * k + add)))).join(",")})`;

type Sim = {
  model: Model;
  layers: Layer[];
  layer: number;
  move: number;
  along: number; // mevcut harekette alınan yol
  pos: Pt; // nozul xy
  fresh: { a: Pt; b: Pt; age: number; kind: string }[]; // yeni çekilen, henüz soğumamış çizgiler
  phase: "print" | "park" | "hold" | "fade";
  phaseT: number;
  modelIdx: number;
  temp: number;
};

function newSim(modelIdx: number): Sim {
  const model = MODELS[modelIdx % MODELS.length];
  const layers = slice(model);
  return { model, layers, layer: 0, move: 0, along: 0, pos: { ...layers[0].start }, fresh: [], phase: "print", phaseT: 0, modelIdx, temp: 214.6 };
}

/** Bir ekstrüzyon parçasını gölgelendirerek çizer. */
/** stripe: katman çizgisi dokusu için tek/çift katmanlarda hafif ton farkı */
function drawSeg(ctx: CanvasRenderingContext2D, v: View, a: Pt, b: Pt, z: number, layerT: number, kind: string, heat = 0, stripe = 1) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const n = { x: dy / len, y: -dx / len }; // saat yönü tersine yolda dış normal
  const base = filamentRgb(layerT);
  let k: number;
  let add = 0;
  if (kind === "infill" || kind === "brim") {
    k = 0.55;
  } else if (n.x * VIEW.x + n.y * VIEW.y > 0) {
    const lam = Math.max(0, n.x * LIGHT.x + n.y * LIGHT.y);
    const spec = Math.pow(Math.max(0, n.x * HALF.x + n.y * HALF.y), 14);
    k = 0.42 + 0.62 * lam;
    add = 70 * spec; // ipek filament parlaması
  } else {
    k = 0.3; // iç yüzey (arka duvarın içi)
  }
  k *= stripe;
  if (heat > 0) add += 140 * heat; // sıcak, yeni çekilmiş filament
  const p0 = project(v, a.x, a.y, z);
  const p1 = project(v, b.x, b.y, z);
  ctx.strokeStyle = rgb(base, k, add);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
}

/** Bir katmanı (tamamı ya da bir kısmı) çizer: önce arka, sonra ön yüzler. */
function drawLayer(ctx: CanvasRenderingContext2D, v: View, m: Model, L: Layer, upto = Infinity, partial?: { from: Pt; to: Pt }) {
  const lh = m.height / m.layers;
  const stripe = Math.round(L.z / lh) % 2 ? 1 : 0.9;
  ctx.lineWidth = Math.max(1, lh * v.s * 1.45);
  ctx.lineCap = "round";
  const segs: { a: Pt; b: Pt; kind: string; front: boolean }[] = [];
  let prev = L.start;
  L.moves.forEach((mv, i) => {
    if (i > upto) return;
    const to = i === upto && partial ? partial.to : mv.to;
    if (mv.kind !== "travel") {
      const dx = to.x - prev.x;
      const dy = to.y - prev.y;
      segs.push({ a: prev, b: to, kind: mv.kind, front: dy * VIEW.x - dx * VIEW.y > 0 });
    }
    prev = mv.to;
  });
  for (const pass of [false, true]) {
    for (const s of segs) if (s.front === pass) drawSeg(ctx, v, s.a, s.b, L.z, L.t, s.kind, 0, stripe);
  }
}

function drawPlate(ctx: CanvasRenderingContext2D, v: View) {
  const c = [
    project(v, -PLATE, -PLATE, 0),
    project(v, PLATE, -PLATE, 0),
    project(v, PLATE, PLATE, 0),
    project(v, -PLATE, PLATE, 0),
  ];
  const th = 0.07 * v.s;
  // kalınlık (ön yüzler)
  ctx.fillStyle = "#0b0f19";
  ctx.beginPath();
  ctx.moveTo(c[1].x, c[1].y); ctx.lineTo(c[2].x, c[2].y); ctx.lineTo(c[2].x, c[2].y + th); ctx.lineTo(c[1].x, c[1].y + th);
  ctx.fill();
  ctx.fillStyle = "#121827";
  ctx.beginPath();
  ctx.moveTo(c[2].x, c[2].y); ctx.lineTo(c[3].x, c[3].y); ctx.lineTo(c[3].x, c[3].y + th); ctx.lineTo(c[2].x, c[2].y + th);
  ctx.fill();
  // üst yüzey: dokulu PEI levha
  const g = ctx.createLinearGradient(c[0].x, c[0].y, c[2].x, c[2].y);
  g.addColorStop(0, "#2a3346");
  g.addColorStop(0.55, "#1d2433");
  g.addColorStop(1, "#151b28");
  ctx.fillStyle = g;
  ctx.beginPath();
  c.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // ızgara
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let i = -PLATE + 0.23; i < PLATE; i += 0.23) {
    const a = project(v, i, -PLATE, 0), b = project(v, i, PLATE, 0);
    const d = project(v, -PLATE, i, 0), e = project(v, PLATE, i, 0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.stroke();
  }
  // parçanın gölgesi
  const sc = project(v, 0.08, 0.08, 0);
  const sg = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, 0.75 * v.s);
  sg.addColorStop(0, "rgba(0,0,0,0.35)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(sc.x, sc.y, 0.8 * v.s, 0.45 * v.s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function post(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, alpha: number) {
  const a = project(v, x, y, -0.07), b = project(v, x, y, FRAME_H);
  const g = ctx.createLinearGradient(a.x - 4, 0, a.x + 4, 0);
  g.addColorStop(0, `rgba(58,68,89,${alpha})`);
  g.addColorStop(0.5, `rgba(122,134,158,${alpha})`);
  g.addColorStop(1, `rgba(37,45,62,${alpha})`);
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(2, 0.045 * v.s);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function rod(ctx: CanvasRenderingContext2D, v: View, a: [number, number, number], b: [number, number, number], w: number, color = "#7a869e") {
  const p = project(v, ...a), q = project(v, ...b);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, w * v.s);
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
}

/** İzometrik kutu: üst, +x ve +y yüzleri görünür. */
function box(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, z: number, w: number, d: number, h: number, top: string, right: string, front: string) {
  const P = (dx: number, dy: number, dz: number) => project(v, x + dx, y + dy, z + dz);
  const face = (pts: { x: number; y: number }[], fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  const hw = w / 2, hd = d / 2;
  face([P(hw, -hd, 0), P(hw, hd, 0), P(hw, hd, h), P(hw, -hd, h)], right);
  face([P(-hw, hd, 0), P(hw, hd, 0), P(hw, hd, h), P(-hw, hd, h)], front);
  face([P(-hw, -hd, h), P(hw, -hd, h), P(hw, hd, h), P(-hw, hd, h)], top);
}

function drawHead(ctx: CanvasRenderingContext2D, v: View, p: Pt, z: number, extruding: boolean, t: number) {
  const gz = z + 0.42; // X ekseni rayı yüksekliği
  // X ekseni: iki paralel ray, taşıyıcının y konumunda
  rod(ctx, v, [-FRAME, p.y - 0.05, gz], [FRAME, p.y - 0.05, gz], 0.022, "#56607a");
  rod(ctx, v, [-FRAME, p.y + 0.05, gz + 0.07], [FRAME, p.y + 0.05, gz + 0.07], 0.022, "#8892a8");
  // taşıyıcı + soğutma fanı
  box(ctx, v, p.x, p.y, z + 0.17, 0.2, 0.2, 0.34, "#e9edf5", "#a9b3c7", "#cfd6e4");
  const fan = project(v, p.x, p.y + 0.1, z + 0.32);
  ctx.fillStyle = "#252d3e";
  ctx.beginPath(); ctx.ellipse(fan.x, fan.y, 0.06 * v.s, 0.07 * v.s, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#556079"; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a = t * 18 + (i * Math.PI * 2) / 3;
    ctx.beginPath(); ctx.moveTo(fan.x, fan.y); ctx.lineTo(fan.x + Math.cos(a) * 0.05 * v.s, fan.y + Math.sin(a) * 0.055 * v.s); ctx.stroke();
  }
  // ısıtıcı blok (turuncu bant)
  box(ctx, v, p.x, p.y, z + 0.075, 0.1, 0.1, 0.09, "#ff8a4c", "#c73a0a", "#f04d0e");
  // pirinç nozul
  const a = project(v, p.x - 0.03, p.y + 0.03, z + 0.075);
  const b = project(v, p.x + 0.03, p.y - 0.03, z + 0.075);
  const tip = project(v, p.x, p.y, z + 0.012);
  const ng = ctx.createLinearGradient(a.x, 0, b.x, 0);
  ng.addColorStop(0, "#b8892e"); ng.addColorStop(0.5, "#f5d27a"); ng.addColorStop(1, "#8a6420");
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(tip.x, tip.y); ctx.closePath(); ctx.fill();
  if (extruding) {
    const r = 0.09 * v.s;
    const glow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, r);
    glow.addColorStop(0, "rgba(255,190,120,0.95)");
    glow.addColorStop(0.35, "rgba(255,107,44,0.45)");
    glow.addColorStop(1, "rgba(255,107,44,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(tip.x, tip.y, r, 0, Math.PI * 2); ctx.fill();
  }
}

export function PrintScene({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ layer: 0, total: MODELS[0].layers, pct: 0, temp: 215, name: MODELS[0].name, done: false });

  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    const cache = document.createElement("canvas");
    const cctx = cache.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let v: View = { s: 1, cx: 0, cy: 0, w: 0, h: 0, dpr: 1 };
    let sim = newSim(0);
    let raf = 0;
    let last = 0;
    let visible = true;
    let hudAt = -Infinity;

    const bake = () => {
      cctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      cctx.clearRect(0, 0, v.w, v.h);
      for (let i = 0; i < sim.layer && i < sim.layers.length; i++) drawLayer(cctx, v, sim.model, sim.layers[i]);
    };

    const resize = () => {
      const r = wrap.current!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      v = { w: r.width, h: r.height, dpr, s: r.width / 3.75, cx: r.width / 2, cy: 0 };
      v.cy = r.height * 0.5 + v.s * 0.62;
      for (const c of [el, cache]) {
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
      }
      el.style.width = `${r.width}px`;
      el.style.height = `${r.height}px`;
      bake();
    };

    const step = (dt: number) => {
      sim.temp += (215 + Math.sin(performance.now() / 900) * 0.6 - sim.temp) * 0.05;
      if (sim.phase !== "print") {
        sim.phaseT += dt;
        if (sim.phase === "park") {
          const k = Math.min(1, dt * 3);
          sim.pos = { x: sim.pos.x + (-0.85 - sim.pos.x) * k, y: sim.pos.y + (-0.85 - sim.pos.y) * k };
          if (sim.phaseT > 1) { sim.phase = "hold"; sim.phaseT = 0; }
        } else if (sim.phase === "hold" && sim.phaseT > 2.4) {
          sim.phase = "fade"; sim.phaseT = 0;
        } else if (sim.phase === "fade" && sim.phaseT > 0.9) {
          sim = newSim(sim.modelIdx + 1);
          bake();
        }
        return;
      }
      // İlk iki katman yavaş (detaylar görünsün), sonra hızlanan "time-lapse"
      const speed = sim.layer < 2 ? 8 : Math.min(12, 4.5 + sim.layer * 0.3);
      let budget = speed * dt;
      while (budget > 0 && sim.phase === "print") {
        const L = sim.layers[sim.layer];
        const mv = L.moves[sim.move];
        const travel = mv.kind === "travel";
        const from = sim.pos;
        const remain = Math.hypot(mv.to.x - from.x, mv.to.y - from.y);
        const cost = travel ? budget * 2.5 : budget; // boşta hareket daha hızlı
        if (cost >= remain) {
          if (!travel) sim.fresh.push({ a: from, b: mv.to, age: 0, kind: mv.kind });
          sim.pos = mv.to;
          budget -= travel ? remain / 2.5 : remain;
          sim.move++;
          if (sim.move >= L.moves.length) {
            drawLayer(cctx, v, sim.model, L); // katman bitti: önbelleğe yaz
            sim.layer++;
            sim.move = 0;
            sim.fresh = [];
            if (sim.layer >= sim.layers.length) { sim.phase = "park"; sim.phaseT = 0; }
            else sim.pos = sim.layers[sim.layer].start;
          }
        } else {
          const k = cost / remain;
          const to = { x: from.x + (mv.to.x - from.x) * k, y: from.y + (mv.to.y - from.y) * k };
          if (!travel) sim.fresh.push({ a: from, b: to, age: 0, kind: mv.kind });
          sim.pos = to;
          budget = 0;
        }
      }
      for (const f of sim.fresh) f.age += dt;
      if (sim.fresh.length > 400) sim.fresh.splice(0, sim.fresh.length - 400);
    };

    const render = (time: number) => {
      ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      ctx.clearRect(0, 0, v.w, v.h);
      // arka çerçeve direkleri ve üst raylar
      post(ctx, v, -FRAME, -FRAME, 0.9);
      post(ctx, v, FRAME, -FRAME, 0.9);
      post(ctx, v, -FRAME, FRAME, 0.9);
      rod(ctx, v, [-FRAME, -FRAME, FRAME_H], [FRAME, -FRAME, FRAME_H], 0.03, "#3a4459");
      rod(ctx, v, [-FRAME, -FRAME, FRAME_H], [-FRAME, FRAME, FRAME_H], 0.03, "#3a4459");
      drawPlate(ctx, v);

      const fade = sim.phase === "fade" ? 1 - sim.phaseT / 0.9 : 1;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.drawImage(cache, 0, 0, v.w, v.h);
      // basılmakta olan katman
      const L = sim.layers[Math.min(sim.layer, sim.layers.length - 1)];
      if (sim.phase === "print") {
        drawLayer(ctx, v, sim.model, L, sim.move - 1);
        ctx.lineWidth = Math.max(1, (sim.model.height / sim.model.layers) * v.s * 1.45);
        for (const f of sim.fresh) drawSeg(ctx, v, f.a, f.b, L.z, L.t, f.kind, Math.max(0, 1 - f.age / 0.5));
      }
      ctx.globalAlpha = 1;

      const z = sim.phase === "print" ? L.z : sim.layers[sim.layers.length - 1].z + 0.25;
      const extruding = sim.phase === "print" && L.moves[sim.move]?.kind !== "travel";
      drawHead(ctx, v, sim.pos, z, extruding, time / 1000);
      // ön direk yok: gerçek yazıcılarda ön taraf açıktır, parçanın önünü kesmesin

      if (time - hudAt > 200) {
        hudAt = time;
        const doneLayers = Math.min(sim.layer, sim.layers.length);
        setHud({
          layer: Math.min(doneLayers + (sim.phase === "print" ? 1 : 0), sim.layers.length),
          total: sim.layers.length,
          pct: Math.round((doneLayers / sim.layers.length) * 100),
          temp: sim.phase === "print" ? sim.temp : 215 - Math.min(60, sim.phaseT * 20),
          name: sim.model.name,
          done: sim.phase !== "print",
        });
      }
    };

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - (last || time)) / 1000);
      last = time;
      step(dt);
      render(time);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
      else raf = 0;
    };

    const start = () => {
      if (!raf && visible && !document.hidden && !reduced) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    if (reduced) {
      // Hareket azaltma: modeli tamamen basılmış göster
      for (const L of sim.layers) drawLayer(cctx, v, sim.model, L);
      sim.layer = sim.layers.length;
      sim.phase = "hold";
      sim.pos = { x: -0.85, y: -0.85 };
      render(0);
    } else start();

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) {
        for (const L of sim.layers) drawLayer(cctx, v, sim.model, L);
        render(0);
      }
    });
    ro.observe(wrap.current!);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      start();
    });
    io.observe(wrap.current!);
    const onVis = () => start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={wrap} className={`relative aspect-square w-full max-w-[440px] ${className}`} aria-hidden="true">
      <div className="absolute inset-[14%] rounded-full bg-gradient-to-tr from-filament-orange/25 via-filament-pink/15 to-filament-cyan/25 blur-3xl" />
      <canvas ref={canvas} className="relative block h-full w-full" />

      <div className="absolute left-0 top-[8%] rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-ink-200 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${hud.done ? "bg-filament-lime" : "animate-pulse bg-filament-cyan"}`} />
          {hud.done ? "Baskı tamamlandı" : `Katman ${hud.layer} / ${hud.total}`}
        </div>
        <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-filament-orange via-filament-pink to-filament-cyan transition-[width] duration-200" style={{ width: `${hud.pct}%` }} />
        </div>
        <div className="mt-1 text-ink-400">{hud.name} · %{hud.pct}</div>
      </div>
      <div className="absolute bottom-[6%] right-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-ink-200 backdrop-blur-md">
        <div>Nozul <span className="text-filament-orange">{hud.temp.toFixed(1)}°C</span></div>
        <div className="text-ink-400">Tabla 60.0°C · 0.2 mm</div>
      </div>
    </div>
  );
}
