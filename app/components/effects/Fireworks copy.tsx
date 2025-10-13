"use client";

import React, { useEffect, useRef } from "react";

// ---------- types (lifted above to avoid any TS hiccups) ----------
type Rocket = {
  x: number; y: number;
  vx: number; vy: number;
  targetY: number; color: string;
  exploded?: boolean;
  secondStage?: boolean;
};

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  life: number; ttl: number;
  size: number; color: string;
  sparkle?: boolean;
};

export type FireworksProps = {
  running?: boolean;
  density?: number;        // rockets/sec
  maxParticles?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Gorgeous, GPU-friendly fireworks.
 * - Rockets launch from bottom, rise, then burst into multi-stage peonies/crackles
 * - DPR scaling + resize handling
 * - Respects prefers-reduced-motion
 */
export function Fireworks({
  running = true,
  density = 0.6,
  maxParticles = 900,
  className,
  style,
}: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const state = {
      rockets: [] as Rocket[],
      particles: [] as Particle[],
      lastSpawn: 0,
      lastTime: performance.now(),
      dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
      W: 0,
      H: 0,
    };

    function resize() {
      const c = canvasRef.current;
      if (!c) return;

      state.W = window.innerWidth;
      state.H = window.innerHeight;

      // DPR scaling for crisp rendering
      c.width = Math.floor(state.W * state.dpr);
      c.height = Math.floor(state.H * state.dpr);
      c.style.width = `${state.W}px`;
      c.style.height = `${state.H}px`;

      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();

    // Physics & visuals
    const GRAVITY = 0.12;
    const FRICTION = 0.985;
    const AIR = 0.997;

    const COLORS = [
      "#ff4d4f", "#ffa940", "#fadb14", "#73d13d", "#36cfc9",
      "#40a9ff", "#597ef7", "#9254de", "#f759ab",
    ];

    function spawnRocket() {
      const x = lerp(0.1 * state.W, 0.9 * state.W, Math.random());
      const y = state.H + 8;
      const targetX = lerp(state.W * 0.3, state.W * 0.7, Math.random());
      const targetY = lerp(state.H * 0.25, state.H * 0.55, Math.random());

      const dx = (targetX - x);
      const dy = (targetY - y);
      const len = Math.hypot(dx, dy) || 1;
      const speed = lerp(6.5, 8.8, Math.random());
      const vx = (dx / len) * speed * (0.8 + Math.random() * 0.4);
      const vy = (dy / len) * speed * (0.9 + Math.random() * 0.2);

      state.rockets.push({
        x, y, vx, vy, targetY,
        color: pick(COLORS),
      });
    }

    function explode(r: Rocket, secondStage = false) {
      const bursts = secondStage ? 1 : (Math.random() < 0.4 ? 2 : 1);
      for (let b = 0; b < bursts; b++) {
        const count = secondStage ? randInt(28, 48) : randInt(80, 140);
        const hue = r.color;
        const ring = Math.random() < 0.45; // ring vs sphere

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.08;
          const power = secondStage ? lerp(2.2, 3.2, Math.random()) : lerp(3.2, 5.2, Math.random());
          const spread = ring ? 0.35 : 1;

          const vx = Math.cos(angle) * power * spread * (0.9 + Math.random() * 0.2);
          const vy = Math.sin(angle) * power * spread * (0.9 + Math.random() * 0.2);

          state.particles.push({
            x: r.x, y: r.y,
            vx, vy,
            life: 0,
            ttl: lerp(38, 80, Math.random()),
            size: ring ? lerp(1.2, 1.6, Math.random()) : lerp(1.4, 2.2, Math.random()),
            color: hue,
            sparkle: Math.random() < 0.4,
          });
        }
      }

      // crackle/sparkle micro-bursts
      const crackles = randInt(20, 36);
      for (let i = 0; i < crackles; i++) {
        state.particles.push({
          x: r.x + randRange(-4, 4),
          y: r.y + randRange(-4, 4),
          vx: randRange(-1.2, 1.2),
          vy: randRange(-1.2, 1.2),
          life: 0,
          ttl: lerp(18, 30, Math.random()),
          size: lerp(0.8, 1.2, Math.random()),
          color: "#ffffff",
          sparkle: true,
        });
      }
    }

    function step(dt: number) {
      // spawn
      if (running && !prefersReduced) {
        state.lastSpawn += dt;
        const interval = 1000 / Math.max(0.1, density);
        while (state.lastSpawn > interval) {
          state.lastSpawn -= interval;
          if (state.particles.length < maxParticles) spawnRocket();
        }
      }

      // update rockets
      for (let i = state.rockets.length - 1; i >= 0; i--) {
        const r = state.rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += GRAVITY * 0.02; // slight gravity on ascent
        r.vx *= AIR; r.vy *= AIR;

        // bloom trail
        drawGlow(r.x, r.y, 2, r.color, 0.25);

        // explode condition
        if (!r.exploded && r.y <= r.targetY) {
          r.exploded = true;
          explode(r, false);

          // schedule a second-stage pop slightly higher
          if (!r.secondStage && Math.random() < 0.6) {
            r.secondStage = true;
            setTimeout(() => {
              explode({ ...r, y: r.y - randRange(16, 50) }, true);
            }, randInt(120, 260));
          }
          state.rockets.splice(i, 1);
        }

        // offscreen safety
        if (r.y < -40 || r.x < -40 || r.x > state.W + 40) {
          state.rockets.splice(i, 1);
        }
      }

      // update particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.life += 1;
        if (p.life > p.ttl) {
          state.particles.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY * 0.08;
        p.vx *= FRICTION;
        p.vy *= FRICTION;

        const fade = 1 - p.life / p.ttl;

        if (p.sparkle && Math.random() < 0.5) {
          drawGlow(p.x, p.y, p.size + 1.2, "#ffffff", 0.9 * fade);
        }

        drawParticle(p.x, p.y, p.size, p.color, fade);
      }
    }

    function drawBackground() {
      // subtle fade to create trails
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(0, 0, state.W, state.H);

      // vignette/sky glow
      const g = ctx.createRadialGradient(
        state.W * 0.5, state.H * 0.9, state.H * 0.1,
        state.W * 0.5, state.H * 0.7, state.H * 0.9
      );
      g.addColorStop(0, "rgba(12,15,30,0.25)");
      g.addColorStop(1, "rgba(0,0,0,0.0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, state.W, state.H);
    }

    function drawGlow(x: number, y: number, r: number, color: string, alpha = 1) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = colorWithAlpha(color, alpha * 0.8);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawParticle(x: number, y: number, size: number, color: string, fade: number) {
      ctx.globalCompositeOperation = "lighter";
      const a = 0.25 + 0.75 * fade;
      const rr = size * (1 + 0.3 * Math.random());
      ctx.fillStyle = colorWithAlpha(color, a);
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(now: number) {
      const dt = Math.min(64, now - state.lastTime);
      state.lastTime = now;

      drawBackground();
      step(dt);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [density, maxParticles, running]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none fixed inset-0 ${className ?? ""}`}
      style={style}
    />
  );
}

// ---------- utils ----------
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randRange(min: number, max: number) { return Math.random() * (max - min) + min; }
function pick<T>(arr: T[]): T { return arr[(Math.random() * arr.length) | 0]; }
function colorWithAlpha(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

// Also export default for flexibility (so both `import Fireworks from ...` and `import { Fireworks } ...` work)
export default Fireworks;
