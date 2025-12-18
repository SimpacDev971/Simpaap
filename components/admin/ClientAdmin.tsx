"use client";

import SimpaapCrud from "@/components/admin/simpaap/SimpaapCrud";
import TenantsCrud from "@/components/admin/TenantsCrud";
import UsersCrud from "@/components/admin/UsersCrud";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useState } from "react";

type TabType = "users" | "tenants" | "simpaap";

export default function ClientAdmin({ tenantSubdomain }: { tenantSubdomain: string }) {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const { data: session } = useSession();

  // Afficher les tabs SUPERADMIN seulement sur le subdomain admin
  const isSuperAdmin = tenantSubdomain === "admin" && session?.user?.role === "SUPERADMIN";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-2">
          <Button
            variant={activeTab === "users" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("users")}
            className={activeTab === "users" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground border-b-2 border-transparent"}
          >
            Utilisateurs
          </Button>
          {isSuperAdmin && (
            <>
              <Button
                variant={activeTab === "tenants" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("tenants")}
                className={activeTab === "tenants" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground border-b-2 border-transparent"}
              >
                Clients
              </Button>
              <Button
                variant={activeTab === "simpaap" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("simpaap")}
                className={activeTab === "simpaap" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground border-b-2 border-transparent"}
              >
                Simpaap
              </Button>
            </>
          )}
        </nav>
      </div>

      {/* Contenu dynamique */}
      <div>
        {activeTab === "users" && <UsersCrud tenantSubdomain={tenantSubdomain} />}
        {activeTab === "tenants" && isSuperAdmin && <TenantsCrud />}
        {activeTab === "simpaap" && isSuperAdmin && <SimpaapCrud />}
      </div>
    </div>
  );
}
