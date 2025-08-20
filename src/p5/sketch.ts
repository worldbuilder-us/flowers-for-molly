// src/p5/sketch.ts
import type p5 from "p5";

export const sketch = (p: p5) => {
  const SHOW_DEBUG = true;
  let seed = Math.floor(Math.random() * 1_000_000);

  // cache: recompute only when needed
  let petals = 8;
  let baseLen = 140;
  let baseWidth = 28;

  p.setup = () => {
    p.pixelDensity(1);
    // Force 2D renderer to avoid WEBGL bezier overloads
    // (P2D is default, but making it explicit helps Safari/WebKit)
    p.createCanvas(p.windowWidth, p.windowHeight, p.P2D);

    p.noLoop();
    p.colorMode(p.HSB, 360, 100, 100, 100);
    recomputeParams();
    p.redraw(); // render once
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    recomputeParams();
    p.redraw();
  };

  p.mousePressed = () => {
    seed = Math.floor(Math.random() * 1_000_000);
    recomputeParams();
    p.redraw();
  };

  p.keyPressed = () => {
    if (p.key === "r" || p.key === "R") {
      seed = Math.floor(Math.random() * 1_000_000);
      recomputeParams();
      p.redraw();
    }
  };

  function recomputeParams() {
    p.randomSeed(seed);

    const minSide = Math.max(300, Math.min(p.width, p.height));
    petals = p.floor(p.random(6, 12));
    baseLen = p.constrain(p.map(minSide, 300, 1600, 80, 220), 60, 280);
    baseWidth = baseLen * p.random(0.18, 0.28);
  }

  p.draw = () => {
    // Draw exactly once per redraw() call
    // p.clear();
    // p.background(0, 0, 98);

    const cx = p.width * 0.5;
    const cy = p.height * 0.5;

    // knobs
    const variance = 0.18;
    const rotationJitter = 0.02;

    p.push();
    p.translate(p.mouseX, p.mouseY);

    for (let i = 0; i < petals; i++) {
      const angle =
        (i / petals) * p.TWO_PI + p.random(-rotationJitter, rotationJitter);

      const len = baseLen * (1 + p.random(-variance, variance));
      const wid = baseWidth * (1 + p.random(-variance, variance));

      const hue = (p.random(0, 360) + seed * 0.01) % 360;
      const sat = p.random(65, 95);
      const bri = p.random(25, 100);

      p.push();
      p.rotate(angle);
      drawTeardropPetal(0, 0, len, wid, hue, sat, bri);
      p.pop();
    }

    p.pop();

    // center disc
    const centerR = baseWidth * 0.2;
    p.noStroke();
    p.fill(45, 70, 90);
    //p.circle(p.mouseX, p.mouseY, centerR * 2);

    if (SHOW_DEBUG) {
      const pad = 8;
      const text = `petals: ${petals} | len: ${baseLen.toFixed(
        0
      )} | width: ${baseWidth.toFixed(0)} | seed: ${seed}`;
      p.textFont("monospace");
      p.textSize(12);
      const tw = p.textWidth(text) + pad * 2;
      const th = 20;
      p.noStroke();
      p.fill(0, 0, 0, 30);
      p.rect(p.width - tw - 10, 10, tw, th, 6);
      p.fill(0, 0, 20);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(text, p.width - tw - 10 + pad, 10 + th / 2);
    }
  };

function drawTeardropPetal(
  x: number,
  y: number,
  len: number,
  wid: number,
  h: number,
  s: number,
  b: number
) {
  if (
    !isFinite(x) || !isFinite(y) ||
    !isFinite(len) || !isFinite(wid) ||
    len <= 0 || wid <= 0
  ) return;

  const cpWobble = 0.22;
  const jx1 = wid * cpWobble * p.random(-1, 1);
  const jx2 = wid * cpWobble * p.random(-1, 1);
  const jy1 = len * cpWobble * p.random(-1, 1);
  const jy2 = len * cpWobble * p.random(-1, 1);

  // Use Canvas 2D path to avoid p5's bezierVertex overload (source of v3.position)
  const ctx = p.drawingContext as CanvasRenderingContext2D;

  p.noStroke();
  p.fill(h, s, b, 100); // sets ctx.fillStyle under the hood

  ctx.save();
  ctx.beginPath();
  // base
  ctx.moveTo(x, y);
  // right side up to tip
  ctx.bezierCurveTo(
    x + wid * 0.55 + jx1, y - 0.05 * len + jy1,
    x + wid * 0.35 + jx2, y - 0.75 * len + jy2,
    x,                   y - len
  );
  // left side back to base
  ctx.bezierCurveTo(
    x - wid * 0.35 - jx2, y - 0.75 * len - jy2,
    x - wid * 0.55 - jx1, y - 0.05 * len - jy1,
    x,                    y
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

};
