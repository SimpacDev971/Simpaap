import prisma from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth, { type AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Refresh token every hour
  },

  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password)
          throw new Error("Identifiants invalides");

        // Rate limiting on login attempts
        const rateLimitKey = `login:${credentials.email.toLowerCase()}`;
        const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
        if (!rateLimit.allowed) {
          throw new Error("Trop de tentatives. Réessayez plus tard.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        // Generic error message to prevent user enumeration
        if (!user) throw new Error("Identifiants invalides");

        const valid = await compare(credentials.password, user.password);
        if (!valid) throw new Error("Identifiants invalides");

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          tenantSlug: user.tenant?.subdomain || null,
          theme: user.theme || "default",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user,trigger,session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantSlug = user.tenantSlug;
        token.theme = user.theme;
      }
      // 2. Quand on appelle update() → rafraîchir le token depuis la DB
  if (trigger === "update") {
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id },
      select: { theme: true },
    });

    token.theme = dbUser?.theme ?? token.theme;
  }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.tenantSlug = token.tenantSlug;
        session.user.theme = token.theme;
      }
      return session;
    },
  },

  pages: { signIn: "/login" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
