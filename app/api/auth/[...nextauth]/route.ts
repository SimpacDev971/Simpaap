import prisma from "@/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth, { type AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password)
          throw new Error("Email et mot de passe requis");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user) throw new Error("Utilisateur introuvable");

        const valid = await compare(credentials.password, user.password);
        if (!valid) throw new Error("Mot de passe incorrect");

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
