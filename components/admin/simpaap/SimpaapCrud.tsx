"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import PrintOptionsCrud from "./shared/PrintOptionsCrud";

type SubTabType = "colors" | "sides" | "envelopes" | "postageTypes" | "postageSpeeds";

const SUB_TABS: { id: SubTabType; label: string; hasDescription: boolean }[] = [
  { id: "colors", label: "Couleurs", hasDescription: false },
  { id: "sides", label: "Côtés", hasDescription: false },
  { id: "envelopes", label: "Enveloppes", hasDescription: true },
  { id: "postageTypes", label: "Types d'affranchissement", hasDescription: false },
  { id: "postageSpeeds", label: "Vitesses d'envoi", hasDescription: false },
];

const API_ENDPOINTS: Record<SubTabType, string> = {
  colors: "/api/print-options/colors",
  sides: "/api/print-options/sides",
  envelopes: "/api/print-options/envelopes",
  postageTypes: "/api/print-options/postage-types",
  postageSpeeds: "/api/print-options/postage-speeds",
};

export default function SimpaapCrud() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("colors");

  const currentTabConfig = SUB_TABS.find((t) => t.id === activeSubTab);

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Gérez les options d'impression globales. Ces options peuvent ensuite être assignées aux clients via leurs paramètres.
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-border">
        <div className="flex flex-wrap gap-1">
          {SUB_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={activeSubTab === tab.id ? "secondary" : "ghost"}
              onClick={() => setActiveSubTab(tab.id)}
              className={`rounded-b-none ${
                activeSubTab === tab.id
                  ? "border-b-2 border-primary text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground"
              }`}
              size="sm"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content - Global options (no tenant needed) */}
      <PrintOptionsCrud
        key={activeSubTab}
        title={currentTabConfig?.label || ""}
        apiEndpoint={API_ENDPOINTS[activeSubTab]}
        hasDescription={currentTabConfig?.hasDescription}
      />
    </div>
  );
}
