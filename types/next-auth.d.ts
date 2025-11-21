import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      tenantSlug?: string | null;
      theme?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    tenantSlug?: string | null;
    theme?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    tenantSlug?: string | null;
    theme?: string | null;
  }
}
