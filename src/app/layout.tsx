// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { goldenbookFont, montserratFont } from "./fonts";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.APP_BASE_URL ||
  "https://flowersformolly.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "flowers for molly",
  description: "a memorial garden.",
  openGraph: {
    title: "flowers for molly",
    description: "a memorial garden.",
    url: "/",
    siteName: "flowers for molly",
    images: [
      {
        url: "/preview/hero.png",
        width: 1400,
        height: 922,
        alt: "flowers for molly preview image",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "flowers for molly",
    description: "a memorial garden.",
    images: ["/preview/hero.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
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
        className={`${goldenbookFont.variable} ${montserratFont.variable} antialiased`}
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
