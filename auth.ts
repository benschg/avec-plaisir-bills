import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { app_users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type Role = "admin" | "editor" | "viewer" | "no_access";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/auth/sign-in",
  },
  callbacks: {
    async jwt({ token, account, trigger }) {
      // On first sign-in, persist the Google sub
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }

      // Look up role on sign-in or when not yet cached in the token
      if (trigger === "signIn" || trigger === "signUp" || !token.role) {
        const email = token.email?.toLowerCase();
        if (email) {
          try {
            const result = await db
              .select({ role: app_users.role })
              .from(app_users)
              .where(eq(app_users.email, email))
              .limit(1);
            token.role = (result[0]?.role as Role) ?? "no_access";
          } catch (err) {
            console.error("[auth] jwt role lookup error:", err);
            token.role = token.role ?? "no_access";
          }
        } else {
          token.role = "no_access";
        }
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = (token.role as Role) ?? "no_access";
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      const userId = account?.providerAccountId ?? user.id;
      if (!userId || !user.email) return;

      const normalizedEmail = user.email.toLowerCase().trim();
      const now = new Date();

      try {
        await db
          .insert(app_users)
          .values({
            id: userId,
            email: normalizedEmail,
            name: user.name ?? null,
            image: user.image ?? null,
            role: "no_access",
            created_at: now,
          })
          .onConflictDoUpdate({
            target: app_users.email,
            set: {
              id: userId,
              name: user.name ?? null,
              image: user.image ?? null,
            },
          });
      } catch (err) {
        console.error("[auth] signIn event error:", err);
      }
    },
  },
});
