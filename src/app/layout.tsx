import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Nunito, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const nav = Nunito({
  variable: "--font-nav",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LIZER — лазерная резка по модели",
  description:
    "Конфигуратор металлических узоров: загрузка модели, разбор на части, цена, оформление и оплата.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${sans.variable} ${nav.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
