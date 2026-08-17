// ═══════════════════════════════════════════
// astronomy.js — Modelo astronómico puro
// Sin dependencias DOM, Canvas, ni UI
// ═══════════════════════════════════════════

// ── Constantes ──
export const TY = 365 + 5 / 24 + 48 / 1440;   // período declinación solar (días)
export const TM = 27.7;                        // período declinación lunar (días)
export const DEC_SUN_MAX = 23.44;              // oblicuidad terrestre media
export const DEC_MOON_MAX = 28.6;              // declinación máx. lunar
export const DAY_SUN = 1;                      // rotación diaria Sol
export const DAY_MOON = 1 + 50 / 1440;         // rotación diaria Luna (~24h50m)
export const EQUINOX_OFFSET_DAYS = 79;         // equinoccio marzo ≈ día 79
export const OBLIQUITY = 23.44;
export const LUNAR_INCL = 5.145;
export const T_NODAL = 18.6 * 365.25;          // regresión nodal ≈ 6793.6 días
export const BASE_DATE = new Date(2026, 2, 20);

// ── Ecuación del tiempo (Spencer, error ~1 min) ──
export function eotMinutes(tt) {
  const tyMod = ((tt % TY) + TY) % TY;
  const dayOfYear = (tyMod + EQUINOX_OFFSET_DAYS) % 365;
  const g = 2 * Math.PI * (dayOfYear - 1) / 365;
  return 229.18 * (
    0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g)
  );
}

// ── Envolvente de declinación máx. lunar (regresión nodal) ──
export function moonMaxDec(tt) {
  return OBLIQUITY + LUNAR_INCL * Math.cos(2 * Math.PI * tt / T_NODAL);
}

// ── Declinación solar (sinoidal pura) ──
export function decSun(tt) {
  return DEC_SUN_MAX * Math.sin(2 * Math.PI * tt / TY);
}

// ── Declinación lunar con ecuación del centro ──
export function decMoon(tt, moonOffset = 0, lunarNodal = false) {
  const env = lunarNodal ? moonMaxDec(tt) : DEC_MOON_MAX;
  const phase = 2 * Math.PI * (tt + moonOffset) / TM;
  const Mm = 2 * Math.PI * ((tt % TM) / TM);
  const eqCenter = 6.289 * Math.sin(Mm)
                 + 1.274 * Math.sin(2 * phase - Mm)
                 + 0.658 * Math.sin(2 * phase);
  return env * Math.sin(phase) + eqCenter * 0.1;
}

// ── Ángulo horario solar ──
export function angleSun(tt, forcePrecise = false) {
  const tphase = forcePrecise ? (tt + eotMinutes(tt) / 1440) : tt;
  return 2 * Math.PI * (((tphase % DAY_SUN) + DAY_SUN) % DAY_SUN) / DAY_SUN;
}

// ── Ángulo horario lunar ──
export function angleMoon(tt) {
  return 2 * Math.PI * (((tt % DAY_MOON) + DAY_MOON) % DAY_MOON) / DAY_MOON;
}

// ── Iluminación lunar (0=nueva, 1=llena) ──
export function lunarIllumination(tt, moonOffset = 0) {
  const elong = angleMoon(tt) - angleSun(tt);
  return (1 + Math.cos(elong)) / 2;
}

// ── Nombre de fase ──
export function lunarPhaseName(illum) {
  if (illum < 0.03) return 'Luna nueva';
  if (illum < 0.22) return 'Creciente';
  if (illum < 0.28) return 'Cuarto creciente';
  if (illum < 0.47) return 'Gibosa creciente';
  if (illum < 0.53) return 'Luna llena';
  if (illum < 0.72) return 'Gibosa menguante';
  if (illum < 0.78) return 'Cuarto menguante';
  if (illum < 0.97) return 'Menguante';
  return 'Luna nueva';
}

// ── Detección de eclipses ──
export function detectEclipse(tt, moonOffset = 0, lunarNodal = false) {
  const dS = decSun(tt), dM = decMoon(tt, moonOffset, lunarNodal);
  const aS = angleSun(tt), aM = angleMoon(tt);
  const decDiff = Math.abs(dS - dM);
  let sep = Math.abs(aS - aM);
  if (sep > Math.PI) sep = 2 * Math.PI - sep;

  if (decDiff < 2.5 && sep < 0.25) {
    return { type: 'solar', proximity: 1 - (decDiff / 2.5 + sep / 0.25) / 2 };
  }
  const antiSep = Math.abs(sep - Math.PI);
  if (decDiff < 3.0 && antiSep < 0.3) {
    return { type: 'lunar', proximity: 1 - (decDiff / 3.0 + antiSep / 0.3) / 2 };
  }
  return null;
}

// ── Longitud eclíptica simplificada ──
export function eclipticLongitude(tt) {
  return (((tt % TY) + TY) % TY) / TY * 360;
}

// ── Signo zodiacal ──
export function zodiacSign(lon) {
  const signs = ['Aries','Tauro','Géminis','Cáncer','Leo','Virgo',
                 'Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'];
  return signs[Math.floor(((lon % 360) + 360) % 360 / 30)];
}

// ── t → fecha real ──
export function tToDate(tt) {
  return new Date(BASE_DATE.getTime() + tt * 86400000);
}

// ── Formato de fecha ──
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function formatDate(d) {
  return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
}

export function formatDateFull(d) {
  return d.getDate() + ' de ' + MESES_FULL[d.getMonth()] + ' ' + d.getFullYear();
}
