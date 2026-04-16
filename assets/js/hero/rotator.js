/*
  Hero rotator: cycles effects in #hero-frame.
  - Canvas stages instantiate an Effect class (start/stop).
  - Image stages display an animated gif.
  Pips are clickable and disable auto-play. A toggle to the right of
  the pips turns auto-play back on.
*/
(function () {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STAGES = [
    {
      id: 'mona',
      label: 'Mona',
      pouet: 'https://www.pouet.net/prod.php?which=62917',
      source: 'Atari XL/XE · 250 b · Meteoriks Best Tiny Intro 2014',
      algorithm: '64 Galois-LFSR brush strokes, polynomial $04C11DB7',
      ratio: '1 / 1',
      duration: 10000,
      Effect: () => window.MonaEffect
    },
    {
      id: 'quarter-express',
      label: 'Quarter Express',
      pouet: 'https://www.pouet.net/prod.php?which=88293',
      source: 'Atari XL/XE · Nano Award 2021, Best Oldschool Tiny Intro',
      algorithm: 'Raster program, sprites, scrolling, ATASCII graphics. Train gfx by Piesiu',
      ratio: '336 / 240',
      duration: 12000,
      type: 'img',
      src: 'assets/img/hero/quarter-express.gif'
    },
    {
      id: 'adam-is-me',
      label: 'Adam Is Me',
      pouet: 'https://www.pouet.net/prod.php?which=94605',
      source: 'Atari XL/XE · 2022 · ports to Atari ST, Amiga, Jaguar',
      algorithm: 'Highly optimized and cached O(n²) parsing and interaction checking.',
      ratio: '16 / 9',
      duration: 14000,
      type: 'img',
      src: 'assets/img/hero/adam-is-me.gif'
    },
    {
      id: 'thrive',
      label: 'Thrive',
      pouet: 'https://www.pouet.net/prod.php?which=91578',
      source: 'TIC-80 · Nano Award 2022, Best Fantasy Console Tiny Intro',
      algorithm: 'Recursive tree through seasons with wind, leaves and snow.',
      ratio: '240 / 136',
      duration: 16000,
      Effect: () => window.ThriveEffect
    },
    {
      id: 'encounter',
      label: 'Encounter',
      pouet: 'https://www.pouet.net/prod.php?which=96944',
      source: 'MicroW8 · 256 b · Outline Demoparty 2024',
      algorithm: 'Iterative sine-wave height field, per-column scanlines',
      ratio: '4 / 3',
      duration: 14000,
      Effect: () => window.EncounterEffect
    },
    {
      id: 'urban',
      label: 'Urban Drift',
      pouet: 'https://www.pouet.net/prod.php?which=103596',
      source: 'MicroW8 · 512 b · Lovebyte 2025',
      algorithm: 'SDF raymarching with reflections',
      ratio: '4 / 3',
      duration: 14000,
      Effect: () => window.UrbanDriftEffect
    }
  ];

  const PLAY_SVG = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><polygon points="2,1 11,6 2,11" fill="currentColor"/></svg>';
  const PAUSE_SVG = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><rect x="2" y="1" width="3" height="10" fill="currentColor"/><rect x="7" y="1" width="3" height="10" fill="currentColor"/></svg>';

  function init() {
    const frame = document.getElementById('hero-frame');
    const labelEl = document.getElementById('hero-now-label');
    const sourceEl = document.getElementById('hero-now-source');
    const algoEl = document.getElementById('hero-now-algo');
    const pipsEl = document.getElementById('hero-now-pips');
    if (!frame) return;

    const elements = STAGES.map((s) => {
      let el;
      if (s.type === 'img') {
        el = document.createElement('img');
        el.alt = s.label;
        el.loading = 'eager';
        el.decoding = 'async';
        el.dataset.src = s.src;
      } else if (s.type === 'video') {
        el = document.createElement('video');
        el.muted = true;
        el.defaultMuted = true;
        el.loop = true;
        el.playsInline = true;
        el.setAttribute('muted', '');
        el.setAttribute('playsinline', '');
        el.preload = 'metadata';
        el.dataset.src = s.src;
      } else {
        el = document.createElement('canvas');
      }
      el.className = 'stage';
      el.setAttribute('aria-hidden', 'true');
      frame.appendChild(el);
      return el;
    });

    const pips = [];
    let playToggle = null;
    if (pipsEl) {
      STAGES.forEach((s, i) => {
        const p = document.createElement('button');
        p.type = 'button';
        p.className = 'pip';
        p.setAttribute('role', 'tab');
        p.setAttribute('aria-label', `Play ${s.label}`);
        p.addEventListener('click', () => {
          setAutoPlay(false);
          goTo(i);
        });
        pipsEl.appendChild(p);
        pips.push(p);
      });

      playToggle = document.createElement('button');
      playToggle.type = 'button';
      playToggle.className = 'pip-toggle';
      playToggle.setAttribute('aria-pressed', 'true');
      playToggle.addEventListener('click', () => setAutoPlay(!autoPlay));
      pipsEl.appendChild(playToggle);
    }

    let idx = 0;
    let currentEffect = null;
    let timer = 0;
    let autoPlay = !REDUCED;

    function renderToggle() {
      if (!playToggle) return;
      playToggle.innerHTML = autoPlay ? PAUSE_SVG : PLAY_SVG;
      playToggle.setAttribute('aria-label', autoPlay ? 'Pause auto-play' : 'Resume auto-play');
      playToggle.setAttribute('aria-pressed', autoPlay ? 'true' : 'false');
      playToggle.classList.toggle('on', autoPlay);
    }

    function applyCaption(i) {
      const s = STAGES[i];
      if (labelEl) {
        labelEl.textContent = s.label;
        if (labelEl.tagName === 'A' && s.pouet) labelEl.href = s.pouet;
      }
      if (sourceEl) sourceEl.textContent = s.source;
      if (algoEl) algoEl.textContent = s.algorithm;
    }

    function setActive(i) {
      pips.forEach((p, k) => {
        p.classList.toggle('on', k === i);
        p.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      elements.forEach((c, k) => c.classList.toggle('active', k === i));
      if (STAGES[i].ratio) frame.style.setProperty('--hero-ratio', STAGES[i].ratio);
      applyCaption(i);
    }

    function scheduleNext() {
      clearTimeout(timer);
      if (!autoPlay) return;
      const duration = STAGES[idx].duration;
      timer = setTimeout(() => {
        idx = (idx + 1) % STAGES.length;
        show(idx);
      }, duration);
    }

    function show(i) {
      if (currentEffect && currentEffect.stop) currentEffect.stop();
      currentEffect = null;

      // pause any playing video stage other than the one we're switching to
      elements.forEach((el, k) => {
        if (k !== i && el.tagName === 'VIDEO') {
          try { el.pause(); } catch (_) {}
        }
      });

      const stage = STAGES[i];
      const el = elements[i];

      if (stage.type === 'img') {
        el.src = '';
        el.src = el.dataset.src;
      } else if (stage.type === 'video') {
        if (!el.src) el.src = el.dataset.src;
        try { el.currentTime = 0; } catch (_) {}
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        const Ctor = stage.Effect();
        if (Ctor) {
          currentEffect = new Ctor(el);
          currentEffect.start();
        }
      }

      setActive(i);
      scheduleNext();
    }

    function goTo(i) {
      idx = i;
      show(idx);
    }

    function setAutoPlay(on) {
      autoPlay = !!on;
      renderToggle();
      if (autoPlay) scheduleNext();
      else clearTimeout(timer);
    }

    function pause() {
      if (currentEffect && currentEffect.stop) currentEffect.stop();
      const el = elements[idx];
      if (el && el.tagName === 'VIDEO') { try { el.pause(); } catch (_) {} }
      clearTimeout(timer);
    }

    function resume() {
      const stage = STAGES[idx];
      const el = elements[idx];
      if (stage.type === 'video' && el) {
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
        scheduleNext();
      } else if (!currentEffect && stage.type !== 'img') {
        show(idx);
      } else if (currentEffect) {
        currentEffect.start();
        scheduleNext();
      } else {
        scheduleNext();
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause();
      else if (autoPlay) resume();
    });

    renderToggle();
    show(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
