import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NeonAuthUIProvider, UserButton } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";
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
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <NeonAuthUIProvider authClient={authClient as any}>
          <header className="border-b bg-card">
            <div className="max-w-5xl mx-auto px-4 h-10 flex items-center justify-between text-xs">
              <nav className="flex items-center gap-4">
                <a href="/" className="font-semibold text-sm hover:text-foreground transition-colors">Rechnungs-Extraktor</a>
                <a href="/invoices" className="text-muted-foreground hover:text-foreground transition-colors">Rechnungen</a>
              </nav>
              <UserButton size="icon" />
            </div>
          </header>
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
