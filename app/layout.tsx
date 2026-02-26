import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Invoice Data Extractor",
  description: "Extract structured data from PDF invoices using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b bg-card">
          <div className="max-w-5xl mx-auto px-4 h-10 flex items-center justify-between text-xs">
            <nav className="flex items-center gap-4">
              <a href="/" className="font-semibold text-sm hover:text-foreground transition-colors">Invoice Extractor</a>
              <a href="/invoices" className="text-muted-foreground hover:text-foreground transition-colors">Invoices</a>
            </nav>
            <nav className="flex items-center gap-4 text-muted-foreground">
              <a href="http://127.0.0.1:54423" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                Studio
              </a>
              <a href="http://127.0.0.1:54421" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                API
              </a>
              <a href="http://127.0.0.1:54424" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                Inbucket
              </a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
