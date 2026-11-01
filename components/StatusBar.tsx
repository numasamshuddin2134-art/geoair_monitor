"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/lib/stores/useAppStore";
import { SearchBar } from "@/components/SearchBar";
import {
  Globe,
  Map as MapIcon,
  Layers,
  Bell,
  Scale,
} from "lucide-react";

interface StatusBarProps {
  onOpenAlerts?: () => void;
  alertCount?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onOpenAlerts, alertCount = 0 }) => {
  const {
    projection,
    toggleProjection,
    leftPanelOpen,
    setLeftPanelOpen,
    comparisonLocations,
    setCompareModalOpen,
  } = useAppStore();

  const [utcTime, setUtcTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace("GMT", "UTC"));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-3 sm:px-4 select-none">
      {/* Brand & Left Panel Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          title="Toggle Sensor & Sector Layers"
          aria-label="Toggle Data Layers"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-600"
        >
          <Layers className="w-4 h-4 text-slate-300" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
            <span>GeoAir</span>
            <span className="text-slate-400 font-normal">Monitor</span>
          </h1>
        </div>
      </div>

      {/* Center: Integrated Geocoding Search Bar */}
      <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-2 sm:mx-4">
        <SearchBar />
      </div>

      {/* Right Navigation & Tools */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* UTC Clock Readout */}
        <div className="hidden lg:block text-right pr-3 border-r border-slate-800">
          <div className="text-xs font-mono-data text-slate-400">{utcTime || "UTC TIME"}</div>
        </div>

        {/* Multi-Location Compare Trigger */}
        <button
          onClick={() => setCompareModalOpen(true)}
          title="Compare Multi-Location Sectors"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            comparisonLocations.length > 0
              ? "bg-slate-800 text-white border-slate-600 hover:bg-slate-700"
              : "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden sm:inline">Compare</span>
          {comparisonLocations.length > 0 && (
            <span className="px-1.5 py-0.2 bg-sky-500 text-slate-950 rounded-full text-[10px] font-bold">
              {comparisonLocations.length}
            </span>
          )}
        </button>

        {/* Alerts Trigger */}
        {onOpenAlerts && (
          <button
            onClick={onOpenAlerts}
            title="Environmental Threat Alerts"
            aria-label="Environmental Alerts"
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors focus:outline-none"
          >
            <Bell className="w-4 h-4 text-slate-300" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </button>
        )}

        {/* 2D / 3D Projection Toggle */}
        <button
          onClick={toggleProjection}
          title="Toggle 3D Globe / 2D Map"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
        >
          {projection === "globe" ? (
            <>
              <Globe className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">3D Globe</span>
            </>
          ) : (
            <>
              <MapIcon className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">2D Map</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
