import localFont from "next/font/local";

export const goldenbookFont = localFont({
  src: [
    {
      path: "../../public/fonts/Goldenbook.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Goldenbook-Extrabold.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-goldenbook",
});

export const montserratFont = localFont({
  src: [
    {
      path: "../../public/fonts/Montserrat-SemiBold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-montserrat",
});
