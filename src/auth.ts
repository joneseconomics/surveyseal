import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch role from database
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "RESEARCHER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Default role is set in Prisma schema, but we can log here
      console.log(`[Auth] New user created: ${user.email}`);
    },
    async signIn({ user }) {
      // Auto-link pending collaborator invitations to the signing-in user
      if (user.id && user.email) {
        try {
          await db.surveyCollaborator.updateMany({
            where: {
              email: user.email.toLowerCase(),
              userId: null,
            },
            data: {
              userId: user.id,
              acceptedAt: new Date(),
            },
          });
        } catch (err) {
          console.error("[Auth] Failed to auto-link collaborator invitations:", err);
        }
      }
    },
  },
});
