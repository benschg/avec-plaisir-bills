import Image from "next/image";
import { AuthView } from "@neondatabase/auth/react";

export const dynamicParams = false;

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6 min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col items-center gap-2 mb-2">
        <Image src="/icon.png" alt="" width={128} height={128} className="rounded-xl" />
        <h1 className="text-xl font-bold tracking-tight">Rechnungs-Extraktor</h1>
      </div>
      <AuthView path={path} />
    </main>
  );
}
