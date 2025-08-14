// src/app/page.tsx
'use client';

import React, { useEffect, useRef } from "react";
import type p5 from "p5";
import { sketch } from "@/p5/sketch";

export default function Page() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: P5 } = await import("p5");

      if (!cancelled && hostRef.current) {
        p5InstanceRef.current = new P5(sketch, hostRef.current);
      }
    })();

    return () => {
      cancelled = true;
      p5InstanceRef.current?.remove();
      p5InstanceRef.current = null;
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
