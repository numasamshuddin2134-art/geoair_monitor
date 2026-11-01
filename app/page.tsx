"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { LayerPanel } from "@/components/Panels/LayerPanel";
import { SectorDashboard } from "@/components/Panels/SectorDashboard";
import { AlertFeed, generateAlertsFromProfile } from "@/components/AlertFeed";
import { CompareView } from "@/components/CompareView";
import { EnvironmentalProfile } from "@/lib/types/environmental";
import { Loader2 } from "lucide-react";

const GlobeMap = dynamic(
  () => import("@/components/Map/GlobeMap").then((mod) => mod.GlobeMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="text-xs font-medium text-slate-300">
          Loading 3D Globe & Satellite Telemetry...
        </span>
      </div>
    ),
  }
);

export default function Home() {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<EnvironmentalProfile | null>(null);

  const activeAlerts = generateAlertsFromProfile(currentProfile);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090d16]">
      {/* Top Navigation Bar with Integrated Search & Alert Bell */}
      <StatusBar
        onOpenAlerts={() => setAlertsOpen(true)}
        alertCount={activeAlerts.length}
      />

      {/* Interactive 3D Globe & Map Viewport (Starts cleanly below Navbar) */}
      <div className="absolute inset-0 pt-14 z-0">
        <GlobeMap />
      </div>

      {/* Floating Left Layer Controls */}
      <LayerPanel />

      {/* Floating / Mobile Drawer Sector Dashboard */}
      <SectorDashboard onProfileLoaded={(prof) => setCurrentProfile(prof)} />

      {/* Alerts Feed Drawer / Modal */}
      <AlertFeed
        isOpen={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        profile={currentProfile}
      />

      {/* Multi-Location Comparison Modal */}
      <CompareView />

      {/* Command Palette (⌘K) */}
      <CommandPalette />
    </main>
  );
}
