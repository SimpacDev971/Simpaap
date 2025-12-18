"use client";

import AppLayout from "@/components/layout/AppLayout";
import { ReactNode } from "react";

interface SubdomainLayoutProps {
  children: ReactNode;
}

export default function SubdomainLayout({ children }: SubdomainLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
