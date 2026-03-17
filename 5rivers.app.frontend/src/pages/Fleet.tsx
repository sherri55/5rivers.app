import { useState } from "react"
import { Drivers } from "@/pages/Drivers"
import { Units } from "@/pages/Units"

export function Fleet() {
  const [activeTab, setActiveTab] = useState<"Units" | "Drivers">("Units")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="bg-navy-light p-1 rounded-xl border border-slate-800 shadow-sm flex max-w-sm">
          <button
            onClick={() => setActiveTab("Units")}
            className={`flex-1 py-2 px-6 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === "Units"
                ? "bg-primary text-navy shadow-md"
                : "text-slate-500 hover:bg-slate-800"
            }`}
          >
            Units
          </button>
          <button
            onClick={() => setActiveTab("Drivers")}
            className={`flex-1 py-2 px-6 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === "Drivers"
                ? "bg-primary text-navy shadow-md"
                : "text-slate-500 hover:bg-slate-800"
            }`}
          >
            Drivers
          </button>
        </div>
      </div>

      {activeTab === "Units" ? <Units /> : <Drivers />}
    </div>
  )
}
