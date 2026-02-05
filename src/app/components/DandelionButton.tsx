// src/app/components/DandelionButton.tsx
"use client";

import React, { useState } from "react";
import DandelionParticles from "./DandelionParticles";
import styles from "./DandelionButton.module.css";

type DandelionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  particleSeed?: number;
};

export default function DandelionButton({
  children,
  className,
  particleSeed = 1337,
  onMouseEnter,
  onMouseLeave,
  ...props
}: DandelionButtonProps) {
  const [burst, setBurst] = useState(0);
  const [active, setActive] = useState(false);

  const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMouseEnter?.(event);
    if (!active) {
      setActive(true);
      setBurst((prev) => prev + 1);
      window.setTimeout(() => setActive(false), 12000);
    }
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(event);
  };

  return (
    <button
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className ? `${styles.button} ${className}` : styles.button}
    >
      <span className={styles.content}>{children}</span>
      {active ? (
        <DandelionParticles
          key={burst}
          seed={particleSeed + burst}
          className={styles.particles}
          dotRadius={4}
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(0, 0)",
          }}
        />
      ) : null}
    </button>
  );
}
