import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
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
      className={`${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
