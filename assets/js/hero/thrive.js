/*
  Thrive — pixel-accurate port of the TIC-80 intro (Nano Award 2022).
  240x136 native framebuffer, 16-color TIC-80 palette, recursive sprout.
*/
(function () {
  const W = 240, H = 136, VSZ = W * H;

  const PALETTE = [
    [26,28,44],[93,39,93],[177,62,83],[239,125,87],
    [255,205,117],[167,240,112],[56,183,100],[37,113,121],
    [41,54,111],[59,93,201],[65,166,246],[115,239,247],
    [244,244,244],[148,176,194],[86,108,134],[51,60,87]
  ];

  const sin = Math.sin;
  const min = Math.min;
  const fl = Math.floor;
  const luaMod = (a, b) => ((a % b) + b) % b;

  class ThriveEffect {
    constructor(canvas) {
      this.canvas = canvas;
      canvas.width = W;
      canvas.height = H;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.vram = new Uint8Array(VSZ);
      this.imgData = this.ctx.createImageData(W, H);
      this._raf = 0;
      this._t0 = 0;
    }

    _render(timestamp) {
      const vram = this.vram;
      const t = timestamp / 46;

      const pix = (x, y, c) => {
        x = fl(x); y = fl(y);
        if (x >= 0 && x < W && y >= 0 && y < H) {
          vram[y * W + x] = fl(c) & 15;
        }
      };
      const rect = (x, y, w, h, c) => {
        x = fl(x); y = fl(y); w = fl(w); h = fl(h);
        for (let i = 0; i < w; i++) {
          for (let j = 0; j < h; j++) pix(x + i, y + j, c);
        }
      };
      const circ = (x, y, r, c) => {
        x = fl(x); y = fl(y); r = fl(r);
        if (r < 0) return;
        if (r === 0) { pix(x, y, c); return; }
        for (let j = -r; j <= r; j++) {
          for (let i = -r; i <= r; i++) {
            if (i * i + j * j <= r * r) pix(x + i, y + j, c);
          }
        }
      };
      const b = (x, y, a, l, tt) => {
        for (let i = 0; i <= l; i++) {
          const j = y + i * sin(a) + 3 * sin(i / 9) * sin(a - 8);
          const k = x + i * sin(a - 8) - 3 * sin(i / 9) * sin(a);
          circ(k, j + sin(i) * min(tt - 633, 4) * min(1133 - tt, 1),
               min(tt - 633 - i, 1),
               3 * sin(i / 9) - min(tt / 36, 36));
          const n = l - i;
          rect(k, j, n / 33, n / 33, 0);
          rect(k, j, n / 33, min(tt - 1633 - i, 1), -min(tt - 1633 - i, 132) / 33);
          if (i % 14 === 9) {
            b(k, j, a + sin(i) + sin(tt / 33) / 33, n - 33, tt);
          }
        }
      };

      for (let i = 0; i < VSZ; i++) {
        const noise = luaMod(i * sin(i), 1);
        vram[i] = fl(63 - i / 3333 + noise) & 15;
        const starX = i % 333;
        const starY = t - 2433 + (i * sin(i * i)) / 33;
        pix(starX, starY, 12);
      }

      b(123, 110, 5, min(t, 263), t);

      const data = this.imgData.data;
      for (let i = 0; i < VSZ; i++) {
        const c = PALETTE[vram[i]];
        const idx = i * 4;
        data[idx]     = c[0];
        data[idx + 1] = c[1];
        data[idx + 2] = c[2];
        data[idx + 3] = 0xFF;
      }
      this.ctx.putImageData(this.imgData, 0, 0);
    }

    start() {
      this._t0 = performance.now();
      const loop = () => {
        const ts = performance.now() - this._t0;
        this._render(ts);
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  window.ThriveEffect = ThriveEffect;
})();
