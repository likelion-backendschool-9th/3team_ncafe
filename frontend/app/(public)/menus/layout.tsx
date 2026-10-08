import type { ReactNode } from "react";
import localFont from "next/font/local";

const menuName = localFont({ src: "../../fonts/BMEULJIROTTF.ttf", variable: "--font-menu-name", display: "swap" });

export default function MenusLayout({ children }: { children: ReactNode }) {
  return <div className={menuName.variable}>{children}</div>;
}
