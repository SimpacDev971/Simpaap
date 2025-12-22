"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import AffranchissementsCrud from "./AffranchissementsCrud";
import EnveloppesCrud from "./EnveloppesCrud";
import PrintOptionsCrud from "./shared/PrintOptionsCrud";

type SubTabType = "colors" | "sides" | "enveloppes" | "affranchissements";

interface SubTabConfig {
  id: SubTabType;
  label: string;
  component: "PrintOptionsCrud" | "EnveloppesCrud" | "AffranchissementsCrud";
  apiEndpoint?: string;
  hasDescription?: boolean;
}

const SUB_TABS: SubTabConfig[] = [
  { id: "colors", label: "Couleurs", component: "PrintOptionsCrud", apiEndpoint: "/api/print-options/colors", hasDescription: false },
  { id: "sides", label: "Côtés", component: "PrintOptionsCrud", apiEndpoint: "/api/print-options/sides", hasDescription: false },
  { id: "enveloppes", label: "Enveloppes", component: "EnveloppesCrud" },
  { id: "affranchissements", label: "Affranchissements", component: "AffranchissementsCrud" },
];

export default function SimpaapCrud() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("colors");

  const currentTabConfig = SUB_TABS.find((t) => t.id === activeSubTab);

  const renderContent = () => {
    if (!currentTabConfig) return null;

    switch (currentTabConfig.component) {
      case "EnveloppesCrud":
        return <EnveloppesCrud />;
      case "AffranchissementsCrud":
        return <AffranchissementsCrud />;
      case "PrintOptionsCrud":
      default:
        return (
          <PrintOptionsCrud
            key={activeSubTab}
            title={currentTabConfig.label}
            apiEndpoint={currentTabConfig.apiEndpoint || ""}
            hasDescription={currentTabConfig.hasDescription}
          />
        );
    }
  };

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

      {/* Content */}
      {renderContent()}
    </div>
  );
}
