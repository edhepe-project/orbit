// ═══════════════════════════════════════════
// app.js — Punto de entrada
// Init, loop principal, orquestación
// ═══════════════════════════════════════════

import * as Astro from './astronomy.js';
import { Renderer } from './renderer.js';
import { Controls } from './controls.js';

// ── Estado de simulación ──
let t = 0;
let sunTrail = [];
let moonTrail = [];
let analemaPts = [];
let lastFrame = null;

// ── Instancias ──
const canvas    = document.getElementById('cv');
const renderer  = new Renderer(canvas);
const controls  = new Controls();

// ── Resize ──
window.addEventListener('resize', () => renderer.resize());
// Re-resize tras el layout inicial
requestAnimationFrame(() => renderer.resize());

// ── Trazar analema (1 año de muestras) ──
function traceAnalemaPoints(hour) {
  const pts = [];
  const nDays = Math.round(Astro.TY);
  for (let i = 0; i <= nDays; i++) {
    const tt = i + hour / 24;
    const dS = Astro.decSun(tt);
    const aS = Astro.angleSun(tt, true); // siempre Sol preciso
    pts.push(renderer.posFrom(renderer.radiusFor(dS), aS));
  }
  return pts;
}

// ── Empujar estelas ──
function pushTrails() {
  const pS = renderer.posFrom(
    renderer.radiusFor(Astro.decSun(t)),
    Astro.angleSun(t)
  );
  const pM = renderer.posFrom(
    renderer.radiusFor(Astro.decMoon(t, controls.moonOffset, controls.lunarNodal)),
    Astro.angleMoon(t)
  );
  sunTrail.push(pS);
  moonTrail.push(pM);
  while (sunTrail.length > controls.trailMax) sunTrail.shift();
  while (moonTrail.length > controls.trailMax) moonTrail.shift();
}

// ── Colores de estela con gradiente ──
function sunColor(alpha, ratio) {
  const r = Math.round(231 + (255 - 231) * ratio * 0.3);
  const g = Math.round(178 * (1 - ratio * 0.4));
  const b = Math.round(75 * (1 - ratio * 0.5));
  return `rgba(${r},${g},${b},${alpha})`;
}

function moonColor(alpha, ratio) {
  const r = Math.round(175 * (1 - ratio * 0.3));
  const g = Math.round(203 - 40 * ratio);
  const b = Math.round(224 + 31 * Math.min(ratio, 1));
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Render de un frame ──
function renderFrame() {
  const ctx = renderer.ctx;
  ctx.clearRect(0, 0, renderer.W, renderer.H);

  // Capas de fondo
  renderer.drawHorizon();
  renderer.drawGrid();
  renderer.drawContinents();
  renderer.drawEcliptic();
  renderer.drawZodiac();
  renderer.drawSeasonMarkers();

  // Estelas
  if (controls.showSunTrail)  renderer.drawTrail(sunTrail, sunColor);
  if (controls.showMoonTrail) renderer.drawTrail(moonTrail, moonColor);

  // Analema
  if (controls.showAnalema) renderer.drawAnalema(analemaPts);

  // Posiciones actuales
  const dS = Astro.decSun(t);
  const dM = Astro.decMoon(t, controls.moonOffset, controls.lunarNodal);
  const aS = Astro.angleSun(t, controls.preciseSun);
  const aM = Astro.angleMoon(t);
  const pS = renderer.posFrom(renderer.radiusFor(dS), aS);
  const pM = renderer.posFrom(renderer.radiusFor(dM), aM);

  const illumination = Astro.lunarIllumination(t, controls.moonOffset);
  const eclipse = Astro.detectEclipse(t, controls.moonOffset, controls.lunarNodal);

  // Dibujar astros (Luna con fase integrada, Sol encima)
  renderer.drawMoonWithPhase(pM, illumination);
  renderer.drawBody(pS, 'rgba(231,178,75,0.75)', '#FFE3A3', 6.5);
  renderer.drawEclipseMarker(eclipse);

  // Actualizar readouts
  controls.updateReadouts({ t, dS, dM, eclipse, illumination });
}

// ── Loop principal ──
function loop(ts) {
  if (lastFrame === null) lastFrame = ts;
  const dt = (ts - lastFrame) / 1000;
  lastFrame = ts;

  // Procesar flags de controles
  if (controls.consumeReset()) {
    t = 0; sunTrail = []; moonTrail = [];
  }
  const dayJump = controls.consumeDayJump();
  if (dayJump !== null) {
    t = dayJump; sunTrail = []; moonTrail = [];
  }
  if (controls.consumeSunClear())   sunTrail = [];
  if (controls.consumeMoonClear())  moonTrail = [];
  if (controls.consumeClearAnalema()) analemaPts = [];
  if (controls.consumeTraceAnalema()) analemaPts = traceAnalemaPoints(controls.analemaHour);

  // Avanzar simulación
  if (controls.playing) {
    t += dt * controls.speed;
    pushTrails();
  }

  renderFrame();
  requestAnimationFrame(loop);
}

// ── Arranque ──
renderFrame();
requestAnimationFrame(loop);
