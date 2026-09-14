import type { Metadata } from "next";
import React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CommandRail } from "@/components/shell/CommandRail";
import { TopBar } from "@/components/shell/TopBar";
import { StatusStrip } from "@/components/shell/StatusStrip";
import { Bootstrap } from "@/components/shell/Bootstrap";

import { DemoDirectorBar } from "@/components/demo/DemoDirectorBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sagar-Drishti | Maritime Intelligence Command Center",
  description:
    "Indian Coast Guard Maritime Domain Awareness — Satellite SAR oil spill detection, Lagrangian reverse drift modelling, and Section 65B MARPOL Annex I evidence attribution platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="h-full w-full overflow-hidden bg-bg-0 text-ink font-sans flex flex-col antialiased">
        <Bootstrap />
        <TopBar />
        <StatusStrip />
        <div className="flex flex-1 overflow-hidden">
          <CommandRail />
          <main className="flex-1 overflow-hidden relative">
            {children}
            <DemoDirectorBar />
          </main>
        </div>
      </body>
    </html>
  );
}