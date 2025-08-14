// src/p5/sketch.ts

import type p5 from "p5";

export const sketch = (p: p5) => {
  let webglOk = false;
  const SHOW_DEBUG = true; // flip to false to hide the banner

  p.setup = () => {
    p.pixelDensity(1); // avoids Safari/HiDPI quirks
    p.createCanvas(p.windowWidth, p.windowHeight);

       const ctx =
      p.drawingContext as
        | WebGLRenderingContext
        | WebGL2RenderingContext
        | CanvasRenderingContext2D;

    webglOk =
      (typeof WebGL2RenderingContext !== "undefined" &&
        ctx instanceof WebGL2RenderingContext) ||
      (typeof WebGLRenderingContext !== "undefined" &&
        ctx instanceof WebGLRenderingContext);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  p.draw = () => {
    p.ellipse(p.mouseX, p.mouseY, 50, 50);
  };
};
