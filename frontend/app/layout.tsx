import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";
import { SessionSync } from "./_components/SessionSync";
import { getCurrentUser } from "./_lib/session/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "삼다방",
  description: "그 시절 다방의 온기를 담은 삼다방",
};

const display = localFont({ src: "./fonts/Sungeum-Regular.woff2", variable: "--font-display", display: "swap" });
const serif = localFont({ src: "./fonts/GowunBatang-Regular.woff2", variable: "--font-serif", display: "swap" });
const body = localFont({ src: "./fonts/NotoSansKR.woff2", weight: "100 900", variable: "--font-body", display: "swap" });
const menuName = localFont({ src: "./fonts/BMEULJIROTTF.ttf", variable: "--font-menu-name", display: "swap" });

export default async function RootLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentUser();

  return (
    <html lang="ko">
      <body className={`${display.variable} ${serif.variable} ${body.variable} ${menuName.variable}`}>
        <SessionSync sessionKey={member ? `${member.role}:${member.id}` : "anonymous"} />
        <SiteHeader />
        <div className="site-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
