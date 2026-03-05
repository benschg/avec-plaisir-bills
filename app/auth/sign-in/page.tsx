"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Image src="/icon.png" alt="" width={64} height={64} className="rounded-xl" />
          </div>
          <CardTitle>Rechnungs-Extraktor</CardTitle>
          <CardDescription>
            Melde dich an, um Rechnungsdaten zu extrahieren und zu verwalten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => signIn("google", { callbackUrl: "/" })}>
            Mit Google anmelden
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
