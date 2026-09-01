import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateUniqueUsername } from "@/lib/username";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Self-hosted behind nginx: Auth.js only trusts the incoming Host header
  // when this is set (Vercel gets it for free; we don't).
  trustHost: true,
  // Credentials provider requires JWT sessions (DB sessions only work for
  // OAuth providers under the adapter). This still works fine alongside Google.
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
  events: {
    // Fires when the adapter creates a brand-new User row — i.e. a first-
    // time Google sign-up (credentials signups create their own username
    // directly in /api/auth/register and never hit this). Every account
    // needs a username, and there's no form step for Google to collect one,
    // so generate one now; the user can rename it any time from Account
    // settings (usernameAutoAssigned drives the nudge to do so there).
    async createUser({ user }) {
      if (!user.id) return;
      const seed = user.email?.split("@")[0] ?? user.name ?? "user";
      const username = await generateUniqueUsername(prisma, seed);
      await prisma.user.update({
        where: { id: user.id },
        data: { username, usernameAutoAssigned: true },
      });
    },
  },
});
