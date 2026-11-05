import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: { default: "Back office · Naija Sportsbook", template: "%s · Back office" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#07110d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
