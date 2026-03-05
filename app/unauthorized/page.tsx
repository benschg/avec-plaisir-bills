"use client";

import Image from "next/image";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-[calc(100vh-2.5rem)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <Image src="/icon.png" alt="" width={80} height={80} className="rounded-xl opacity-50" />
        <h1 className="text-xl font-bold">Zugriff verweigert</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Ihr Konto ist nicht berechtigt, diese Anwendung zu nutzen.
          Bitte kontaktieren Sie den Administrator.
        </p>
      </div>
    </main>
  );
}
