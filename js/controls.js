// ═══════════════════════════════════════════
// controls.js — UI, eventos, readouts
// Vincula los controles HTML con el estado
// ═══════════════════════════════════════════

import * as Astro from './astronomy.js';

export class Controls {
  constructor() {
    // ── Elementos DOM ──
    this.playBtn       = document.getElementById('playBtn');
    this.resetBtn      = document.getElementById('resetBtn');
    this.speedEl       = document.getElementById('speed');
    this.speedVal      = document.getElementById('speedVal');
    this.dayInput      = document.getElementById('dayInput');
    this.moonOffsetEl  = document.getElementById('moonOffset');
    this.moonOffsetVal = document.getElementById('moonOffsetVal');

    this.preciseSunEl  = document.getElementById('preciseSun');
    this.lunarNodalEl  = document.getElementById('lunarNodal');
    this.showSunTrailEl  = document.getElementById('showSunTrail');
    this.showMoonTrailEl = document.getElementById('showMoonTrail');

    this.trailLenEl    = document.getElementById('trailLen');
    this.trailLenVal   = document.getElementById('trailLenVal');

    this.analemaHourEl  = document.getElementById('analemaHour');
    this.analemaHourVal = document.getElementById('analemaHourVal');
    this.traceAnalemaBtn = document.getElementById('traceAnalemaBtn');
    this.clearAnalemaBtn = document.getElementById('clearAnalemaBtn');
    this.showAnalemaEl   = document.getElementById('showAnalema');

    // Readouts
    this.rDate       = document.getElementById('rDate');
    this.rSunDay     = document.getElementById('rSunDay');
    this.rMoonDay    = document.getElementById('rMoonDay');
    this.rSunDec     = document.getElementById('rSunDec');
    this.rMoonDec    = document.getElementById('rMoonDec');
    this.rEot        = document.getElementById('rEot');
    this.rMoonEnv    = document.getElementById('rMoonEnv');
    this.rMoonPhase  = document.getElementById('rMoonPhase');
    this.rMoonIllum  = document.getElementById('rMoonIllum');
    this.rZodiac     = document.getElementById('rZodiac');
    this.rEclipse    = document.getElementById('rEclipse');

    // ── Estado ──
    this.playing       = false;
    this.speed         = 6;
    this.moonOffset    = 0;
    this.preciseSun    = true;
    this.lunarNodal    = true;
    this.showSunTrail  = true;
    this.showMoonTrail = true;
    this.trailMax      = 3000;
    this.showAnalema   = true;
    this.analemaHour   = 12;

    // ── Flags de una sola vez ──
    this._flagReset       = false;
    this._flagDayJump     = null;
    this._flagSunClear    = false;
    this._flagMoonClear   = false;
    this._flagTraceAnalema = false;
    this._flagClearAnalema = false;

    this._bind();
  }

