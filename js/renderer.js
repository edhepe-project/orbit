// ═══════════════════════════════════════════
// renderer.js — Dibujado en Canvas
// Solo recibe datos y pinta, no hace cálculos
// ═══════════════════════════════════════════

import * as Astro from './astronomy.js';

export class Renderer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.host = canvasEl.parentElement;
    this.W = 0;
    this.H = 0;
    this.DPR = 1;
    this.cx = 0;
    this.cy = 0;
    this.Rmax = 0;
    this.resize();
  }

  resize() {
    this.DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.host.getBoundingClientRect();
    let w = rect.width, h = rect.height;
    // Fallback si el contenedor no tiene dimensiones
    if (w < 50 || h < 50) {
      w = Math.min(window.innerWidth - 400, 720);
      h = Math.min(window.innerHeight - 120, 720);
    }
    // Forzar cuadrado
    const side = Math.min(w, h);
    this.canvas.width = side * this.DPR;
    this.canvas.height = side * this.DPR;
    this.canvas.style.width = side + 'px';
    this.canvas.style.height = side + 'px';
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.W = side;
    this.H = side;
    this.cx = side / 2;
    this.cy = side / 2;
    this.Rmax = side * 0.46;
  }

  // ── Conversión coordenadas ──
  radiusFor(dec) { return this.Rmax * (90 - dec) / 180; }

  posFrom(r, ang) {
    return {
      x: this.cx + r * Math.sin(ang),
      y: this.cy - r * Math.cos(ang)
    };
  }

  // ── Horizonte / atmósfera ──
  drawHorizon() {
    const { ctx, cx, cy, Rmax } = this;
    const rH = this.radiusFor(0);

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, Rmax, 0, Math.PI * 2);
    ctx.arc(cx, cy, rH, 0, Math.PI * 2, true);
    const grd = ctx.createRadialGradient(cx, cy, rH, cx, cy, Rmax);
    grd.addColorStop(0, 'rgba(10,13,22,0.3)');
    grd.addColorStop(1, 'rgba(10,13,22,0.7)');
    ctx.fillStyle = grd; ctx.fill('evenodd');
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, rH, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(95,168,160,0.25)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(95,168,160,0.4)'; ctx.shadowBlur = 12;
    ctx.stroke(); ctx.restore();
  }

  // ── Cuadrícula polar ──
  drawGrid() {
    const { ctx, cx, cy, Rmax } = this;
    const decRings = [90, 66.5, 23.5, 0, -23.5, -66.5, -90];

    // Bandas tropicales Sol
    ctx.save();
    const rS1 = this.radiusFor(-Astro.DEC_SUN_MAX), rS2 = this.radiusFor(Astro.DEC_SUN_MAX);
    ctx.beginPath(); ctx.arc(cx, cy, rS1, 0, Math.PI * 2);
    ctx.arc(cx, cy, rS2, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(231,178,75,0.05)'; ctx.fill('evenodd');
    // Bandas tropicales Luna
    const rM1 = this.radiusFor(-Astro.DEC_MOON_MAX), rM2 = this.radiusFor(Astro.DEC_MOON_MAX);
    ctx.beginPath(); ctx.arc(cx, cy, rM1, 0, Math.PI * 2);
    ctx.arc(cx, cy, rM2, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(175,203,224,0.045)'; ctx.fill('evenodd');
    ctx.restore();

    // Radios (spokes)
    ctx.save(); ctx.strokeStyle = 'rgba(46,58,92,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, p = this.posFrom(Rmax, a);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.restore();

    // Anillos de declinación
    ctx.save();
    decRings.forEach(d => {
      const r = this.radiusFor(d);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = d === 0 ? 'rgba(140,150,180,0.55)' : 'rgba(46,58,92,0.55)';
      ctx.lineWidth = d === 0 ? 1.2 : 1; ctx.stroke();
    });
    ctx.restore();

    // Etiquetas
    ctx.save();
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = '#7C88A6'; ctx.textBaseline = 'middle';
    [[90,'Polo N'],[66.5,'66.5°'],[23.5,'Tróp. Cáncer'],
     [0,'Ecuador'],[-23.5,'Tróp. Capricornio'],[-66.5,'−66.5°']].forEach(([d, label]) => {
      ctx.fillText(label, cx + 6, cy - this.radiusFor(d));
    });
    ctx.restore();
  }

  // ── Eclíptica ──
  drawEcliptic() {
    const { ctx, cx, cy } = this;
    ctx.save(); ctx.strokeStyle = 'rgba(231,178,75,0.18)'; ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    const angle = Astro.OBLIQUITY * Math.PI / 180, len = this.Rmax * 0.95;
    ctx.beginPath();
    ctx.moveTo(cx - len * Math.cos(angle), cy - len * Math.sin(angle));
    ctx.lineTo(cx + len * Math.cos(angle), cy + len * Math.sin(angle));
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }

  // ── Zodiac en borde exterior ──
  drawZodiac() {
    const { ctx, Rmax } = this;
    const signs = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
    ctx.save(); ctx.font = "13px serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(129,137,164,0.55)';
    for (let i = 0; i < 12; i++) {
      const ang = i * Math.PI / 6, p = this.posFrom(Rmax + 16, ang);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
      ctx.fillText(signs[i], 0, 0); ctx.restore();
    }
    ctx.restore();
  }

  // ── Solsticios / equinoccios ──
  drawSeasonMarkers() {
    const { ctx } = this;
    const markers = [
      { label: 'Eq. Mar', dec: 0, color: '#5FA8A0' },
      { label: 'Sol. Jun', dec: 23.44, color: '#E7B24B' },
      { label: 'Eq. Sep', dec: 0, color: '#5FA8A0' },
      { label: 'Sol. Dic', dec: -23.44, color: '#E7B24B' }
    ];
    ctx.save(); ctx.font = "9px 'JetBrains Mono', monospace"; ctx.textAlign = 'center';
    markers.forEach((m, i) => {
      const ang = i * Math.PI / 2, p = this.posFrom(this.radiusFor(m.dec), ang);
      ctx.fillStyle = m.color + '99';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(m.label, p.x, p.y - 8);
    });
    ctx.restore();
  }

  // ── Estelas ──
  drawTrail(trail, colorFn) {
    if (trail.length < 2) return;
    const { ctx } = this;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const p0 = trail[i - 1], p1 = trail[i];
      const alpha = (i / trail.length) * 0.85;
      ctx.strokeStyle = colorFn(alpha, i / trail.length);
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    ctx.restore();
  }

  // ── Analema ──
  drawAnalema(pts) {
    if (pts.length < 2) return;
    const { ctx } = this;
    ctx.save(); ctx.strokeStyle = 'rgba(231,178,75,0.55)'; ctx.lineWidth = 1.3;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,227,163,0.85)';
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  // ── Astro con glow ──
  drawBody(p, glow, core, radius) {
    const { ctx } = this;
    ctx.save();
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 4);
    grad.addColorStop(0, glow); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(p.x, p.y, radius * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Luna con fase integrada ──
  drawMoonWithPhase(p, illumination) {
    const { ctx } = this;
    const r = 5;
    // Glow exterior
    ctx.save();
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
    grad.addColorStop(0, 'rgba(175,203,224,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Parte iluminada (blanca)
    ctx.save();
    ctx.fillStyle = '#DCEAF4';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();

    // Parte oscura (sombra) — cubre la porción no iluminada
    ctx.fillStyle = 'rgba(10, 13, 22, 0.85)';
    ctx.beginPath();
    // Dibujar la sombra como un arco + curva del terminador
    // illumination: 0 = nueva (todo oscuro), 1 = llena (todo claro)
    // El terminador se desplaza de derecha a izquierda
    const sweep = illumination * 2 - 1; // -1 (nueva) a +1 (llena)
    // Sombra en el lado izquierdo, se encoge según iluminación
    ctx.arc(p.x, p.y, r, Math.PI / 2, -Math.PI / 2);
    ctx.quadraticCurveTo(p.x + sweep * r, p.y, p.x, p.y + r);
    ctx.fill();
    ctx.restore();
  }

  // ── Marcador de eclipse ──
  drawEclipseMarker(eclipse) {
    if (!eclipse) return;
    const { ctx, cx, cy, Rmax } = this;
    const intensity = Math.min(eclipse.proximity, 1);
    ctx.save(); ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const label = eclipse.type === 'solar' ? '☀ ECLIPSE SOLAR' : '🌑 ECLIPSE LUNAR';
    const color = eclipse.type === 'solar'
      ? 'rgba(231,178,75,' + (0.6 + intensity * 0.4) + ')'
      : 'rgba(175,203,224,' + (0.6 + intensity * 0.4) + ')';
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, Rmax * 0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = color;
    ctx.fillText(label, cx, cy + Rmax * 0.14);
    ctx.restore();
  }
}
