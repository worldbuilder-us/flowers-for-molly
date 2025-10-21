// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css"; // ensure html/body heights set here

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "flowers for molly",
  description: "a generative memoriam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // pick a random gradient 1..5 during render
  const idx = Math.floor(Math.random() * 5) + 1;
  // filenames like bg-gradient-01.png ... bg-gradient-05.png
  // const bgFilename = `/gradients/bg-gradient-${String(idx).padStart(2, "0")}.png`;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          margin: 0,
          minHeight: "100%",
          // backgroundImage: `url('${bgFilename}')`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "rgba(255,255,255,0.82)",
          opacity: 1,
        }}
      >
        {children}
      </body>
    </html>
  );
}
