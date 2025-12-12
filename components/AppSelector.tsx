"use client";

import PrintApp from "@/components/app/print/printApp";
import { useState } from "react";

export default function AppSelector() {
  const [flux, setFlux] = useState<"papier" | "numerique">("papier");

  return (
    <>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setFlux("papier")}
          className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            flux === "papier"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <div
            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
              flux === "papier" ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
            }`}
          >
            {flux === "papier" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>
          <span>Papier</span>
        </button>

        <button
          onClick={() => setFlux("numerique")}
          className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            flux === "numerique"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full border ${
              flux === "numerique" ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
            }`}
          />
          <span>Numérique (Email/SMS)</span>
        </button>
      </div>

      {flux === "papier" && (
        <div className="mt-6">
          <PrintApp />
        </div>
      )}
    </>
  );
}
