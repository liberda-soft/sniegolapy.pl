(() => {
  'use strict';

  const D = window.SNIEGOLAPY;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const byId = (list, id) => list.find((x) => String(x.id) === String(id)) || list[0];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const f = (n) => Math.round(n * 10) / 10;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pln = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
  const num1 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });
  const fmtLen = (v) => num1.format(v);
  const plural = (n, one, few, many) => {
    if (n === 1) return one;
    const d = n % 10, h = n % 100;
    return d >= 2 && d <= 4 && (h < 10 || h >= 20) ? few : many;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* tryb prywatny – trudno */ }
    },
  };

  /* ---------- kolory ---------- */
  const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => {
    const A = hexToRgb(a), B = hexToRgb(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const lighten = (h, t) => mix(h, '#ffffff', t);
  const darken = (h, t) => mix(h, '#000000', t);
  const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const ICON = {
    check: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 6.2 2.3 2.3 4.7-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* =========================================================
   * Stan konfiguratora
   * ======================================================= */
  const MAX_SLOPES = 8;
  const DEFAULT = { roof: 'dachowka', system: 'r2', color: '7024', zone: 2, pitch: 35, slopes: [{ length: 10, rows: 1 }] };
  const clampLen = (v) => Math.round(clamp(Number(v) || 0, 0.5, 200) * 10) / 10;

  function sanitize(s) {
    const out = Object.assign({}, DEFAULT, s || {});
    out.roof = byId(D.roofs, out.roof).id;
    out.system = byId(D.systems, out.system).id;
    out.color = byId(D.colors, out.color).id;
    out.zone = byId(D.zones, Number(out.zone)).id;
    out.pitch = clamp(Math.round(Number(out.pitch) || 35), 10, 70);
    const slopes = Array.isArray(out.slopes) && out.slopes.length ? out.slopes : DEFAULT.slopes;
    out.slopes = slopes.slice(0, MAX_SLOPES).map((x) => ({ length: clampLen(x.length), rows: clamp(Math.round(Number(x.rows) || 1), 1, 4) }));
    return out;
  }

  // link do konfiguracji: ?k=dachowka~r2~7024~2~35~10x1_6x2
  function shareCode(s) {
    return [s.roof, s.system, s.color, s.zone, s.pitch, s.slopes.map((x) => `${x.length}x${x.rows}`).join('_')].join('~');
  }
  function parseShare(code) {
    if (!code) return null;
    const [roof, system, color, zone, pitch, slopes] = code.split('~');
    if (!slopes) return null;
    return {
      roof, system, color, zone, pitch,
      slopes: slopes.split('_').map((p) => { const [length, rows] = p.split('x'); return { length, rows }; }),
    };
  }

  const state = sanitize(parseShare(new URLSearchParams(location.search).get('k')) || store.get('sg-config', null));

  /* =========================================================
   * Obliczenia zestawu
   * ======================================================= */
  function calc() {
    const roof = byId(D.roofs, state.roof);
    const sys = byId(D.systems, state.system);
    const zone = byId(D.zones, state.zone);
    const color = byId(D.colors, state.color);
    const spacing = Math.max(0.4, zone.spacing - (state.pitch >= 45 ? 0.1 : 0));
    const P = D.pipeLength;
    const pr = D.prices;

    let pipes = 0, connectors = 0, caps = 0, brackets = 0, rowMeters = 0;
    state.slopes.forEach((s) => {
      const seg = Math.ceil(s.length / P - 1e-9);
      pipes += sys.tubes * seg * s.rows;
      connectors += sys.tubes * (seg - 1) * s.rows;
      caps += sys.tubes * 2 * s.rows;
      brackets += (Math.ceil(s.length / spacing - 1e-9) + 1) * s.rows;
      rowMeters += s.length * s.rows;
    });
    const screws = brackets * roof.screws;
    const bracketPrice = roof.bracketPrice + sys.bracketExtra;
    const cm = Math.round(spacing * 100);

    const lines = [
      { name: roof.mount, note: `rozstaw ok. ${cm} cm`, qty: brackets, price: brackets * bracketPrice },
      { name: `Rura Ø25 mm, ${fmtLen(P)} m`, note: 'docinana na wymiar', qty: pipes, price: pipes * pr.pipe },
      { name: 'Łącznik rur', qty: connectors, price: connectors * pr.connector },
      { name: 'Zaślepka rury', qty: caps, price: caps * pr.endcap },
      { name: 'Wkręt montażowy z uszczelką', qty: screws, price: screws * pr.screw },
    ].filter((l) => l.qty > 0);

    const total = lines.reduce((a, l) => a + l.price, 0);
    const suggestedRows = clamp(1 + (state.zone >= 3 ? 1 : 0) + (state.pitch >= 45 ? 1 : 0), 1, 3);
    return { roof, sys, zone, color, spacing, cm, lines, total, rowMeters, suggestedRows };
  }

  /* =========================================================
   * Ikony pokryć (profil)
   * ======================================================= */
  function roofIcon(r) {
    const st = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
    let d = '';
    switch (r.kind) {
      case 'seam': d = 'M3 28H69M14 28V13h3v15M34 28V13h3v15M54 28V13h3v15'; break;
      case 'tile': d = 'M3 24q8.5-13 17 0t17 0t17 0t17 0'; break;
      case 'beaver': d = 'M4 14a6 6 0 0 0 12 0a6 6 0 0 0 12 0a6 6 0 0 0 12 0a6 6 0 0 0 12 0a6 6 0 0 0 12 0M10 26a6 6 0 0 0 12 0a6 6 0 0 0 12 0a6 6 0 0 0 12 0a6 6 0 0 0 12 0'; break;
      case 'flat': d = 'M3 10H69M3 20H69M3 30H69M17 10v10M41 10v10M65 10v10M29 20v10M53 20v10'; break;
      default: {
        // blachodachówka / panel: schodki zależne od modułu i przetłoczenia
        const m = r.module / 22, h = r.step / 5;
        let x = 3, y = 31;
        d = `M${x} ${y}`;
        while (x + m < 70) {
          d += r.kind === 'panel' ? `H${f(x + m)}` : `Q${f(x + m / 2)} ${f(y + 1.8)} ${f(x + m)} ${f(y)}`;
          x += m; y -= h;
          d += `V${f(y)}`;
        }
        d += `H70`;
      }
    }
    return `<svg viewBox="0 0 72 34" aria-hidden="true"><path d="${d}" ${st}/></svg>`;
  }

  function systemIcon(tubes) {
    let s = '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M8 38h18M22 38V8l5-3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    for (let i = 0; i < tubes; i++) s += `<circle cx="26" cy="${31 - i * 9}" r="3.6" fill="currentColor"/>`;
    return s + '</svg>';
  }

  /* =========================================================
   * Render opcji
   * ======================================================= */
  const roofSub = (r) => (r.module ? `moduł ${r.module} · przetłoczenie ${r.step} mm` : r.mount);
  const roofText = (r) => `<span class="dd-text"><b>${esc(r.name)}</b><small>${esc(roofSub(r))}</small></span>`;

  function renderRoofs() {
    $('[data-roofs]').innerHTML = D.roofs.map((r) => `
      <label class="dd-opt">
        <input type="radio" name="roof" value="${r.id}" ${r.id === state.roof ? 'checked' : ''}>
        <span class="dd-opt-box">
          <span class="roof-icon">${roofIcon(r)}</span>
          ${roofText(r)}
          <span class="opt-check">${ICON.check}</span>
        </span>
      </label>`).join('');
  }

  function renderSystems() {
    $('[data-systems]').innerHTML = D.systems.map((s) => `
      <label class="opt system-opt">
        <input type="radio" name="system" value="${s.id}" ${s.id === state.system ? 'checked' : ''}>
        <span class="opt-box">
          <span class="opt-check">${ICON.check}</span>
          <span class="system-icon">${systemIcon(s.tubes)}</span>
          <span><span class="opt-title">${esc(s.short || s.name)}</span><small>${esc(s.hint || s.desc)}</small></span>
        </span>
      </label>`).join('');
  }

  function renderColors() {
    $('[data-colors]').innerHTML = D.colors.map((c) => `
      <label class="ral-dot" title="${esc(c.name)} ~${esc(c.ral)}">
        <input type="radio" name="color" value="${c.id}" ${c.id === state.color ? 'checked' : ''} aria-label="${esc(c.name)} ${esc(c.ral)}">
        <span class="ral-swatch" style="--c:${c.hex}"></span>
        <span class="ral-num">${esc(c.ral.replace(/^RAL\s*/, ''))}</span>
      </label>`).join('');
  }

  // rozwijana lista pokryć
  function bindRoofDropdown() {
    const dd = $('[data-dd]'), btn = $('[data-dd-btn]');
    const setOpen = (open) => {
      dd.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', () => setOpen(!dd.classList.contains('is-open')));
    $('[data-roofs]').addEventListener('click', (e) => {
      if (e.target.closest('.dd-opt')) setTimeout(() => { setOpen(false); btn.focus(); }, 120);
    });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) setOpen(false); });
    dd.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && e.target.name === 'roof')) {
        e.preventDefault();
        setOpen(false);
        btn.focus();
      }
    });
  }

  function renderZones() {
    $('[data-zones]').innerHTML = D.zones.map((z) => `
      <label><input type="radio" name="zone" value="${z.id}" ${z.id === state.zone ? 'checked' : ''}><span>${z.id}</span></label>`).join('');
  }

  function renderSlopes() {
    const one = state.slopes.length === 1;
    $('[data-slopes]').innerHTML = state.slopes.map((s, i) => `
      <div class="slope" data-i="${i}">
        <div class="slope-name">Połać ${i + 1}<small data-slope-meta></small></div>
        <div class="slope-field slope-len">
          <span>Długość okapu</span>
          <div class="stepper stepper-len">
            <button type="button" data-len="-0.5" aria-label="Zmniejsz długość">${ICON.minus}</button>
            <input type="text" inputmode="decimal" value="${fmtLen(s.length)}" aria-label="Długość okapu połaci ${i + 1} w metrach" data-len-input>
            <span class="unit">m</span>
            <button type="button" data-len="0.5" aria-label="Zwiększ długość">${ICON.plus}</button>
          </div>
        </div>
        <div class="slope-field slope-rows">
          <span>Rzędy</span>
          <div class="stepper stepper-rows">
            <button type="button" data-rows="-1" aria-label="Mniej rzędów">${ICON.minus}</button>
            <input type="text" value="${s.rows}" readonly tabindex="-1" aria-label="Liczba rzędów połaci ${i + 1}" data-rows-input>
            <button type="button" data-rows="1" aria-label="Więcej rzędów">${ICON.plus}</button>
          </div>
        </div>
        <button type="button" class="icon-btn slope-remove" data-remove aria-label="Usuń połać ${i + 1}" ${one ? 'style="visibility:hidden" tabindex="-1"' : ''}>${ICON.trash}</button>
      </div>`).join('');
    $('[data-add-slope]').disabled = state.slopes.length >= MAX_SLOPES;
  }

  /* =========================================================
   * Podgląd dachu (SVG)
   * ======================================================= */
  // Dom z dachem dwuspadowym w perspektywie jednopunktowej: kamera z przodu po lewej, nad kalenicą.
  // Okap i rzędy pokrycia są poziome, linie spadku zbiegają się – jak na zdjęciu (odbitym lustrzanie).
  // 3D: X wzdłuż okapu, Y w górę, Z w głąb. Szczyt z balkonem po lewej (X = 0).
  const rad = (d) => d * Math.PI / 180;
  // skala: 1 m ≈ 40 jednostek – dom ok. 11 × 8,5 m, okap ok. 2,75 m nad terenem, poddasze użytkowe
  const H = { W: 440, D: 340, ovF: 22, ovG: 26, pitch: 45, ground: -110 };
  H.sa = Math.sin(rad(H.pitch));
  H.ca = Math.cos(rad(H.pitch));
  H.tan = Math.tan(rad(H.pitch));
  H.slant = (H.D / 2 + H.ovF) / H.ca;
  H.rise = (H.D / 2 + H.ovF) * H.tan;
  const roofY = (z) => (z + H.ovF) * H.tan;
  const zToS = (z) => (z + H.ovF) / H.ca;
  // kamera nisko (jak przy zdjęciu z ziemi), obrócona w stronę domu; pionowe linie zostają pionowe
  const CAM = { x: -300, y: -40, z: -650 };
  const VIEW = { w: 640, h: 440 };
  const FWD = (() => { const l = Math.hypot(600, 770); return [600 / l, 770 / l]; })();
  const depth = (X, Z) => (X - CAM.x) * FWD[0] + (Z - CAM.z) * FWD[1];
  const raw = (X, Y, Z) => {
    const d = depth(X, Z);
    return [((X - CAM.x) * FWD[1] - (Z - CAM.z) * FWD[0]) / d, -(Y - CAM.y) / d];
  };
  const FIT = (() => {
    const probe = [[-H.ovG, 0, -H.ovF], [H.W + H.ovG, 0, -H.ovF], [-H.ovG, H.rise, H.D / 2], [H.W + H.ovG, H.rise, H.D / 2],
      [306, 300, 126], [-50, -6, 98], [-50, -6, 242], [0, H.ground, H.D], [H.W, H.ground, 0], [-H.ovG, 0, H.D + H.ovF]].map((p) => raw(...p));
    const xs = probe.map((p) => p[0]), ys = probe.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((VIEW.w - 28) / (x1 - x0), (VIEW.h - 24) / (y1 - y0));
    return { k, ox: VIEW.w / 2 - k * (x0 + x1) / 2, oy: 24 - k * y0 };
  })();
  const P = (X, Y, Z) => { const [a, b] = raw(X, Y, Z); return [f(FIT.ox + FIT.k * a), f(FIT.oy + FIT.k * b)]; };
  // punkt na połaci: u wzdłuż okapu, s – odległość od okapu po spadku, h – wysokość nad pokryciem
  const SP3 = (u, s, h = 0) => [u, s * H.sa + h * H.ca, -H.ovF + s * H.ca - h * H.sa];
  const SP = (u, s, h = 0) => P(...SP3(u, s, h));
  const scAt = (s, u = H.W / 2) => { const [X, , Z] = SP3(u, s); return FIT.k / depth(X, Z); };
  const ptsStr = (arr) => arr.map((p) => p.join(',')).join(' ');
  const poly = (arr, fill, extra = '') => `<polygon points="${ptsStr(arr)}" fill="${fill}" ${extra}/>`;
  const seg = (a, b, stroke, w, extra = '') => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${stroke}" stroke-width="${f3(w)}" stroke-linecap="round" ${extra}/>`;
  const quadS = (u0, s0, u1, s1, h = 0) => [SP(u0, s0, h), SP(u1, s0, h), SP(u1, s1, h), SP(u0, s1, h)];
  const f3 = (n) => Math.round(n * 100) / 100;
  // gładka zamknięta ścieżka przez punkty (krzywe przez środki odcinków)
  const smooth = (p) => {
    const m = (a, b) => [f((a[0] + b[0]) / 2), f((a[1] + b[1]) / 2)];
    let d = `M${m(p[p.length - 1], p[0]).join(' ')}`;
    p.forEach((q, i) => { d += `Q${q.join(' ')} ${m(q, p[(i + 1) % p.length]).join(' ')}`; });
    return d + 'Z';
  };

  // elementy na dachu
  const CH = { x0: 290, x1: 322, z0: 112, z1: 140, top: 248 };
  const STEP = { u: 348, w: 20 };
  // okna dachowe pod kominem; przez prawe wychodzi się na dach – od jego dołu zaczynają się stopnie
  const WINDOWS = [[236, 92, 276, 146], [290, 92, 330, 146]];
  // balkon w szczycie: wysięg 1,2 m, szerokość 3,6 m, barierka 1,1 m; drzwi balkonowe 1,6 × 2,2 m
  const BAL = { x0: -48, z0: 98, z1: 242, y: 6, th: 10, rail: 44 };
  const pipeH = (t) => 4 + t * 5;

  function sceneDefs(hex) {
    return `
      <radialGradient id="gGlow" cx="50%" cy="40%" r="62%"><stop offset="0" stop-color="#dfe9f1"/><stop offset=".6" stop-color="#e8eff4" stop-opacity=".6"/><stop offset="1" stop-color="#f2f3f0" stop-opacity="0"/></radialGradient>
      <linearGradient id="gDrift" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".4" stop-color="#fff" stop-opacity=".92"/><stop offset="1" stop-color="#eef3f7"/></linearGradient>
      <linearGradient id="gSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe8f0"/></linearGradient>
      <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6eff5"/><stop offset=".55" stop-color="#b7cad8"/><stop offset="1" stop-color="#8fa6b8"/></linearGradient>
      <linearGradient id="gGlassR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe0ec"/><stop offset="1" stop-color="#6f8799"/></linearGradient>
      <linearGradient id="gTile" x1="0" x2="1"><stop offset="0" stop-color="${darken(hex, .32)}"/><stop offset=".38" stop-color="${lighten(hex, .2)}"/><stop offset=".62" stop-color="${hex}"/><stop offset="1" stop-color="${darken(hex, .38)}"/></linearGradient>
      <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>
      <linearGradient id="gRoofLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
      <filter id="fBlur" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>`;
  }

  /* ---------- pokrycie połaci (rysowane w perspektywie, element po elemencie) ---------- */
  const surfaceCache = new Map();
  function roofSurface(roof, hex) {
    const key = `${roof.id}|${hex}`;
    if (surfaceCache.has(key)) return surfaceCache.get(key);
    const u0 = -H.ovG - 4, u1 = H.W + H.ovG + 4, S = H.slant + 2;
    const dk = (t) => darken(hex, t), lt = (t) => lighten(hex, t);
    const rand = rng(11);
    let s = poly(quadS(u0, -2, u1, S), roof.kind === 'flat' || roof.kind === 'beaver' ? dk(.45) : hex);

    if (roof.kind === 'flat') { // łupek / gont – przesunięte rzędy płytek
      const rh = 12, tw = 22;
      for (let r = 0, y = -2; y < S; r++, y += rh) {
        const off = (r % 2) * tw / 2;
        for (let x = u0 - off; x < u1; x += tw) {
          const c = mix(hex, rand() > .5 ? '#ffffff' : '#000000', rand() * .14);
          s += poly(quadS(x + .7, y + .4, x + tw - .7, y + rh), c);
        }
        s += poly(quadS(u0, y - 1.4, u1, y + .4), dk(.55), 'opacity=".55"');
      }
    } else if (roof.kind === 'tile') { // dachówka – zaokrąglone dolne krawędzie
      const rh = 16, tw = 21;
      for (let y = -2; y < S; y += rh) {
        for (let x = u0 - 4; x < u1; x += tw) {
          const pts = [];
          for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(SP(x + tw * t, y - 2.6 * Math.sin(Math.PI * t))); }
          pts.push(SP(x + tw, y + rh + 5), SP(x, y + rh + 5));
          s += poly(pts, 'url(#gTile)', `stroke="${dk(.5)}" stroke-width=".5"`);
        }
      }
    } else if (roof.kind === 'beaver') { // karpiówka – drobne, zaokrąglone, przesunięte
      const rh = 8.5, tw = 12;
      for (let r = 0, y = -2; y < S; r++, y += rh) {
        const off = (r % 2) * tw / 2;
        for (let x = u0 - off; x < u1; x += tw) {
          const c = mix(hex, rand() > .5 ? '#ffffff' : '#000000', rand() * .14);
          const pts = [];
          for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(SP(x + .5 + (tw - 1) * t, y - 3.2 * Math.sin(Math.PI * t))); }
          pts.push(SP(x + tw - .5, y + rh * 2.2), SP(x + .5, y + rh * 2.2));
          s += poly(pts, c, `stroke="${dk(.5)}" stroke-width=".45"`);
        }
      }
    } else if (roof.kind === 'seam') { // rąbek stojący – pionowe rąbki co ok. 0,5 m
      for (let x = u0 + 4; x < u1; x += 27) {
        s += poly(quadS(x, -2, x + 27, S), 'url(#gBand)');
        s += poly(quadS(x, -2, x + 1.8, S, 1.2), lt(.32));
        s += poly(quadS(x + 1.8, -2, x + 2.8, S), dk(.45), 'opacity=".7"');
      }
    } else { // blachodachówka / blacha panelowa – moduły i przetłoczenia
      const rh = roof.module * .052, step = roof.step * .11;
      if (roof.kind === 'sheet') {
        for (let x = u0; x < u1; x += 10) {
          s += seg(SP(x, -2), SP(x, S), lt(.18), 2.4 * scAt(80), 'opacity=".75"');
          s += seg(SP(x + 5, -2), SP(x + 5, S), dk(.28), 1.8 * scAt(80), 'opacity=".55"');
        }
      } else {
        for (let x = u0 + 6; x < u1; x += 38) {
          s += seg(SP(x, -2), SP(x, S), lt(.22), 1.4 * scAt(80), 'opacity=".7"');
          s += seg(SP(x + 1.4, -2), SP(x + 1.4, S), dk(.35), 1 * scAt(80), 'opacity=".5"');
        }
      }
      for (let y = 0; y < S; y += rh) {
        s += poly(quadS(u0, y, u1, y + rh), 'url(#gBand)');
        s += poly(quadS(u0, y, u1, y + step), dk(.55), 'opacity=".8"');
        s += poly(quadS(u0, y + step, u1, y + step + .8), lt(.35), 'opacity=".5"');
      }
    }
    s += poly(quadS(u0, -2, u1, S), 'url(#gRoofLight)');
    surfaceCache.set(key, s);
    return s;
  }

  /* ---------- śnieg i płotek ---------- */
  // zaspa oparta o płotek: dolna krawędź przy rurach, ku górze cienieje do zera
  function drift(u1, u2, sRow, hTop, scale, seed) {
    const r = rng(seed * 31 + 7);
    const n = Math.max(3, Math.round((u2 - u1) / 14));
    const lower = [], upper = [];
    for (let i = 0; i <= n; i++) {
      const u = u1 + (u2 - u1) * i / n;
      const e = Math.min(1, i / 1.6, (n - i) / 1.6);
      lower.push(SP(u, sRow + 1.4, (hTop + 2 + r() * 2.5) * (.3 + .7 * e)));
      upper.push(SP(u, sRow + (20 + 16 * scale) * (.5 + .5 * e) * (.85 + r() * .3), .3));
    }
    const edge = lower.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join('');
    return `<path d="${smooth([...lower, ...upper.reverse()])}" fill="url(#gDrift)"/>`
      + `<path d="${edge}" fill="none" stroke="#b6c7d4" stroke-width="${f3(2.4 * scAt(sRow))}" opacity=".5" filter="url(#fBlur)"/>`;
  }

  // warstwa śniegu zjeżdżająca z góry połaci (przesunięcie liczone wzdłuż spadku) + grudki przy uderzeniu
  function snowSlab(u1, u2, sRow, sStart, hTop, scale, seed, anim) {
    const body = drift(u1, u2, sRow, hTop, scale, seed);
    if (!anim) return [body, ''];
    const um = (u1 + u2) / 2, a = SP(um, sStart), b = SP(um, sRow);
    const hit = anim.delay + anim.dur, sc = scAt(sRow), r = rng(seed * 17 + 3);
    let puffs = '';
    const n = Math.round(clamp((u2 - u1) / 14, 4, 22));
    for (let i = 0; i < n; i++) {
      const p = SP(u1 + 6 + (u2 - u1 - 12) * (i + r() * .8) / n, sRow, hTop + 2);
      puffs += `<circle class="puff" cx="${p[0]}" cy="${p[1]}" r="${f3((1.6 + r() * 2.2) * sc)}" fill="#fff" style="--d:${f(hit + r() * .1)}s;--dx:${f((r() - .5) * 24 * sc)}px;--dy:${f((-7 - r() * 14) * sc)}px"/>`;
    }
    const slab = `<g class="slide" style="--fx:${f(a[0] - b[0])}px;--fy:${f(a[1] - b[1])}px;--d:${anim.delay}s;--t:${anim.dur}s"><g class="squash" style="--d:${f(hit)}s">${body}</g></g>`;
    return [slab, puffs];
  }

  // płotek: cienkie rury na niskich uchwytach; śnieg nad nimi wyznacza jego linię
  function guardRow(u1, u2, sRow, tubes, hex, n, snowTo) {
    const sc = scAt(sRow), hTop = pipeH(tubes - 1);
    const hi = lighten(hex, .55), lo = darken(hex, .32), mid = darken(hex, .12);
    let s = seg(SP(u1, sRow - 1.5), SP(u2, sRow - 1.5), '#000', 3.2 * sc, 'opacity=".22" filter="url(#fBlur)"');
    for (let i = 0; i < n; i++) {
      const u = u1 + 3 + (u2 - u1 - 6) * i / (n - 1);
      s += seg(SP(u, sRow - 2.4), SP(u, sRow, hTop + 1.2), mid, 2 * sc) + seg(SP(u - 2.4, sRow - 2.4), SP(u + 2.4, sRow - 2.4), lo, 1.5 * sc);
    }
    for (let t = 0; t < tubes; t++) {
      const h = pipeH(t);
      s += seg(SP(u1, sRow, h), SP(u2, sRow, h), lo, 3.2 * sc) + seg(SP(u1, sRow, h + .2), SP(u2, sRow, h + .2), hex, 2.2 * sc)
        + seg(SP(u1 + 1, sRow, h + .9), SP(u2 - 1, sRow, h + .9), hi, .7 * sc, 'opacity=".7"');
    }
    if (snowTo) s += seg(SP(u1, sRow - .4, hTop + 1.8), SP(snowTo, sRow - .4, hTop + 1.8), '#fff', 1.4 * sc, 'opacity=".95"');
    return s;
  }

  // stopnie kominiarskie wzdłuż spadku, tuż obok komina; ostatni szerszy – podest przy kominie
  function roofSteps(hex, sFrom, sTo) {
    const n = Math.max(2, Math.round((sTo - sFrom) / 18) + 1);
    const lo = darken(hex, .42), mid = darken(hex, .2), hi = lighten(hex, .55);
    let s = '';
    for (let i = 0; i < n; i++) {
      const y = sFrom + (sTo - sFrom) * i / (n - 1), sc = scAt(y);
      const first = i === 0, last = i === n - 1;
      let uL = STEP.u - STEP.w / 2, uR = STEP.u + STEP.w / 2;
      if (first) uL = WINDOWS[1][2] + 3; // przy wyjściu z okna dachowego
      if (last) { uL = CH.x1 + 4; uR = CH.x1 + 36; } // podest przy kominie
      s += poly(quadS(uL, y - 3, uR, y + 4), '#000', 'opacity=".25" filter="url(#fBlur)"');
      s += seg(SP(uL + 2.5, y + 2), SP(uL + 2.5, y + 2, 5), mid, 1.6 * sc) + seg(SP(uR - 2.5, y + 2), SP(uR - 2.5, y + 2, 5), mid, 1.6 * sc);
      s += poly([SP(uL, y, 5.5), SP(uR, y, 5.5), SP(uR, y + 5, 5.5), SP(uL, y + 5, 5.5)], hex);
      s += poly([SP(uL, y, 5.5), SP(uR, y, 5.5), SP(uR, y, 3.2), SP(uL, y, 3.2)], lo);
      s += seg(SP(uL + .5, y + 4.6, 5.6), SP(uR - .5, y + 4.6, 5.6), hi, .7 * sc, 'opacity=".75"');
    }
    return s;
  }

  // okna dachowe z obróbką i odrobiną śniegu na górnej krawędzi
  function roofWindows() {
    return WINDOWS.map(([u0, s0, u1, s1]) => {
      const sc = scAt(s0);
      return poly(quadS(u0 - 3, s0 - 3, u1 + 3, s1 + 3, .6), '#565c63')
        + poly(quadS(u0, s0, u1, s1, 2.4), '#33383e')
        + poly(quadS(u0 + 3, s0 + 3, u1 - 3, s1 - 3, 2.6), 'url(#gGlassR)')
        + seg(SP(u0 + 8, s0 + 8, 2.7), SP(u1 - 10, s1 - 6, 2.7), '#fff', 3 * sc, 'opacity=".25"')
        + `<path d="${smooth([SP(u0 - 3, s1 + 2.6, 2.8), SP((u0 + u1) / 2, s1 + 3, 4.2), SP(u1 + 3, s1 + 2.6, 2.8), SP(u1 + 1, s1 + 9, .3), SP(u0 - 1, s1 + 9, .3)])}" fill="url(#gSnow)"/>`;
    }).join('');
  }

  // śnieg, który zostaje za kominem (od strony kalenicy) – widać go przy bokach komina
  function snowBehindChimney() {
    const sb = zToS(CH.z1), r = rng(9), lower = [], upper = [];
    for (let u = CH.x0 - 20; u <= CH.x1 + 12; u += 6) {
      const e = Math.min(1, (u - CH.x0 + 20) / 14, (CH.x1 + 12 - u) / 10);
      lower.push(SP(u, sb - 1, (10 + r() * 5) * e));
      upper.push(SP(u, sb + 14 + r() * 6, 0));
    }
    return `<path d="${smooth([...lower, ...upper.reverse()])}" fill="url(#gSnow)"/>`;
  }

  function chimneySVG(roofHex) {
    const { x0, x1, z0, z1, top } = CH;
    const brick = '#a2563e', side = '#7a3f2d', mortar = '#d29a80';
    const yb0 = roofY(z0), yb1 = roofY(z1);
    let s = poly([P(x0, yb0, z0), P(x0, top, z0), P(x0, top, z1), P(x0, yb1, z1)], side);
    s += poly([P(x0, yb0, z0), P(x1, yb0, z0), P(x1, top, z0), P(x0, top, z0)], brick);
    for (let y = top - 7, i = 0; y > yb0; y -= 7, i++) {
      s += seg(P(x0, y, z0), P(x1, y, z0), mortar, .9, 'opacity=".55"');
      for (let x = x0 + (i % 2 ? 5 : 10); x < x1 - 1; x += 10) s += seg(P(x, y, z0), P(x, y + 7, z0), mortar, .8, 'opacity=".4"');
      s += seg(P(x0, y, z0), P(x0, y, Math.min(z1, y / H.tan - H.ovF)), mortar, .8, 'opacity=".3"');
    }
    // obróbka blacharska u podstawy
    s += poly([P(x0 - 2, yb0, z0 - 2), P(x1 + 2, yb0, z0 - 2), P(x1 + 2, yb0 + 6, z0 - 2), P(x0 - 2, yb0 + 6, z0 - 2)], lighten(roofHex, .12));
    s += poly([P(x0 - 2, yb0, z0 - 2), P(x0 - 2, yb1, z1), P(x0 - 2, yb1 + 6, z1), P(x0 - 2, yb0 + 6, z0 - 2)], darken(roofHex, .02));
    // czapa ze śniegiem
    const a = x0 - 3, b = x1 + 3, za = z0 - 3, zb = z1 + 3, t0 = top, t1 = top + 6;
    s += poly([P(a, t0, za), P(b, t0, za), P(b, t0, zb), P(a, t0, zb)], '#262a2f');
    s += poly([P(a, t0, za), P(a, t1, za), P(a, t1, zb), P(a, t0, zb)], '#30353a');
    s += poly([P(a, t0, za), P(b, t0, za), P(b, t1, za), P(a, t1, za)], '#4b5157');
    s += `<path d="${smooth([P(a - 1, t1 - .5, za), P(a + 6, t1 + 5, za + 4), P((a + b) / 2, t1 + 7, za + 6), P(b - 4, t1 + 5, za + 4), P(b + 1, t1 - .5, za), P((a + b) / 2, t1 + 1, za)])}" fill="url(#gSnow)"/>`;
    return s;
  }

  /* ---------- ściany, okna, balkon ---------- */
  function wallsSVG(hex) {
    const { W, D, ground: g } = H, wt = roofY(0), frame = '#2c3136';
    // okno w ścianie frontowej (Z = 0) lub szczytowej (X = 0); a/b – zakres wzdłuż ściany, y0/y1 – dół/góra
    const pt = (side, a, y) => (side === 'front' ? P(a, y, 0) : P(0, y, a));
    const win = (side, a0, a1, y0, y1, parts = 2) => {
      let w = poly([pt(side, a0, y0), pt(side, a1, y0), pt(side, a1, y1), pt(side, a0, y1)], frame);
      w += poly([pt(side, a0 + 3, y0 + 3), pt(side, a1 - 3, y0 + 3), pt(side, a1 - 3, y1 - 3), pt(side, a0 + 3, y1 - 3)], 'url(#gGlass)');
      for (let i = 1; i < parts; i++) { const a = a0 + (a1 - a0) * i / parts; w += seg(pt(side, a, y0 + 3), pt(side, a, y1 - 3), frame, 2.2); }
      w += seg(pt(side, a0 - 2, y0 - .5), pt(side, a1 + 2, y0 - .5), '#c9c3ba', 2.2);
      return w;
    };
    // ściana szczytowa (pięciokąt) z drzwiami balkonowymi na poddaszu i oknem na parterze
    let s = poly([P(0, g, 0), P(0, g, D), P(0, wt, D), P(0, H.rise - 4, D / 2), P(0, wt, 0)], '#e3ddd3');
    s += poly([P(0, g, 0), P(0, g, D), P(0, g + 16, D), P(0, g + 16, 0)], '#9aa0a5');
    s += win('gable', 138, 202, BAL.y, BAL.y + 88, 2);
    s += win('gable', 142, 198, g + 36, g + 96, 2);
    // ściana frontowa: wyjście na taras 2,4 × 2,3 m i dwa okna 1,8 × 1,5 m
    s += poly([P(0, wt, 0), P(W, wt, 0), P(W, g, 0), P(0, g, 0)], '#efebe4');
    s += poly([P(0, g, 0), P(W, g, 0), P(W, g + 16, 0), P(0, g + 16, 0)], '#a3a9ae');
    s += win('front', 56, 152, g + 4, g + 96, 2);
    s += win('front', 208, 280, g + 36, g + 96, 2);
    s += win('front', 322, 394, g + 36, g + 96, 2);
    s += seg(P(0, wt, 0), P(0, g, 0), '#cfc8bd', 1.4);
    // cień pod okapem i pionowa rura spustowa z kolankiem
    s += poly([P(0, wt, 0), P(W, wt, 0), P(W, wt - 16, 0), P(0, wt - 16, 0)], 'rgba(0,0,0,.12)');
    const dp = [P(16, -7, -H.ovF - 5), P(16, -24, -4), P(16, g, -4)];
    s += `<path d="M${dp.map((p) => p.join(' ')).join('L')}" fill="none" stroke="${lighten(hex, .05)}" stroke-width="${f3(4.6 * scAt(0, 16))}" stroke-linejoin="round" stroke-linecap="round"/>`;
    return s;
  }

  function balconySVG() {
    const { x0, z0, z1, y, th, rail } = BAL;
    const sc = scAt(80);
    let s = poly([P(x0, y - th, z0), P(0, y - th, z0), P(0, y - th, z1), P(x0, y - th, z1)], '#30353a');
    s += poly([P(x0, y, z0), P(x0, y, z1), P(x0, y - th, z1), P(x0, y - th, z0)], '#2f3439');
    s += poly([P(x0, y, z0), P(0, y, z0), P(0, y - th, z0), P(x0, y - th, z0)], '#40454b');
    const g = 'fill-opacity=".38" stroke="#8ea3b3" stroke-width=".8"';
    s += poly([P(x0 + 2, y, z0 + 2), P(x0 + 2, y, z1 - 2), P(x0 + 2, y + rail, z1 - 2), P(x0 + 2, y + rail, z0 + 2)], '#d6e6f0', g);
    s += poly([P(x0 + 2, y, z0 + 2), P(-2, y, z0 + 2), P(-2, y + rail, z0 + 2), P(x0 + 2, y + rail, z0 + 2)], '#d6e6f0', g);
    s += seg(P(x0 + 2, y + rail, z1 - 2), P(x0 + 2, y + rail, z0 + 2), '#2f3439', 2.4 * sc) + seg(P(x0 + 2, y + rail, z0 + 2), P(-2, y + rail, z0 + 2), '#2f3439', 2.4 * sc);
    s += seg(P(x0 + 2, y + rail + 1.4, z1 - 2), P(x0 + 2, y + rail + 1.4, z0 + 2), '#fff', 1.2 * sc, 'opacity=".9"');
    return s;
  }

  function sceneSVG(c, animate) {
    const hex = c.color.hex;
    const { W, D, ovF, ovG } = H, S = H.slant;
    const maxRows = Math.max(...state.slopes.map((s) => s.rows));
    const maxLen = Math.max(...state.slopes.map((s) => s.length));
    const tubes = c.sys.tubes, hTop = pipeH(tubes - 1);
    const gap = Math.min(52, (S - 92) / Math.max(1, maxRows - 1));
    const u1 = -ovG + 10, u2 = W + ovG - 10;
    const nBr = clamp(Math.round((u2 - u1) / (c.spacing * 54)) + 1, 5, 24);
    const topRow = maxRows - 1;
    const sChim = zToS(CH.z0);

    const stepR = STEP.u + STEP.w / 2;
    let rows = '';
    for (let k = topRow; k >= 0; k--) {
      const sRow = 24 + k * gap;
      const lower = { delay: 1 + (topRow - 1 - k) * .14, dur: .7 };
      let slabs = '', puffs = '';
      const add = ([sl, pf]) => { slabs += sl; puffs += pf; };
      if (k === topRow) {
        add(snowSlab(u1, CH.x0 - 6, sRow, Math.max(sRow + 6, S - 44), hTop, 1, k + 1, animate && { delay: .35, dur: 1.5 }));
        // pod kominem nic nie zjeżdża (komin zatrzymuje śnieg) – leży tylko niższa, stała zaspa
        add(snowSlab(CH.x0 - 10, stepR + 4, sRow, sRow, hTop, .7, k + 7, false));
        add(snowSlab(stepR, u2, sRow, Math.max(sRow + 6, S - 44), hTop, 1, k + 19, animate && { delay: .5, dur: 1.4 }));
      } else {
        add(snowSlab(u1, u2, sRow, sRow + Math.max(6, gap - 32), hTop, .6, k + 1, animate && lower));
      }
      rows += slabs + guardRow(u1, u2, sRow, tubes, hex, nBr, u2) + puffs;
    }

    // śnieg na kalenicy
    const rnd = rng(5), ridgeUp = [], ridgeDn = [];
    for (let u = -ovG; u <= W + ovG; u += 16) {
      ridgeUp.push(SP(u, S - .5, 5 + rnd() * 3));
      ridgeDn.push(SP(u, S - 9 - rnd() * 5, 0));
    }
    const ridgeSnow = `<path d="${smooth([...ridgeUp, ...ridgeDn.reverse()])}" fill="url(#gSnow)"/>`;

    const edge = darken(hex, .42);
    // deska wiatrowa (krawędź dachu nad szczytem) – przód i tył szczytu
    const verge = (z0, z1) => {
      const a = [], b = [];
      for (let i = 0; i <= 8; i++) { const z = z0 + (z1 - z0) * i / 8, y = z <= D / 2 ? roofY(z) : roofY(D - z); a.push(P(-ovG, y + 1, z)); b.push(P(-ovG, y - 10, z)); }
      return poly([...a, ...b.reverse()], edge);
    };
    const roofPoly = [SP(-ovG, 0), SP(W + ovG, 0), SP(W + ovG, S), SP(-ovG, S)];
    // podbitka: drewniana pod nawisem szczytu, ciemna pod okapem frontowym
    const soffitG = (() => {
      const a = [], b = [];
      for (let i = 0; i <= 12; i++) { const z = -ovF + (D + 2 * ovF) * i / 12, y = (z <= D / 2 ? roofY(z) : roofY(D - z)) - 9; a.push(P(-ovG, y, z)); b.push(P(0, y, z)); }
      const wood = poly([...a, ...b.reverse()], '#9a6b45');
      let lines = '';
      for (let i = 1; i < 12; i++) lines += seg(a[i], b[12 - i], '#7d5536', .8, 'opacity=".5"');
      return wood + lines;
    })();
    const soffitF = poly([P(-ovG, -9, -ovF), P(W + ovG, -9, -ovF), P(W + ovG, roofY(0) - 9, 0), P(-ovG, roofY(0) - 9, 0)], '#3a3f45');
    const dimY = -4, d0 = P(214, dimY, 0), d1 = P(W - 14, dimY, 0), mid = [f((d0[0] + d1[0]) / 2), f((d0[1] + d1[1]) / 2)];
    const label = `${fmtLen(maxLen)} m`, labelW = 22 + label.length * 7.4;
    const gut = (y, z, col, w) => seg(P(-ovG, y, z), P(W + ovG, y, z), col, w * scAt(0));

    return `
      <svg viewBox="0 0 ${VIEW.w} ${VIEW.h}" role="img" aria-label="Podgląd: ${esc(c.sys.name)} w kolorze ${esc(c.color.name)} na pokryciu ${esc(c.roof.name)}, ze stopniami kominiarskimi przy kominie">
        <defs>${sceneDefs(hex)}<clipPath id="cRoof"><polygon points="${ptsStr(roofPoly)}"/></clipPath></defs>
        <ellipse cx="320" cy="190" rx="330" ry="215" fill="url(#gGlow)"/>
        ${wallsSVG(hex)}
        ${soffitF}
        ${soffitG}
        ${verge(D / 2, D + ovF)}
        ${balconySVG()}
        <g clip-path="url(#cRoof)">
          ${roofSurface(c.roof, hex)}
          ${roofWindows()}
          ${snowBehindChimney()}
          ${rows}
          ${roofSteps(hex, WINDOWS[1][1] + 2, sChim + 8)}
        </g>
        ${verge(-ovF, D / 2)}
        ${seg(SP(W + ovG, 0), SP(W + ovG, S), edge, 3)}
        ${seg(SP(-ovG, S), SP(W + ovG, S), edge, 5)}
        ${ridgeSnow}
        ${chimneySVG(hex)}
        ${gut(-3, -ovF - 3, darken(hex, .3), 6)}
        ${gut(-6, -ovF - 6, lighten(hex, .08), 8)}
        ${gut(-4.5, -ovF - 7, lighten(hex, .5), 1.4).replace('/>', ' opacity=".5"/>')}
        <g stroke="#101418" stroke-width="1.1" opacity=".5">
          <path d="M${d0.join(' ')}L${d1.join(' ')}"/>
          <path d="M${d0[0]} ${f(d0[1] - 5)}v10M${d1[0]} ${f(d1[1] - 5)}v10"/>
        </g>
        <rect x="${f(mid[0] - labelW / 2)}" y="${f(mid[1] - 12)}" width="${f(labelW)}" height="24" rx="12" fill="#101418"/>
        <text x="${mid[0]}" y="${f(mid[1] + 4.5)}" text-anchor="middle" font-family="'Barlow Condensed', sans-serif" font-size="16" font-weight="600" letter-spacing=".5" fill="#fff">${label}</text>
      </svg>`;
  }

  // nakładka rysowana raz: dym z komina (nie restartuje się przy zmianach)
  function flakesSVG() {
    const [cx, cy] = P((CH.x0 + CH.x1) / 2, CH.top + 12, (CH.z0 + CH.z1) / 2);
    let s = `<svg class="flakes" viewBox="0 0 ${VIEW.w} ${VIEW.h}" aria-hidden="true" preserveAspectRatio="none">`;
    for (let i = 0; i < 4; i++) s += `<circle class="smoke" cx="${cx}" cy="${cy}" r="6" style="animation-delay:-${f(i * 1.25)}s"/>`;
    return s + '</svg>';
  }

  /* ---------- detal mocowania (przekrój) ---------- */
  function detailSVG(c) {
    const hex = c.color.hex, roof = c.roof, tubes = c.sys.tubes;
    const wood = '#d6b283', woodDk = '#a9845a', screw = '#76808a';
    const yS = 74;
    let back = '', front = '';

    const upright = (x, y) => {
      const H = 20 + (tubes - 1) * 13 + 8;
      let b = `<path d="M${x} ${y}V${y - H}l6 -4" fill="none" stroke="${hex}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
      for (let i = 0; i < tubes; i++) {
        const cy = y - 18 - i * 13;
        b += `<circle cx="${x + 4}" cy="${cy}" r="5.6" fill="${hex}" stroke="${darken(hex, .4)}" stroke-width="1"/><circle cx="${x + 2.4}" cy="${cy - 1.8}" r="1.6" fill="${lighten(hex, .55)}" opacity=".8"/>`;
      }
      return b;
    };
    const screwAt = (x, y, len) => `<path d="M${x} ${y}v${len}" stroke="${screw}" stroke-width="1.8" stroke-linecap="round"/>`;

    if (roof.kind === 'sheet' || roof.kind === 'panel') {
      const h = roof.step / 4.5, mod = roof.module / 5.5;
      const xs = [];
      for (let k = -1; k < 5; k++) xs.push(10 + k * mod);
      const lo = yS + h / 2, hiY = yS - h / 2;
      const rafterTop = lo + 11;
      back += `<rect x="-40" y="${f(rafterTop)}" width="300" height="16" fill="${wood}"/><rect x="-40" y="${f(rafterTop)}" width="300" height="1.5" fill="${woodDk}"/>`;
      xs.forEach((x) => { back += `<rect x="${f(x - 13)}" y="${f(lo + 1.4)}" width="11" height="${f(rafterTop - lo - 1.4)}" fill="${woodDk}"/>`; });
      let d = `M${f(xs[0])} ${f(lo)}`;
      for (let i = 0; i < xs.length - 1; i++) {
        d += `V${f(hiY)}`;
        d += roof.kind === 'panel'
          ? `L${f(xs[i + 1] - 4)} ${f(lo)}H${f(xs[i + 1])}`
          : `Q${f((xs[i] + xs[i + 1]) / 2)} ${f(lo + 1.5)} ${f(xs[i + 1])} ${f(lo)}`;
      }
      back += `<path d="${d}" fill="none" stroke="${hex}" stroke-width="2.6" stroke-linejoin="round"/>`;
      const xb = xs[3] - 7;
      front += `<path d="M${f(xb - 14)} ${f(lo - 2.5)}H${f(xb + 3)}" stroke="${darken(hex, .15)}" stroke-width="3.4" stroke-linecap="round"/>`;
      front += screwAt(f(xb - 10), f(lo - 3), 9) + screwAt(f(xb - 4), f(lo - 3), 9);
      front += upright(f(xb), f(lo - 2.5));
    } else if (roof.kind === 'seam') {
      back += `<rect x="-40" y="${yS + 2}" width="300" height="13" fill="${wood}"/>`;
      for (let x = -30; x < 260; x += 52) back += `<rect x="${x}" y="${yS + 2}" width="1.2" height="13" fill="${woodDk}"/>`;
      back += `<rect x="-40" y="${yS - 11}" width="300" height="11" fill="${lighten(hex, .14)}"/><rect x="-40" y="${yS - 11}" width="300" height="1.6" fill="${darken(hex, .2)}"/>`;
      back += `<rect x="-40" y="${yS}" width="300" height="2.4" fill="${hex}"/>`;
      front += `<rect x="98" y="${yS - 16}" width="24" height="18" rx="2.5" fill="${darken(hex, .12)}" stroke="${darken(hex, .4)}" stroke-width="1"/>`;
      front += `<circle cx="104" cy="${yS - 7}" r="2.1" fill="${screw}"/><circle cx="116" cy="${yS - 7}" r="2.1" fill="${screw}"/>`;
      front += upright(108, yS - 16);
    } else if (roof.kind === 'tile' || roof.kind === 'beaver') {
      const beaver = roof.kind === 'beaver';
      // grubość dachówki = wysokość schodka, więc nos wyższej dachówki leży na niższej
      const h = beaver ? 5 : 8, mod = beaver ? 34 : 56, th = h, tail = beaver ? 22 : 14;
      const xs = [];
      for (let k = -1; k < 7; k++) xs.push(6 + k * mod);
      const lo = yS + h / 2, hiY = yS - h / 2;
      const rafterTop = lo + th + 9;
      back += `<rect x="-40" y="${f(rafterTop)}" width="300" height="16" fill="${wood}"/><rect x="-40" y="${f(rafterTop)}" width="300" height="1.5" fill="${woodDk}"/>`;
      xs.forEach((x) => { back += `<rect x="${f(x + mod + 2)}" y="${f(lo + th + 1)}" width="${beaver ? 9 : 11}" height="${f(rafterTop - lo - th - 1)}" fill="${woodDk}"/>`; });
      const k2 = beaver ? 3 : 2;
      const x2 = xs[k2 + 1];
      back += `<path d="M${f(x2 + 34)} ${f(rafterTop - 1.5)}H${f(x2 + 16)}L${f(x2 + 2)} ${f(lo - .5)}" fill="none" stroke="${hex}" stroke-width="3" stroke-linejoin="round"/>`;
      back += screwAt(f(x2 + 24), f(rafterTop - 2), 8) + screwAt(f(x2 + 31), f(rafterTop - 2), 8);
      xs.forEach((x, i) => {
        const xe = x + mod + tail, slope = h / mod;
        const yEnd = lo + tail * slope;
        const fill = mix(hex, i % 2 ? '#000000' : '#ffffff', .05);
        back += `<path d="M${f(x)} ${f(hiY)}L${f(xe)} ${f(yEnd)}V${f(yEnd + th)}L${f(x + 1.5)} ${f(hiY + th)}Q${f(x - 1)} ${f(hiY + th / 2)} ${f(x)} ${f(hiY)}Z" fill="${fill}" stroke="${darken(hex, .45)}" stroke-width=".8" stroke-linejoin="round"/>`;
        back += `<path d="M${f(x + 1)} ${f(hiY + .6)}L${f(xe - 2)} ${f(yEnd + .6)}" stroke="${lighten(hex, .35)}" stroke-width=".8" opacity=".6"/>`;
      });
      front += `<path d="M${f(x2 + 2)} ${f(lo - .5)}H${f(x2 - 8)}" stroke="${hex}" stroke-width="3" stroke-linecap="round"/>`;
      front += upright(f(x2 - 8), f(lo - .5));
    } else {
      back += `<rect x="-40" y="${yS + 3}" width="300" height="13" fill="${wood}"/>`;
      for (let x = -30; x < 260; x += 52) back += `<rect x="${x}" y="${yS + 3}" width="1.2" height="13" fill="${woodDk}"/>`;
      back += `<rect x="-40" y="${yS}" width="300" height="3.4" fill="${hex}"/>`;
      for (let x = -34; x < 260; x += 30) back += `<rect x="${x}" y="${yS - 1.4}" width="24" height="1.6" fill="${darken(hex, .2)}"/>`;
      front += `<path d="M86 ${yS - 3}H112" stroke="${darken(hex, .12)}" stroke-width="3.4" stroke-linecap="round"/>`;
      front += screwAt(90, yS - 3, 11) + screwAt(98, yS - 3, 11) + screwAt(106, yS - 3, 11);
      front += upright(108, yS - 3);
    }

    return `<svg viewBox="0 0 200 120" aria-hidden="true"><g transform="rotate(-14 100 70) translate(0 6)">${back}${front}</g></svg>`;
  }

  /* =========================================================
   * Aktualizacja widoku konfiguratora
   * ======================================================= */
  let lastCalc = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // intro podglądu: śnieg zsuwa się raz, gdy podgląd pojawi się na ekranie
  let intro = reduceMotion ? 'done' : 'pending'; // pending → playing → done
  let introTimer;
  function playIntro() {
    const scene = $('[data-scene]');
    intro = 'playing';
    scene.classList.remove('is-playing');
    scene.innerHTML = sceneSVG(lastCalc || calc(), true);
    void scene.offsetWidth;
    scene.classList.add('is-playing');
    clearTimeout(introTimer);
    introTimer = setTimeout(() => { intro = 'done'; }, 3200);
  }

  // płynne „przewijanie” kwoty do nowej wartości
  function tweenNumber(el, to, fmt) {
    const from = el.dataset.v === undefined ? to : Number(el.dataset.v);
    el.dataset.v = to;
    cancelAnimationFrame(el._raf);
    if (from === to || reduceMotion) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 500);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  }

  function update(fromUser = true) {
    const c = calc();
    lastCalc = c;
    if (fromUser && intro !== 'done') {
      intro = 'done';
      clearTimeout(introTimer);
    }

    // notka o mocowaniu
    $('[data-dd-btn]').innerHTML = `<span class="roof-icon">${roofIcon(c.roof)}</span><span class="dd-text"><small>${esc(c.roof.kicker)}</small><b>${esc(c.roof.title)}</b></span><span class="dd-chev"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    $('[data-ral-name]').innerHTML = `<b>${esc(c.color.name)}</b> · ${esc(c.color.ral)}`;


    // podgląd
    $('[data-scene]').innerHTML = sceneSVG(c, intro === 'pending');
    $('[data-detail]').innerHTML = detailSVG(c);
    $('[data-detail-name]').textContent = c.roof.mount;
    $('[data-detail-desc]').textContent = c.roof.mountDesc;

    // strefa i kąt
    const z = c.zone;
    $('[data-zone-hint]').textContent = `Strefa ${z.id}: ${z.hint} Dokładną strefę podaje projekt budynku.`;
    const pitch = $('[data-pitch]');
    pitch.value = state.pitch;
    pitch.style.setProperty('--p', `${((state.pitch - 10) / 60) * 100}%`);
    $('[data-pitch-out]').textContent = `${state.pitch}°`;

    // rekomendacja
    const n = c.suggestedRows;
    const needs = state.slopes.some((s) => s.rows < n);
    $('[data-reco]').innerHTML = `
      <div class="reco-item"><span>Rozstaw uchwytów</span><strong>ok. ${c.cm} cm</strong></div>
      <div class="reco-item"><span>Sugerowane rzędy</span><strong>${n} ${plural(n, 'rząd', 'rzędy', 'rzędów')}</strong></div>
      ${needs
        ? `<button class="btn btn-sm" type="button" data-apply-rows="${n}">Ustaw ${n} na wszystkich połaciach</button>`
        : `<span class="reco-ok">${ICON.ok}Zgodnie z sugestią</span>`}
      <p class="reco-foot">Wartości orientacyjne. Przy połaciach dłuższych niż ok. 7 m warto dodać rząd. Ostateczny rozstaw dopasujemy do krokwi i łat.</p>`;

    // meta przy połaciach
    $$('[data-slopes] .slope').forEach((el, i) => {
      const s = state.slopes[i];
      if (!s) return;
      $('[data-slope-meta]', el).textContent = `${fmtLen(s.length * s.rows)} m płotka`;
      $('[data-rows-input]', el).value = s.rows;
    });

    // zestawienie
    const showP = D.showPrices;
    $('.bom').classList.toggle('no-prices', !showP);
    $('[data-bom]').innerHTML = c.lines.map((l) => `
      <tr>
        <td>${esc(l.name)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</td>
        <td>${l.qty} szt.</td>
        <td>${pln.format(l.price)}</td>
      </tr>`).join('');
    const slopesN = state.slopes.length;
    $('[data-sum-length]').textContent = `${fmtLen(c.rowMeters)} m płotka · ${slopesN} ${plural(slopesN, 'połać', 'połacie', 'połaci')}`;
    if (showP) tweenNumber($('[data-total]'), c.total, pln.format);
    else $('[data-total]').textContent = 'Wycena indywidualna';
    $('[data-total-label]').textContent = showP ? 'Wartość orientacyjna' : 'Cena';
    $('[data-total-note]').textContent = showP
      ? 'Cena brutto bez dostawy. Dokładną wycenę wyślemy po zapytaniu.'
      : 'Wyślij zapytanie – odpowiemy z ceną i kosztem dostawy.';

    // pasek mobilny
    $('[data-mb-label]').textContent = `${c.sys.name} · ${fmtLen(c.rowMeters)} m`;
    if (showP) tweenNumber($('[data-mb-total]'), c.total, pln.format);
    else $('[data-mb-total]').textContent = c.color.name;

    store.set('sg-config', state);
    syncProducts();
  }

  /* =========================================================
   * Zdarzenia konfiguratora
   * ======================================================= */
  function bindConfigurator() {
    const onRadio = (name, key, cast = String) => {
      document.addEventListener('change', (e) => {
        if (e.target.name === name) { state[key] = cast(e.target.value); update(); }
      });
    };
    onRadio('roof', 'roof');
    onRadio('system', 'system');
    onRadio('color', 'color');
    onRadio('zone', 'zone', Number);

    $('[data-pitch]').addEventListener('input', (e) => { state.pitch = Number(e.target.value); update(); });

    const slopesEl = $('[data-slopes]');
    slopesEl.addEventListener('click', (e) => {
      const row = e.target.closest('.slope');
      if (!row) return;
      const i = Number(row.dataset.i), s = state.slopes[i];
      const lenBtn = e.target.closest('[data-len]');
      const rowsBtn = e.target.closest('[data-rows]');
      if (lenBtn) {
        s.length = clampLen(s.length + Number(lenBtn.dataset.len));
        $('[data-len-input]', row).value = fmtLen(s.length);
        update();
      } else if (rowsBtn) {
        s.rows = clamp(s.rows + Number(rowsBtn.dataset.rows), 1, 4);
        update();
      } else if (e.target.closest('[data-remove]') && state.slopes.length > 1) {
        state.slopes.splice(i, 1);
        renderSlopes();
        update();
      }
    });
    slopesEl.addEventListener('input', (e) => {
      if (!e.target.matches('[data-len-input]')) return;
      const v = Number(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''));
      if (v > 0) { state.slopes[Number(e.target.closest('.slope').dataset.i)].length = clampLen(v); update(); }
    });
    slopesEl.addEventListener('change', (e) => {
      if (!e.target.matches('[data-len-input]')) return;
      e.target.value = fmtLen(state.slopes[Number(e.target.closest('.slope').dataset.i)].length);
    });
    slopesEl.addEventListener('keydown', (e) => {
      if (!e.target.matches('[data-len-input]') || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      const s = state.slopes[Number(e.target.closest('.slope').dataset.i)];
      s.length = clampLen(s.length + (e.key === 'ArrowUp' ? 0.5 : -0.5));
      e.target.value = fmtLen(s.length);
      update();
    });

    $('[data-add-slope]').addEventListener('click', () => {
      if (state.slopes.length >= MAX_SLOPES) return;
      const last = state.slopes[state.slopes.length - 1];
      state.slopes.push({ length: last.length, rows: last.rows });
      renderSlopes();
      update();
      const inputs = $$('[data-len-input]');
      inputs[inputs.length - 1].focus();
      inputs[inputs.length - 1].select();
    });

    $('[data-reco]').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-apply-rows]');
      if (!btn) return;
      const n = Number(btn.dataset.applyRows);
      state.slopes.forEach((s) => { s.rows = Math.max(s.rows, n); });
      update();
    });

    $$('[data-add-config]').forEach((b) => b.addEventListener('click', addConfigToCart));

    $('[data-share]').addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}?k=${encodeURIComponent(shareCode(state))}#konfigurator`;
      try {
        await navigator.clipboard.writeText(url);
        toast('Link do konfiguracji skopiowany');
      } catch (e) {
        window.prompt('Skopiuj link do konfiguracji:', url);
      }
    });
  }

  /* =========================================================
   * Komunikacja dachowa
   * ======================================================= */
  const prodState = {};
  let activeCat = 'all';
  D.products.forEach((p) => { prodState[p.id] = { variant: 0, color: null, qty: 1 }; });
  const prodColor = (p) => byId(D.colors, prodState[p.id].color || state.color);

  function productSVG(p, hex, id) {
    const dk = (t) => darken(hex, t), lt = (t) => lighten(hex, t);
    const hole = '#9fb2c0';
    let s = `<svg viewBox="0 0 320 200" aria-hidden="true"><defs>
      <filter id="b-${id}" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>
      <linearGradient id="gl-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef4f8"/><stop offset="1" stop-color="#bfd1de"/></linearGradient>
    </defs>`;
    // tło: połać w widoku z przodu
    s += '<rect width="320" height="200" fill="#dfe8ee"/>';
    for (let y = 22; y < 200; y += 24) s += `<rect x="0" y="${y}" width="320" height="2.4" fill="#c7d4de"/><rect x="0" y="${y - 1}" width="320" height="1" fill="#eef3f7"/>`;

    const plank = (x1, x2, yT, depth, nBrackets, holesRows) => {
      let o = `<rect x="${x1 + 8}" y="${yT + depth + 10}" width="${x2 - x1 - 16}" height="12" rx="6" fill="#000" opacity=".16" filter="url(#b-${id})"/>`;
      for (let i = 0; i < nBrackets; i++) {
        const bx = x1 + 22 + (x2 - x1 - 44) * (nBrackets === 1 ? .5 : i / (nBrackets - 1));
        o += `<rect x="${f(bx - 5)}" y="${yT + depth}" width="10" height="36" rx="2" fill="${dk(.18)}"/><rect x="${f(bx - 13)}" y="${yT + depth + 32}" width="26" height="6" rx="2" fill="${dk(.3)}"/>`;
      }
      o += `<rect x="${x1}" y="${yT}" width="${x2 - x1}" height="${depth}" rx="3" fill="${hex}"/>`;
      const cols = Math.floor((x2 - x1 - 12) / 14);
      for (let r = 0; r < holesRows; r++) {
        for (let i = 0; i < cols; i++) {
          const hx = x1 + 8 + i * 14 + (r % 2) * 7, hy = yT + 6 + r * ((depth - 10) / Math.max(1, holesRows - 1 || 1));
          if (hx + 8 < x2 - 4) o += `<rect x="${f(hx)}" y="${f(hy)}" width="8" height="4" rx="2" fill="${hole}"/>`;
        }
      }
      o += `<rect x="${x1 + 2}" y="${yT + 1}" width="${x2 - x1 - 4}" height="1.6" rx=".8" fill="${lt(.4)}" opacity=".7"/>`;
      o += `<rect x="${x1}" y="${yT + depth - 1}" width="${x2 - x1}" height="7" rx="2" fill="${dk(.32)}"/>`;
      return o;
    };

    switch (p.icon) {
      case 'bench': s += plank(44, 276, 84, 30, 2, 3); break;
      case 'step': s += plank(108, 212, 86, 28, 2, 3); break;
      case 'platform': {
        const posts = `<rect x="48" y="30" width="8" height="64" rx="2" fill="${hex}"/><rect x="264" y="30" width="8" height="64" rx="2" fill="${hex}"/>`;
        const rails = `<rect x="44" y="28" width="232" height="7" rx="3.5" fill="${hex}"/><rect x="46" y="29" width="228" height="1.4" fill="${lt(.4)}" opacity=".7"/><rect x="52" y="58" width="216" height="4.5" rx="2" fill="${dk(.1)}"/>`;
        s += posts + rails + plank(34, 286, 92, 42, 3, 4);
        break;
      }
      case 'ladder': {
        s += `<rect x="128" y="14" width="74" height="182" rx="6" fill="#000" opacity=".12" filter="url(#b-${id})" transform="translate(6 6)"/>`;
        for (let y = 32; y < 196; y += 24) s += `<rect x="130" y="${y}" width="66" height="7" rx="2.5" fill="${dk(.12)}"/><rect x="132" y="${y + 1}" width="62" height="1.4" fill="${lt(.4)}" opacity=".6"/>`;
        [124, 192].forEach((x) => { s += `<rect x="${x}" y="10" width="10" height="190" rx="3" fill="${hex}"/><rect x="${x + 2}" y="12" width="2" height="186" fill="${lt(.4)}" opacity=".6"/>`; });
        s += `<path d="M129 12q0-8 8-8h4M197 12q0-8 8-8h4" fill="none" stroke="${dk(.2)}" stroke-width="5" stroke-linecap="round"/>`;
        break;
      }
      case 'hatch': {
        s += `<rect x="92" y="38" width="136" height="132" rx="10" fill="#000" opacity=".14" filter="url(#b-${id})" transform="translate(4 8)"/>`;
        s += `<rect x="92" y="38" width="136" height="128" rx="10" fill="${dk(.28)}"/>`;
        s += `<rect x="102" y="46" width="116" height="110" rx="6" fill="${hex}"/>`;
        s += `<rect x="114" y="58" width="92" height="84" rx="3" fill="url(#gl-${id})"/>`;
        s += '<path d="M124 120l40-52M140 132l40-52" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".45"/>';
        s += `<rect x="146" y="147" width="28" height="5" rx="2.5" fill="${dk(.45)}"/><rect x="104" y="48" width="112" height="1.6" fill="${lt(.4)}" opacity=".7"/>`;
        break;
      }
      default: {
        const br = (x, y) => `
          <path d="M${x} ${y + 92}h64v9h-54v0z" fill="${dk(.2)}"/>
          <path d="M${x + 6} ${y + 96}V${y + 10}l16-8v8l-7 4V${y + 96}z" fill="${hex}"/>
          <rect x="${x + 7.5}" y="${y + 14}" width="1.6" height="80" fill="${lt(.4)}" opacity=".7"/>
          <circle cx="${x + 11}" cy="${y + 34}" r="4" fill="${hole}"/><circle cx="${x + 11}" cy="${y + 56}" r="4" fill="${hole}"/>
          <circle cx="${x + 24}" cy="${y + 97}" r="2.4" fill="${hole}"/><circle cx="${x + 44}" cy="${y + 97}" r="2.4" fill="${hole}"/>`;
        s += `<ellipse cx="170" cy="182" rx="110" ry="9" fill="#000" opacity=".12" filter="url(#b-${id})"/>`;
        s += br(96, 70) + br(176, 76);
      }
    }
    return s + '</svg>';
  }

  function productCard(p, i) {
    const ps = prodState[p.id];
    const col = prodColor(p);
    const roof = byId(D.roofs, state.roof);
    return `
      <article class="product" data-product="${p.id}" style="animation-delay:${i * 40}ms">
        <div class="product-media" data-p-media>
          ${productSVG(p, col.hex, p.id)}
          ${p.badge ? `<span class="badge${p.badge === 'Nowość' ? ' badge-dark' : ''}">${esc(p.badge)}</span>` : ''}
        </div>
        <div class="product-body">
          <div class="product-title">
            <h3>${esc(p.name)}</h3>
            ${D.showPrices && p.priceFrom ? `<span class="product-price">od <strong>${pln.format(p.priceFrom)}</strong></span>` : ''}
          </div>
          <p class="product-desc">${esc(p.desc)}</p>
          <div class="product-mount" data-p-mount>${ICON.ok}<span>Uchwyty pod: <b>${esc(roof.name)}</b></span></div>
          <div class="product-opts">
            <div>
              <span class="mini-label">${esc(p.variantLabel)}</span>
              <div class="variant-row">
                ${p.variants.map((v, vi) => `<button type="button" class="variant" data-variant="${vi}" aria-pressed="${vi === ps.variant}">${esc(v)}</button>`).join('')}
              </div>
            </div>
            <div>
              <span class="mini-label">Kolor</span>
              <div class="dot-row">
                ${D.colors.map((c) => `<button type="button" class="dot" style="--c:${c.hex}" data-dot="${c.id}" aria-pressed="${c.id === col.id}" aria-label="${esc(c.name)} ${esc(c.ral)}" title="${esc(c.name)} ~${esc(c.ral)}"></button>`).join('')}
                <span class="dot-name" data-p-colorname>${esc(col.name)}</span>
              </div>
            </div>
            <div class="product-actions">
              <div class="stepper stepper-qty">
                <button type="button" data-qty="-1" aria-label="Mniej">${ICON.minus}</button>
                <input type="text" value="${ps.qty}" readonly tabindex="-1" aria-label="Ilość" data-p-qty>
                <button type="button" data-qty="1" aria-label="Więcej">${ICON.plus}</button>
              </div>
              <button type="button" class="btn btn-dark" data-add-product>Dodaj do zapytania</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function renderFilters() {
    $('[data-filters]').innerHTML = D.productCategories
      .filter((c) => c.id === 'all' || D.products.some((p) => p.cat === c.id))
      .map((c) => {
        const n = c.id === 'all' ? D.products.length : D.products.filter((p) => p.cat === c.id).length;
        return `<button type="button" class="filter" role="tab" data-cat="${c.id}" aria-selected="${c.id === activeCat}">${esc(c.name)}<sup>${n}</sup></button>`;
      }).join('');
  }

  function renderProducts(filtered) {
    const list = D.products.filter((p) => activeCat === 'all' || p.cat === activeCat);
    const grid = $('[data-products]');
    grid.classList.toggle('is-filtered', Boolean(filtered));
    grid.innerHTML = list.map(productCard).join('');
  }

  function refreshCard(el) {
    const p = D.products.find((x) => x.id === el.dataset.product);
    const col = prodColor(p);
    const media = $('[data-p-media]', el);
    const badge = $('.badge', media);
    media.innerHTML = productSVG(p, col.hex, p.id);
    if (badge) media.appendChild(badge);
    $$('[data-dot]', el).forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.dot === col.id)));
    $('[data-p-colorname]', el).textContent = col.name;
    $('[data-p-mount]', el).innerHTML = `${ICON.ok}<span>Uchwyty pod: <b>${esc(byId(D.roofs, state.roof).name)}</b></span>`;
  }

  let syncedKey = '';
  function syncProducts() {
    const sel = $('[data-comms-roof]');
    if (sel.value !== state.roof) sel.value = state.roof;
    const key = `${state.roof}|${state.color}`;
    if (key === syncedKey) return;
    syncedKey = key;
    $$('[data-product]').forEach(refreshCard);
  }

  function bindComms() {
    const sel = $('[data-comms-roof]');
    sel.innerHTML = D.roofs.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
    sel.value = state.roof;
    sel.addEventListener('change', () => {
      state.roof = sel.value;
      const radio = $(`input[name="roof"][value="${state.roof}"]`);
      if (radio) radio.checked = true;
      update();
    });

    $('[data-filters]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      activeCat = b.dataset.cat;
      renderFilters();
      renderProducts(true);
    });

    $('[data-products]').addEventListener('click', (e) => {
      const card = e.target.closest('[data-product]');
      if (!card) return;
      const p = D.products.find((x) => x.id === card.dataset.product);
      const ps = prodState[p.id];
      const v = e.target.closest('[data-variant]');
      const dot = e.target.closest('[data-dot]');
      const q = e.target.closest('[data-qty]');
      if (v) {
        ps.variant = Number(v.dataset.variant);
        $$('[data-variant]', card).forEach((b) => b.setAttribute('aria-pressed', String(b === v)));
      } else if (dot) {
        ps.color = dot.dataset.dot;
        refreshCard(card);
      } else if (q) {
        ps.qty = clamp(ps.qty + Number(q.dataset.qty), 1, 99);
        $('[data-p-qty]', card).value = ps.qty;
      } else if (e.target.closest('[data-add-product]')) {
        addProductToCart(p, e.target.closest('[data-add-product]'));
      }
    });
  }

  /* =========================================================
   * Zapytanie (koszyk)
   * ======================================================= */
  let cart = store.get('sg-cart', []);
  if (!Array.isArray(cart)) cart = [];

  function saveCart() {
    store.set('sg-cart', cart);
    renderCart();
  }

  function addConfigToCart(e) {
    const c = lastCalc || calc();
    const slopesTxt = state.slopes.map((s) => `${fmtLen(s.length)} m × ${s.rows} ${plural(s.rows, 'rząd', 'rzędy', 'rzędów')}`).join(', ');
    cart.push({
      uid: uid(), kind: 'config', hex: c.color.hex, qty: 1, from: false,
      title: `${c.sys.name} · ${c.roof.name}`,
      lines: [
        `Kolor: ${c.color.name} ~${c.color.ral}`,
        `Połacie: ${slopesTxt}`,
        `Strefa śniegowa ${c.zone.id}, kąt ${state.pitch}°, rozstaw ok. ${c.cm} cm`,
        `Elementy: ${c.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}`,
      ],
      price: D.showPrices ? c.total : null,
    });
    saveCart();
    flyToCart(e && e.currentTarget, c.color.hex);
    toast('Zestaw dodany do zapytania', true);
  }

  function addProductToCart(p, btn) {
    const ps = prodState[p.id];
    const col = prodColor(p);
    const roof = byId(D.roofs, state.roof);
    const variant = p.variants[ps.variant];
    const sig = `${p.id}|${variant}|${col.id}|${roof.id}`;
    const existing = cart.find((x) => x.sig === sig);
    if (existing) {
      existing.qty += ps.qty;
      existing.price = D.showPrices && p.priceFrom ? p.priceFrom * existing.qty : null;
    } else {
      cart.push({
        uid: uid(), kind: 'product', sig, hex: col.hex, qty: ps.qty, from: true,
        title: `${p.name} ${variant}`,
        lines: [`Kolor: ${col.name} ~${col.ral}`, `Uchwyty pod: ${roof.name}`],
        price: D.showPrices && p.priceFrom ? p.priceFrom * ps.qty : null,
      });
    }
    saveCart();
    flyToCart(btn, col.hex);
    toast(`Dodano do zapytania: ${p.name}`, true);
  }

  function cartTotal() {
    const priced = cart.filter((x) => x.price != null);
    if (!priced.length) return null;
    return { value: priced.reduce((a, x) => a + x.price, 0), from: cart.some((x) => x.from || x.price == null) };
  }

  function renderCart() {
    const count = cart.reduce((a, x) => a + (x.kind === 'product' ? x.qty : 1), 0);
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.classList.toggle('has-items', count > 0);
    });

    const wrap = $('[data-cart-items]');
    if (!cart.length) {
      wrap.innerHTML = `
        <div class="cart-empty">
          <strong>Zapytanie jest puste</strong>
          Dodaj zestaw z konfiguratora albo produkty komunikacji dachowej. Możesz też po prostu opisać, czego potrzebujesz.
          <div><button type="button" class="btn btn-ghost btn-sm" data-goto="#konfigurator">Przejdź do konfiguratora</button></div>
        </div>`;
      return;
    }
    const total = cartTotal();
    wrap.innerHTML = cart.map((x) => `
      <div class="cart-item">
        <span class="cart-item-dot" style="--c:${x.hex}"></span>
        <div>
          <h4>${x.kind === 'product' && x.qty > 1 ? `${x.qty} × ` : ''}${esc(x.title)}</h4>
          <ul>${x.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        </div>
        <div class="cart-item-side">
          ${x.price != null ? `<span class="cart-item-price">${x.from ? 'od ' : ''}${pln.format(x.price)}</span>` : ''}
          <button type="button" class="cart-item-remove" data-remove-item="${x.uid}">Usuń</button>
        </div>
      </div>`).join('') +
      (total ? `<div class="cart-total"><span>Razem orientacyjnie</span><strong>${total.from ? 'od ' : ''}${pln.format(total.value)}</strong></div>` : '');
  }

  /* ---------- szuflada ---------- */
  const drawer = $('[data-drawer]');
  let lastFocus = null;

  function openCart() {
    lastFocus = document.activeElement;
    $('[data-form]').hidden = false;
    $('[data-sent]').hidden = true;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('.drawer-panel', drawer).focus(), 50);
  }
  function closeCart() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function composeMessage(data) {
    const lines = ['Zapytanie ofertowe – śniegołapy.pl', ''];
    cart.forEach((x, i) => {
      lines.push(`${i + 1}. ${x.kind === 'product' ? `${x.qty} × ` : ''}${x.title}`);
      x.lines.forEach((l) => lines.push(`   – ${l}`));
      if (x.price != null) lines.push(`   – Wartość orientacyjna: ${x.from ? 'od ' : ''}${pln.format(x.price)}`);
      lines.push('');
    });
    const total = cartTotal();
    if (total) lines.push(`Razem orientacyjnie: ${total.from ? 'od ' : ''}${pln.format(total.value)}`, '');
    lines.push('Dane kontaktowe:');
    lines.push(`Imię i nazwisko / firma: ${data.name}`);
    lines.push(`Telefon: ${data.phone}`);
    lines.push(`E-mail: ${data.email}`);
    if (data.zip) lines.push(`Kod pocztowy: ${data.zip}`);
    if (data.notes) lines.push('', `Uwagi: ${data.notes}`);
    return lines.join('\n');
  }

  function emailHref(email) {
    const [user, domain] = email.split('@');
    try { return `${user}@${new URL(`http://${domain}`).hostname}`; } catch (e) { return email; }
  }

  function bindCart() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-cart]')) { e.preventDefault(); openCart(); }
      else if (e.target.closest('[data-close-cart]')) closeCart();
      const go = e.target.closest('[data-goto]');
      if (go) { closeCart(); $(go.dataset.goto).scrollIntoView({ behavior: 'smooth' }); }
      const rm = e.target.closest('[data-remove-item]');
      if (rm) { cart = cart.filter((x) => x.uid !== rm.dataset.removeItem); saveCart(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeCart();
    });

    const form = $('[data-form]');
    const err = $('[data-form-error]');
    form.addEventListener('input', (e) => e.target.classList.remove('is-invalid'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      Object.keys(data).forEach((k) => { if (typeof data[k] === 'string') data[k] = data[k].trim(); });
      const bad = [];
      if (!data.name) bad.push('name');
      if ((data.phone || '').replace(/\D/g, '').length < 9) bad.push('phone');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) bad.push('email');
      $$('.is-invalid', form).forEach((el) => el.classList.remove('is-invalid'));
      bad.forEach((n) => form.elements[n].classList.add('is-invalid'));
      const consent = form.elements.consent;
      consent.closest('.check').classList.toggle('is-invalid', !consent.checked);

      if (bad.length) { err.textContent = 'Uzupełnij poprawnie zaznaczone pola.'; form.elements[bad[0]].focus(); return; }
      if (!consent.checked) { err.textContent = 'Zaznacz zgodę na przetwarzanie danych.'; return; }
      if (!cart.length && !data.notes) { err.textContent = 'Dodaj coś do zapytania albo opisz w uwagach, czego potrzebujesz.'; form.elements.notes.focus(); return; }
      err.textContent = '';

      const message = composeMessage(data);
      const subject = `Zapytanie ofertowe – ${data.name}`;
      const btn = $('[data-submit]');

      if (D.formEndpoint) {
        btn.disabled = true;
        btn.textContent = 'Wysyłanie…';
        try {
          const res = await fetch(D.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ subject, message, contact: data, items: cart }),
          });
          if (!res.ok) throw new Error(String(res.status));
          cart = [];
          saveCart();
          form.reset();
          $('[data-sent-text]').textContent = 'Zapytanie dotarło. Odezwiemy się z wyceną najszybciej, jak to możliwe.';
          form.hidden = true;
          $('[data-sent]').hidden = false;
        } catch (ex) {
          err.textContent = `Nie udało się wysłać. Zadzwoń lub napisz: ${D.contact.email}`;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Wyślij zapytanie';
        }
        return;
      }

      window.location.href = `mailto:${emailHref(D.contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      $('[data-sent-text]').textContent = `Otworzyliśmy Twój program pocztowy z gotową wiadomością – wystarczy ją wysłać. Jeśli nic się nie otworzyło, napisz na ${D.contact.email}.`;
      form.hidden = true;
      $('[data-sent]').hidden = false;
    });
  }

  /* =========================================================
   * Reszta UI
   * ======================================================= */
  let toastTimer;
  function toast(msg, withLink) {
    const t = $('[data-toast]');
    t.innerHTML = `<span>${esc(msg)}</span>${withLink ? '<button type="button" data-open-cart>Pokaż</button>' : ''}`;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 3200);
  }

  function bumpCart() {
    $$('[data-cart-count]').forEach((el) => {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 300);
    });
  }

  // kropka w kolorze produktu leci łukiem do przycisku „Zapytanie”
  function flyToCart(fromEl, hex) {
    const toggle = $('[data-nav-toggle]');
    const target = getComputedStyle(toggle).display !== 'none' ? toggle : $('.nav-cart');
    if (reduceMotion || !fromEl || !target || !fromEl.animate) { bumpCart(); return; }
    const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    const p0 = [a.left + a.width / 2 - 9, a.top + a.height / 2 - 9];
    const p2 = [b.right - 24, b.top + b.height / 2 - 9];
    const p1 = [(p0[0] + p2[0]) / 2, Math.min(p0[1], p2[1]) - 160];
    const frames = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, u = 1 - t;
      const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
      const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
      frames.push({ transform: `translate(${f(x)}px, ${f(y)}px) scale(${f(1.15 - t * .7)})`, opacity: i === 0 ? 0 : 1 });
    }
    const dot = document.createElement('div');
    dot.className = 'fly-dot';
    dot.style.background = hex;
    document.body.appendChild(dot);
    const anim = dot.animate(frames, { duration: 750, easing: 'cubic-bezier(.45, 0, .25, 1)' });
    anim.onfinish = () => { dot.remove(); bumpCart(); };
  }

  function fillContact() {
    const c = D.contact;
    const tel = `tel:${c.phone.replace(/[^\d+]/g, '')}`;
    $$('[data-contact-phone]').forEach((a) => { a.textContent = c.phone; a.href = tel; });
    $$('[data-contact-email]').forEach((a) => { a.textContent = c.email; a.href = `mailto:${emailHref(c.email)}`; });
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

    const co = D.company;
    if (!co) return;
    const addr = `${co.street}, ${co.postcode} ${co.post}`;
    $$('[data-company-block]').forEach((el) => { el.innerHTML = `<b>${esc(co.name)}</b>${esc(addr)}<br>NIP ${esc(co.nip)} · REGON ${esc(co.regon)}`; });
    $$('[data-company-line]').forEach((el) => { el.textContent = `${co.name} · ${addr} · NIP ${co.nip} · REGON ${co.regon}`; });

    // dane firmy dla wyszukiwarek
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'śniegołapy.pl', legalName: co.name,
      url: 'https://xn--niegoapy-bpb8v.pl/', telephone: c.phone.replace(/\s/g, ''), email: c.email, taxID: co.nip.replace(/-/g, ''),
      address: { '@type': 'PostalAddress', streetAddress: co.street, postalCode: co.postcode, addressLocality: co.post, addressRegion: co.region, addressCountry: 'PL' },
    });
    document.head.appendChild(ld);
  }

  function bindUI() {
    // nagłówek
    const header = $('[data-header]');
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // menu mobilne
    const nav = $('[data-nav]'), toggle = $('[data-nav-toggle]');
    toggle.addEventListener('click', () => {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });

    if (!('IntersectionObserver' in window)) return;

    // aktywny link w menu
    const links = $$('.main-nav a');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['konfigurator', 'komunikacja', 'jak-zamawiac', 'kontakt'].forEach((id) => io.observe(document.getElementById(id)));

    // pasek mobilny: widoczny w konfiguratorze, dopóki nie widać zestawienia
    const bar = $('[data-mobile-bar]');
    let inCfg = false, summaryVisible = false;
    const sync = () => {
      const show = inCfg && !summaryVisible;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', String(!show));
      $('button', bar).tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(([en]) => { inCfg = en.isIntersecting; sync(); }).observe($('#konfigurator'));
    new IntersectionObserver(([en]) => { summaryVisible = en.isIntersecting; sync(); }, { threshold: .25 }).observe($('[data-summary]'));
  }

  /* ---------- animacje strony ---------- */
  function initIntro() {
    if (intro !== 'pending') return;
    if (!('IntersectionObserver' in window)) { playIntro(); return; }
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      setTimeout(() => { if (intro === 'pending') playIntro(); }, 250);
    }, { threshold: .45 });
    io.observe($('[data-preview]'));
  }

  // sekcje i karty wjeżdżają przy przewijaniu
  function initReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    ['.cfg-visual > .card', '.cfg-panel > *', '.section-head', '.filters', '.product-grid > .product', '.how-steps > li', '.faq', '.contact-inner > *']
      .forEach((sel) => $$(sel).forEach((el, i) => {
        el.classList.add('reveal');
        el.style.setProperty('--rd', `${Math.min(i, 5) * 80}ms`);
        io.observe(el);
      }));
  }

  // padający śnieg na całej stronie (jedno płótno nad treścią, nie łapie kliknięć)
  function initPageSnow() {
    if (reduceMotion || !window.requestAnimationFrame) return;
    const cv = document.createElement('canvas');
    cv.className = 'page-snow';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, flakes = [], raf = 0, last = 0;
    const flake = (anywhere) => ({
      x: Math.random() * w, y: anywhere ? Math.random() * h : -8, r: .8 + Math.random() * 2.2,
      vy: .35 + Math.random() * .6, ph: Math.random() * 6.28, sw: .3 + Math.random() * .7,
      c: Math.random() > .45 ? `rgba(160, 184, 204, ${.35 + Math.random() * .35})` : `rgba(255, 255, 255, ${.6 + Math.random() * .35})`,
    });
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.round(clamp(w * h / 14000, 30, 110)) }, () => flake(true));
    };
    const tick = (t) => {
      const dt = Math.min(50, t - (last || t)) / 16.7;
      last = t;
      ctx.clearRect(0, 0, w, h);
      flakes.forEach((p) => {
        p.y += p.vy * dt * (1 + p.r * .3);
        p.ph += .018 * dt;
        p.x += Math.sin(p.ph) * p.sw * .45 * dt;
        if (p.y > h + 8) Object.assign(p, flake(false));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = p.c;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (!document.hidden) raf = requestAnimationFrame(tick);
    });
    raf = requestAnimationFrame(tick);
  }

  /* ---------- start ---------- */
  function init() {
    fillContact();
    $('[data-preview]').innerHTML = `<div class="scene" data-scene></div>${flakesSVG()}`;
    renderRoofs();
    renderSystems();
    renderColors();
    bindRoofDropdown();
    renderZones();
    renderSlopes();
    bindConfigurator();
    renderFilters();
    bindComms();
    renderProducts();
    bindCart();
    renderCart();
    bindUI();
    update(false);
    initIntro();
    initReveal();
    initPageSnow();
  }

  init();
})();
