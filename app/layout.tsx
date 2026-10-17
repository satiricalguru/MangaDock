import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import Reveal from "@/components/Reveal";
import CommandSearch from "@/components/CommandSearch";
import SyncOnLogin from "@/components/SyncOnLogin";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "MangaDock · Read manga, manhwa & manhua", template: "%s · MangaDock" },
  description: "A free, colourful home for discovering and reading manga, manhwa and manhua.",
};

export const viewport: Viewport = { themeColor: "#0b0712" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en">
      <body className="min-h-dvh bg-ink pb-20 lg:pb-0">
        <SmoothScroll />
        <Reveal />
        <SyncOnLogin userId={user?.id ?? null} />
        <CommandSearch />
        <Nav user={user} />
        <main className="relative">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
