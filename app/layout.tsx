import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { NavLinks, AdminSettingsLink } from "@/components/nav-links";
import { UserButton } from "@/components/user-button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rechnungsdaten-Extraktor",
  description: "Strukturierte Daten aus PDF-Rechnungen mit KI extrahieren",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <header className="border-b bg-card">
            <div className="max-w-5xl mx-auto px-4 h-10 flex items-center justify-between text-xs">
              <nav className="flex items-center gap-4">
                <a href="/" className="flex items-center gap-1.5 font-semibold text-sm hover:text-foreground transition-colors">
                  <Image src="/icon.png" alt="" width={20} height={20} className="rounded-sm" />
                  Rechnungs-Extraktor
                </a>
                <NavLinks />
              </nav>
              <div className="flex items-center gap-3">
                <AdminSettingsLink />
                <UserButton />
              </div>
            </div>
          </header>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
