import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEAS AI — Workforce orb interface",
  description:
    "NextEdge Access Solutions (NEAS) AI workforce — an animated orb and reasoning-graph view of the rope access, renewables, offshore and power specialist roles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
