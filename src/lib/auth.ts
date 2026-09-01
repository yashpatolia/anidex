import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// The Credentials provider only ever authenticates the seeded dev user
// (see prisma/seed.ts) — there's no real signup flow behind it. Registering
// it at all is dev/CI-only; production relies solely on Google.
const isDev = process.env.NODE_ENV !== "production";

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
    ...(isDev
      ? [
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
        ]
      : []),
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
});
