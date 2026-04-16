/*
  Urban Drift — adapted from ilmenit/sizecoding/urban_drift js port.
  Hardcoded defaults, no controls, Bayer-dithered temporal sampling for speed.
*/
(function () {
  const CFG = {
    W: 240,
    H: 180,
    bayerPattern: 16,
    rotationSpeed: 16,
    shadowsEnabled: true,
    shadowQuality: 12,
    raycastSteps: 56,
    daySpeed: 48,
    epsilon: 0.013671875,
    buildingSize: 0.4375,
    windowSizeH: 0.875,
    windowSizeV: 0.875,
    reflectionsEnabled: true,
    reflectionDepth: 4,
    windowLightsEnabled: true
  };

  const M = {
    abs: Math.abs, min: Math.min, max: Math.max,
    sin: Math.sin, cos: Math.cos, sqrt: Math.sqrt,
    fmod: (x, y) => x % y
  };

  class Engine {
    sdf(px, py, pz) {
      const gx = Math.floor(px);
      const gz = Math.floor(pz);
      let d = py;
      for (let i = 0; i < 9; i++) {
        const dx = Math.floor(i / 3) - 1;
        const dz = (i % 3) - 1;
        const gxDx = gx + dx;
        const pxO = px - (gxDx + 0.5);
        const absX = M.abs(pxO) - CFG.buildingSize;
        const h2 = Math.fround(((gxDx ^ (gz + dz)) & 7) / 4);
        const pzO = pz - ((gz + dz) + 0.5);
        const absZ = M.abs(pzO) - CFG.buildingSize;
        const absY = M.abs(py - h2) - h2;
        d = M.min(d, M.max(absX, M.max(absY, absZ)));
      }
      return d;
    }

    raycast(px, py, pz, rdX, rdY, rdZ, depth) {
      let dist = 0;
      const dayTime = this.dayTime;
      for (let step = 0; step < CFG.raycastSteps; step++) {
        let h = this.sdf(px, py, pz);
        if (h < CFG.epsilon) {
          const nx = this.sdf(px + CFG.epsilon, py, pz) - h;
          const ny = this.sdf(px, py + CFG.epsilon, pz) - h;
          const nz = this.sdf(px, py, pz + CFG.epsilon) - h;
          const nl = 1.0078125 / M.sqrt(nx * nx + ny * ny + nz * nz);
          let light = (nx + ny * dayTime - nz * dayTime) * nl;
          if (CFG.shadowsEnabled) {
            let t = 0.1248779296875;
            let hit = false;
            for (let j = 0; j < CFG.shadowQuality && !hit; j++) {
              const sh = this.sdf(px + t, py + t * dayTime, pz - t * dayTime);
              if (sh < CFG.epsilon) { light /= 8; hit = true; }
              else { light = M.min(light, sh * (8 / t)); t = t + sh; }
            }
          }
          if (M.abs(ny * nl) < CFG.epsilon) {
            const w = M.abs(nx) > M.abs(nz) ? pz : px;
            const winH = M.abs(M.fmod(4 * w, 1)) <= CFG.windowSizeH;
            const winV = M.abs(M.fmod(4 * py, 1)) <= CFG.windowSizeV;
            if (winH && winV) {
              if (CFG.reflectionsEnabled && depth !== 0) {
                const ndr = 2 * (nx * rdX + ny * rdY + nz * rdZ) * nl * nl;
                const rrX = rdX - ndr * nx;
                const rrY = rdY - ndr * ny;
                const rrZ = rdZ - ndr * nz;
                const nd = depth > 0 ? depth - 1 : depth;
                const rl = this.raycast(
                  px + rrX * CFG.epsilon,
                  py + rrY * CFG.epsilon,
                  pz + rrZ * CFG.epsilon,
                  rrX, rrY, rrZ, nd
                );
                light = M.min((light + rl) * 0.5, 1);
              }
              if (CFG.windowLightsEnabled) {
                const wx = Math.floor(w * 16);
                const wy = Math.floor(py * 16);
                if (((wx ^ wy ^ Math.floor(wx / 2)) & 28) === 0) {
                  light = 3 + (light - 3) * dayTime;
                }
              }
            }
          }
          light += (dayTime - light) / 8 * dist;
          return M.min(M.max(light, 0), 0.875);
        }
        h /= 4;
        px += rdX * h;
        py += rdY * h;
        pz += rdZ * h;
        dist += h;
      }
      return this.dayTime;
    }
  }

  class UrbanDriftEffect {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.W = CFG.W;
      this.H = CFG.H;
      canvas.width = this.W;
      canvas.height = this.H;
      this.scaleX = this.W / 320;
      this.scaleY = this.H / 240;
      this.imageData = this.ctx.createImageData(this.W, this.H);
      this.engine = new Engine();
      this.bayerSize = 8;
      this._buildBayer();
      this._raf = 0;
      this._t0 = 0;
      this.frameCount = 0;
    }

    _buildBayer() {
      const sz = this.bayerSize;
      this.bayer = new Uint8Array(sz * sz);
      for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
          let m = 0;
          for (let bit = 0; bit < 6; bit++) {
            const mask = 1 << bit;
            m |= (((x & mask) >> bit) << (2 * bit + 1))
               | (((y & mask) >> bit) << (2 * bit));
          }
          this.bayer[y * sz + x] = m;
        }
      }
    }

    _render(t) {
      const angle = t / CFG.rotationSpeed;
      this.engine.dayTime = M.abs(M.fmod(t / CFG.daySpeed, 2) - 1);
      const s = M.sin(angle);
      const c = M.cos(angle);
      const offset = this.frameCount % CFG.bayerPattern;
      const data = this.imageData.data;
      const W = this.W;
      const H = this.H;
      const sz = this.bayerSize;

      const px0 = 4 * s;
      const py0 = 4 - Math.abs(M.fmod(angle / 4, 2) - 1);
      const pz0 = 4 * c;

      for (let y = 0; y < H; y++) {
        const v = (100 - y / this.scaleY) / 100 - 0.7;
        for (let x = 0; x < W; x++) {
          const bx = Math.floor(x / this.scaleX) % sz;
          const by = Math.floor(y / this.scaleY) % sz;
          if ((this.bayer[by * sz + bx] % CFG.bayerPattern) !== offset) continue;
          const u = (160 - x / this.scaleX) / 100;
          const rdX = -c * u - 2 * s;
          const rdY = v;
          const rdZ = s * u - 2 * c;
          const light = this.engine.raycast(px0, py0, pz0, rdX, rdY, rdZ, CFG.reflectionDepth);
          const col = Math.floor(240 * light);
          const idx = (y * W + x) * 4;
          data[idx] = col;
          data[idx + 1] = col;
          data[idx + 2] = col;
          data[idx + 3] = 0xFF;
        }
      }
      this.ctx.putImageData(this.imageData, 0, 0);
    }

    start() {
      this._t0 = performance.now();
      const loop = () => {
        const t = (performance.now() - this._t0) / 1000;
        this._render(t);
        this.frameCount++;
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  window.UrbanDriftEffect = UrbanDriftEffect;
})();
