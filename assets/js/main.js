// scroll progress bar
(function () {
  const el = document.getElementById('progress');
  if (!el) return;
  const update = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    el.style.width = p.toFixed(2) + '%';
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();

// reveal on scroll
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const ent of entries) {
      if (ent.isIntersecting) {
        ent.target.classList.add('in');
        io.unobserve(ent.target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  els.forEach(e => io.observe(e));
})();

// raster rule color strip (same palette as Atari GTIA-inspired tokens)
(function () {
  const rr = document.getElementById('rasterRule');
  if (!rr) return;
  const palette = [
    '#0F0A18','#1F1635','#3D1E4A','#5A1F4D',
    '#8E2E58','#C2513D','#E8A441','#F0C659',
    '#F4D58A','#C8C49A','#8FB27D','#3F847E'
  ];
  for (const c of palette) {
    const s = document.createElement('span');
    s.style.background = c;
    rr.appendChild(s);
  }
})();
