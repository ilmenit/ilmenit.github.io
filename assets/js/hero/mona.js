/*
  Mona — port of ilmenit's 250/256 byte Atari intro.
  64 brush strokes of cycling color, driven by a 32-bit Galois LFSR.
  Each stroke: length = (64 - i) * 32 pixels; LFSR picks axis/direction per pixel.
  Seeds and algorithm match the original; see source notes in README.
*/
(function () {
  const BRUSH_PRE = 0x7EC8;
  const BRUSH = [
    0x030A, 0x37BE, 0x2F9B, 0x072B, 0x0E3C, 0xF59B, 0x8A91, 0x1B0B,
    0x0EBD, 0x9378, 0xB83E, 0xB05A, 0x70B5, 0x0280, 0xD0B1, 0x9CD2,
    0x2093, 0x209C, 0x3D11, 0x26D6, 0xDF19, 0x97F5, 0x90A3, 0xA347,
    0x8AF7, 0x0859, 0x29AD, 0xA32C, 0x7DFC, 0x0D7D, 0xD57A, 0x3051,
    0xD431, 0x542B, 0xB242, 0xB114, 0x8A96, 0x2914, 0xB0F1, 0x532C,
    0x0413, 0x0A09, 0x3EBB, 0xE916, 0x1877, 0xB8E2, 0xAC72, 0x80C7,
    0x5240, 0x8D3C, 0x3EAF, 0xAD63, 0x1E14, 0xB23D, 0x238F, 0xC07B,
    0xAF9D, 0x312E, 0x96CE, 0x25A7, 0x9E37, 0x2C44, 0x2BB9, 0x2139
  ];

  // sepia/cream palette tuned to evoke the original intro
  const PALETTE = [
    [0x14, 0x0C, 0x06, 0xFF], // 0 deep brown
    [0xEA, 0xCB, 0x8A, 0xFF], // 1 cream
    [0xC8, 0x8A, 0x55, 0xFF], // 2 sepia
    [0x6C, 0x40, 0x22, 0xFF], // 3 dark sienna
  ];

  class MonaEffect {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.W = 128;
      this.H = 128;
      this.canvas.width = this.W;
      this.canvas.height = this.H;
      this.img = this.ctx.createImageData(this.W, this.H);
      this._raf = 0;
      this._done = false;
    }

    reset() {
      // fill with color 0
      const d = this.img.data;
      const [r, g, b, a] = PALETTE[0];
      for (let i = 0; i < d.length; i += 4) {
        d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = a;
      }
      // LFSR state
      this.d6 = ((BRUSH_PRE << 16) >>> 0);
      this.strokeIdx = 0;
      this.pixelsInStroke = 0;
      this.strokeLen = 0;
      this.col = 0;
      this.currentOp = 0x5245; // default: ADDQ.W #1, D5 (y+=1)
      this._beginStroke();
      this._done = false;
    }

    _beginStroke() {
      if (this.strokeIdx >= BRUSH.length) { this._done = true; return; }
      // replace low word of d6 with next brush seed (keep high word from previous LFSR state)
      this.d6 = ((this.d6 & 0xFFFF0000) | BRUSH[this.strokeIdx]) >>> 0;
      // initial coords from low word of d6
      this.d4 = this.d6 & 0xFF;                // x seed
      this.d5 = (this.d6 >>> 8) & 0xFF;        // y seed
      this.col = (this.col + 1) & 3;
      this.strokeLen = (64 - this.strokeIdx) * 32;
      this.pixelsInStroke = 0;
    }

    _step() {
      // one LFSR+putpixel iteration
      const carry = (this.d6 & 0x80000000) !== 0;
      this.d6 = ((this.d6 << 1) >>> 0);
      if (carry) {
        this.d6 = (this.d6 ^ 0x04C11DB7) >>> 0;
        // patch SMC: choose axis (bit 1) and direction (bit 7)
        let op = 0x5245;
        if ((this.d6 & 0x02) !== 0) op -= 1;        // axis: 0 -> D5 (y), 1 -> D4 (x)
        if ((this.d6 & 0x80) !== 0) op |= 0x0100;   // direction: 0 -> +, 1 -> -
        this.currentOp = op;
      }
      // execute current op: add/sub 1 to x or y
      const delta = (this.currentOp & 0x0100) ? -1 : 1;
      if ((this.currentOp & 1) === 1) this.d5 = (this.d5 + delta) & 0xFFFF;
      else                             this.d4 = (this.d4 + delta) & 0xFFFF;
      // mask to 128x128
      const x = this.d4 & 0x7F;
      const y = this.d5 & 0x7F;
      // putpix
      const idx = (y * this.W + x) * 4;
      const c = PALETTE[this.col];
      this.img.data[idx]     = c[0];
      this.img.data[idx + 1] = c[1];
      this.img.data[idx + 2] = c[2];
      this.img.data[idx + 3] = c[3];
    }

    start() {
      this.reset();
      const frame = () => {
        // budget per frame so painting takes a few seconds
        const perFrame = 480;
        for (let i = 0; i < perFrame; i++) {
          if (this._done) break;
          this._step();
          this.pixelsInStroke++;
          if (this.pixelsInStroke >= this.strokeLen) {
            this.strokeIdx++;
            this._beginStroke();
          }
        }
        this.ctx.putImageData(this.img, 0, 0);
        if (this._done) {
          // finished; hold the final frame
          return;
        }
        this._raf = requestAnimationFrame(frame);
      };
      this._raf = requestAnimationFrame(frame);
    }

    stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  window.MonaEffect = MonaEffect;
})();
