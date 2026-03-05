"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/auth";

const ROLE_LEVEL: Record<Role, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
  no_access: 0,
};

export function RequireAuth({
  children,
  minRole = "viewer",
}: {
  children: React.ReactNode;
  minRole?: Role;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const userRole = session?.user?.role ?? "no_access";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/sign-in");
    } else if (status === "authenticated" && userRole === "no_access") {
      router.replace("/unauthorized");
    }
  }, [status, userRole, router]);

  if (status === "loading") {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-muted-foreground text-sm">Laden...</p>
      </main>
    );
  }

  if (!session || userRole === "no_access") return null;

  if (ROLE_LEVEL[userRole] < ROLE_LEVEL[minRole]) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive font-medium">
          Keine Berechtigung. Du benötigst mindestens die Rolle &ldquo;{minRole}&rdquo;.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