  // ── Vinculación de eventos ──
  _bind() {
    this.playBtn.addEventListener('click', () => {
      this.playing = !this.playing;
      this.playBtn.textContent = this.playing ? '❚❚ Pausar' : '▶ Reproducir';
    });

    this.resetBtn.addEventListener('click', () => { this._flagReset = true; });

    this.speedEl.addEventListener('input', () => {
      this.speed = parseFloat(this.speedEl.value);
      this.speedVal.textContent = this.speed.toFixed(1) + ' d/s';
    });

    this.dayInput.addEventListener('change', () => {
      this._flagDayJump = parseFloat(this.dayInput.value) || 0;
    });

    this.moonOffsetEl.addEventListener('input', () => {
      this.moonOffset = parseFloat(this.moonOffsetEl.value);
      this.moonOffsetVal.textContent = this.moonOffset.toFixed(1) + ' d';
      this._flagMoonClear = true;
    });

    this.preciseSunEl.addEventListener('change', e => {
      this.preciseSun = e.target.checked; this._flagSunClear = true;
    });
    this.lunarNodalEl.addEventListener('change', e => {
      this.lunarNodal = e.target.checked; this._flagMoonClear = true;
    });
    this.showSunTrailEl.addEventListener('change', e => {
      this.showSunTrail = e.target.checked;
    });
    this.showMoonTrailEl.addEventListener('change', e => {
      this.showMoonTrail = e.target.checked;
    });

    this.trailLenEl.addEventListener('input', () => {
      this.trailMax = parseInt(this.trailLenEl.value);
      this.trailLenVal.textContent = this.trailMax;
    });

    this.analemaHourEl.addEventListener('input', () => {
      this.analemaHour = parseFloat(this.analemaHourEl.value);
      const hh = Math.floor(this.analemaHour);
      const mm = Math.round((this.analemaHour - hh) * 60);
      this.analemaHourVal.textContent =
        String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    });

    this.traceAnalemaBtn.addEventListener('click', () => {
      if (!this.preciseSun) {
        this.preciseSun = true; this.preciseSunEl.checked = true;
        this._flagSunClear = true;
      }
      this.showAnalema = true; this.showAnalemaEl.checked = true;
      this._flagTraceAnalema = true;
    });

    this.clearAnalemaBtn.addEventListener('click', () => {
      this._flagClearAnalema = true;
    });

    this.showAnalemaEl.addEventListener('change', e => {
      this.showAnalema = e.target.checked;
    });
  }

  // ── Consumir flags (una sola vez) ──
  consumeReset()        { if (this._flagReset)        { this._flagReset = false;        return true; } return false; }
  consumeDayJump()      { if (this._flagDayJump !== null) { const v = this._flagDayJump; this._flagDayJump = null; return v; } return null; }
  consumeSunClear()     { if (this._flagSunClear)      { this._flagSunClear = false;      return true; } return false; }
  consumeMoonClear()    { if (this._flagMoonClear)     { this._flagMoonClear = false;     return true; } return false; }
  consumeTraceAnalema() { if (this._flagTraceAnalema)  { this._flagTraceAnalema = false;  return true; } return false; }
  consumeClearAnalema() { if (this._flagClearAnalema)  { this._flagClearAnalema = false;  return true; } return false; }

  // ── Actualizar readouts ──
  updateReadouts(state) {
    const { t, dS, dM, eclipse, illumination } = state;

    this.rDate.textContent = Astro.formatDateFull(Astro.tToDate(t));

    const sunPct = (((t % Astro.TY) + Astro.TY) % Astro.TY) / Astro.TY * 100;
    this.rSunDay.textContent = t.toFixed(1) + ' (' + sunPct.toFixed(1) + '%)';

    const moonPct = ((((t + this.moonOffset) % Astro.TM) + Astro.TM) % Astro.TM) / Astro.TM * 100;
    this.rMoonDay.textContent = (t + this.moonOffset).toFixed(1) + ' (' + moonPct.toFixed(1) + '%)';

    this.rSunDec.textContent = dS.toFixed(2) + '°';
    this.rMoonDec.textContent = dM.toFixed(2) + '°';

    const eot = Astro.eotMinutes(t);
    this.rEot.textContent = (eot >= 0 ? '+' : '') + eot.toFixed(1) + ' min';

    const env = this.lunarNodal ? Astro.moonMaxDec(t) : Astro.DEC_MOON_MAX;
    this.rMoonEnv.textContent = env.toFixed(2) + '°';

    this.rMoonPhase.textContent = Astro.lunarPhaseName(illumination);
    this.rMoonIllum.textContent = (illumination * 100).toFixed(0) + '%';

    this.rZodiac.textContent = Astro.zodiacSign(Astro.eclipticLongitude(t));

    if (eclipse) {
      this.rEclipse.textContent = eclipse.type === 'solar' ? '☀ Solar' : '🌑 Lunar';
      this.rEclipse.style.color = eclipse.type === 'solar' ? '#E7B24B' : '#AFCBE0';
    } else {
      this.rEclipse.textContent = 'Ninguno';
      this.rEclipse.style.color = '';
    }

    this.dayInput.value = t.toFixed(1);
  }
}
