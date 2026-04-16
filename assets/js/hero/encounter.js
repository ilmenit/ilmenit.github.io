/*
  Encounter — adapted from ilmenit/sizecoding/Encounter js renderer.
  Hardcoded defaults, no controls, scaled down for a hero canvas.
*/
(function () {
  const CFG = {
    W: 240,
    H: 180,
    waterIterations: 14,
    skyIterations: 4,
    waveAmplitude: 40,
    waveFrequency: 2,
    maxWaveScale: 40,
    showBlob: true,
    showVignette: true,
    showFilmGrain: true,
    showEndingEffect: true
  };

  class EncounterEffect {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.W = CFG.W;
      this.H = CFG.H;
      canvas.width = this.W;
      canvas.height = this.H;
      this.centerX = this.W / 2;
      this.centerY = this.H / 2;
      this.baseScale = Math.sqrt((this.W * this.H) / (320 * 240));
      this.imageData = this.ctx.createImageData(this.W, this.H);
      this.data = this.imageData.data;
      this.palette = new Uint32Array(256);
      this._buildPalette();
      this._raf = 0;
      this._t0 = 0;
    }

    _buildPalette() {
      // 0..127: dark->bright steps (scaled blue-green-cream)
      for (let i = 0; i < 32; i++) {
        const step = i * 0x203;
        const r = (step >> 16) & 0xFF;
        const g = (step >> 8) & 0xFF;
        const b = step & 0xFF;
        for (let j = 0; j < 4; j++) {
          const idx = i * 4 + j;
          this.palette[idx] =
            (r << 24) | (g << 16) | (b << 8) | 0xFF;
        }
      }
      // 128..255: tail fading to a warm sky tone
      const lastStep = 31 * 0x203;
      const lastR = (lastStep >> 16) & 0xFF;
      const lastG = (lastStep >> 8) & 0xFF;
      const lastB = lastStep & 0xFF;
      for (let i = 128; i < 256; i++) {
        const t = (i - 128) / 127;
        const r = Math.floor(lastR + t * (0xFF - lastR));
        const g = Math.floor(lastG + t * (0xFF - lastG));
        const b = Math.floor(lastB + t * (0xE0 - lastB));
        this.palette[i] = (r << 24) | (g << 16) | (b << 8) | 0xFF;
      }
    }

    _line(x, y1, y2, color) {
      const xx = x | 0;
      if (xx < 0 || xx >= this.W) return;
      let startY = Math.min(y1, y2) | 0;
      let endY = Math.ceil(Math.max(y1, y2));
      if (startY < 0) startY = 0;
      if (endY >= this.H) endY = this.H - 1;
      const pal = this.palette[color & 0xFF];
      const r = (pal >>> 24) & 0xFF;
      const g = (pal >>> 16) & 0xFF;
      const b = (pal >>> 8) & 0xFF;
      for (let y = startY; y <= endY; y++) {
        const idx = (y * this.W + xx) * 4;
        this.data[idx] = r;
        this.data[idx + 1] = g;
        this.data[idx + 2] = b;
        this.data[idx + 3] = 0xFF;
      }
    }

    _waveHeight(fx, fy, t) {
      const vp_x = this.centerX;
      const vp_y = this.centerY + 0.5;
      const d = this.centerX;
      const cx = vp_x - fx;
      const cy = vp_y - fy;
      const nx = cx / cy / 2;
      const ny = this.W / cy;
      const dist = Math.sqrt(cx * cx + cy * cy);

      let h = 0;
      if (CFG.showEndingEffect) {
        h = Math.sin(CFG.waveAmplitude * dist / this.baseScale) * Math.max(0, t / 2 - 40);
      }
      const iter = fy < this.centerY ? CFG.skyIterations : CFG.waterIterations;
      for (let i = 0; i < iter; i++) {
        const amp = (i * CFG.waveAmplitude) / 1000;
        const freq = CFG.waveFrequency + Math.cos(i);
        const dx = Math.sin(i * i);
        const dy = Math.cos(i * i * i);
        const ts = t / 14 * iter;
        h -= amp * Math.abs(Math.sin(freq * (ny * dy + nx * dx) + ts));
      }
      return h;
    }

    _render(t) {
      const W = this.W;
      const H = this.H;
      for (let fx = 0; fx < W; fx++) {
        let prev = 0;
        for (let fy = 0; fy < H; fy++) {
          const h = this._waveHeight(fx, fy, t);
          const scale = Math.min(2 * t, CFG.maxWaveScale);
          const vp_x = this.centerX;
          const vp_y = this.centerY + 0.5;
          const d = this.centerX;
          const cx = vp_x - fx;
          const cy = vp_y - fy;
          const dist = Math.sqrt(cx * cx + cy * cy);
          const ph = h * scale * cy / d;
          const hc = 1 - Math.abs(ph - prev) / 6;
          const radius = Math.min(2 * t - 70, 50);
          const bc = dist / radius;
          const color = (CFG.showBlob && dist < radius) ? bc : hc;
          let pc = CFG.showVignette
            ? Math.max(0, color + (cy - dist) / (512 * this.baseScale))
            : color;
          let fc = Math.min(255, Math.floor(250 * pc));
          if (CFG.showFilmGrain) fc += 6 * Math.random();
          this._line(fx, fy + Math.floor(ph), fy + Math.floor(prev), Math.floor(fc));
          prev = ph;
        }
      }
      this.ctx.putImageData(this.imageData, 0, 0);
    }

    start() {
      this._t0 = performance.now();
      const loop = () => {
        const t = (performance.now() - this._t0) / 1000;
        this._render(t);
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  window.EncounterEffect = EncounterEffect;
})();
