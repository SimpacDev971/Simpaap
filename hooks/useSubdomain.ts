"use client";

import { useParams } from "next/navigation";

export function useSubdomain(): string {
  const params = useParams();
  return (params?.subdomain as string) || "default";
}
