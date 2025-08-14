// src/app/page.tsx
'use client';

import React, { useEffect, useRef } from "react";
import { sketch } from "@/p5/sketch";

export default function Page() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5InstanceRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mod = await import("p5");
      const P5 = (mod as any).default ?? mod;

      if (!cancelled && hostRef.current) {
        p5InstanceRef.current = new P5(sketch, hostRef.current);
      }
    })();

    return () => {
      cancelled = true;
      if (p5InstanceRef.current) {
        try { p5InstanceRef.current.remove(); } catch { }
        p5InstanceRef.current = null;
      }
    };
  }, []);

  // Full-viewport host; fixed avoids body margin scrollbars
  return (
    <>
      <div
        ref={hostRef}
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
        }}
      />
      <h1 style={{ position: "absolute", top: 50, left: 50, zIndex: 1000, fontSize: "10rem" }}>
        Flowers For Molly
      </h1>
    </>
  );
}
