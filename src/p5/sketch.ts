// src/p5/sketch.ts
export const sketch = (p: any) => {
  let webglOk = false;
  const SHOW_DEBUG = true; // flip to false to hide the banner

  p.setup = () => {
    p.pixelDensity(1); // avoids Safari/HiDPI quirks
    p.createCanvas(p.windowWidth, p.windowHeight);

    const Ctx =
      (window as any).WebGL2RenderingContext ??
      (window as any).WebGLRenderingContext;
    webglOk = !!(p.drawingContext && Ctx && p.drawingContext instanceof Ctx);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  p.draw = () => {
    p.ellipse(p.mouseX, p.mouseY, 50, 50);
  };
};
