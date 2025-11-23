// src/app/components/Header.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { montserratFont } from "../fonts";
import styles from "./Header.module.css";

type NavItem = {
  label: string;
  href: string;
};

function getNavForPath(pathname: string): NavItem[] {
  // Normalize route bases
  const isHome = pathname === "/";
  const isSubmit = pathname.startsWith("/submit");
  const isAbout = pathname.startsWith("/about");
  const isView = pathname.startsWith("/view");

  if (isHome) {
    // Garden = home
    return [
      { label: "Submit", href: "/submit" },
      { label: "About", href: "/about" },
      { label: "Index", href: "/view" },
    ];
  }

  if (isSubmit) {
    return [
      { label: "Back To The Garden", href: "/" },
      { label: "About", href: "/about" },
      { label: "Index", href: "/view" },
    ];
  }

  if (isAbout) {
    return [
      { label: "Back To The Garden", href: "/" },
      { label: "Submit", href: "/submit" },
      { label: "Index", href: "/view" },
    ];
  }

  // /view and /view/[id] (index)
  if (isView) {
    return [
      { label: "Back To The Garden", href: "/" },
      { label: "Submit", href: "/submit" },
      { label: "About", href: "/about" },
    ];
  }

  // Fallback (shouldn't really hit)
  return [
    { label: "Back To The Garden", href: "/" },
    { label: "Submit", href: "/submit" },
    { label: "Index", href: "/view" },
  ];
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/view")
    return pathname === "/view" || pathname.startsWith("/view/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname() || "/";
  const items = getNavForPath(pathname);

  return (
    <header className={`${styles.header} ${montserratFont.className}`}>
      <nav role="navigation" aria-label="Main" className={styles.nav}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${active ? styles.linkActive : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
