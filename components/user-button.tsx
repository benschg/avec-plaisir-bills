"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function UserButton() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground"
      onClick={() => signOut()}
      title="Abmelden"
    >
      {session.user.email}
    </Button>
  );
}
