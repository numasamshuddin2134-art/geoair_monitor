"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/stores/useAppStore";
import {
  Search,
  Globe,
  MapPin,
  Flame,
  Wind,
  X,
  Compass,
  Scale,
  Grid,
} from "lucide-react";

interface CommandItem {
  id: string;
  category: "Location" | "Layer" | "System";
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setSelectedPoint,
    toggleProjection,
    toggleLayer,
    clearSelection,
    projection,
    setCompareModalOpen,
  } = useAppStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const items: CommandItem[] = [
    {
      id: "loc-delhi",
      category: "Location",
      label: "New Delhi, India",
      sublabel: "28.6139°N, 77.2090°E • High pollution surveillance",
      icon: <MapPin className="w-4 h-4 text-red-400" />,
      action: () => {
        setSelectedPoint({
          id: "delhi",
          name: "New Delhi, India",
          lat: 28.6139,
          lng: 77.2090,
          country: "India",
        });
      },
    },
    {
      id: "loc-tokyo",
      category: "Location",
      label: "Tokyo, Japan",
      sublabel: "35.6762°N, 139.6503°E • Kanto Urban Basin",
      icon: <MapPin className="w-4 h-4 text-sky-400" />,
      action: () => {
        setSelectedPoint({
          id: "tokyo",
          name: "Tokyo, Japan",
          lat: 35.6762,
          lng: 139.6503,
          country: "Japan",
        });
      },
    },
    {
      id: "loc-ny",
      category: "Location",
      label: "New York City, USA",
      sublabel: "40.7128°N, 74.0060°W • North America East",
      icon: <MapPin className="w-4 h-4 text-sky-400" />,
      action: () => {
        setSelectedPoint({
          id: "newyork",
          name: "New York City, USA",
          lat: 40.7128,
          lng: -74.0060,
          country: "United States",
        });
      },
    },
    {
      id: "loc-amazon",
      category: "Location",
      label: "Amazon Basin, Brazil",
      sublabel: "-3.1190°S, -60.0217°W • Active thermal & wildfire tracking",
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      action: () => {
        setSelectedPoint({
          id: "amazon",
          name: "Amazon Basin, Brazil",
          lat: -3.1190,
          lng: -60.0217,
          country: "Brazil",
        });
      },
    },
    {
      id: "layer-aqi",
      category: "Layer",
      label: "Toggle Air Quality Layer",
      sublabel: "Open-Meteo European and US EPA AQI feed",
      icon: <Wind className="w-4 h-4 text-sky-400" />,
      action: () => toggleLayer("aqi"),
    },
    {
      id: "layer-fires",
      category: "Layer",
      label: "Toggle NASA FIRMS Thermal Hotspots",
      sublabel: "Active VIIRS satellite fire anomaly feed",
      icon: <Flame className="w-4 h-4 text-red-400" />,
      action: () => toggleLayer("fires"),
    },
    {
      id: "layer-weather",
      category: "Layer",
      label: "Toggle Weather & Wind Vectors",
      sublabel: "Temperature, humidity, pressure, and wind streamlines",
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
      action: () => toggleLayer("weather"),
    },
    {
      id: "layer-heatmap",
      category: "Layer",
      label: "Toggle AQI Density Heatmap",
      sublabel: "Global particulate density gradient layer",
      icon: <Grid className="w-4 h-4 text-purple-400" />,
      action: () => toggleLayer("heatmap"),
    },
    {
      id: "system-compare",
      category: "System",
      label: "Open Sector Comparison Console",
      sublabel: "Side-by-side multi-sector telemetry & AI brief",
      icon: <Scale className="w-4 h-4 text-sky-400" />,
      action: () => setCompareModalOpen(true),
    },
    {
      id: "sys-proj",
      category: "System",
      label: `Switch Projection (Current: ${projection === "globe" ? "3D Globe" : "2D Map"})`,
      sublabel: "Toggle between 3D Spherical Globe and 2D Mercator",
      icon: <Globe className="w-4 h-4 text-sky-400" />,
      action: () => toggleProjection(),
    },
    {
      id: "sys-clear",
      category: "System",
      label: "Clear Target Selection",
      sublabel: "Purge active marker or drawn polygon boundary",
      icon: <X className="w-4 h-4 text-slate-400" />,
      action: () => clearSelection(),
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.sublabel.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: CommandItem) => {
    item.action();
    setCommandPaletteOpen(false);
    setQuery("");
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search location, sector, or command..."
            autoFocus
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-500"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command list */}
        <div className="max-h-72 overflow-y-auto mt-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching locations or commands found
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                  idx === selectedIndex
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-md bg-slate-950 border border-slate-800 shrink-0">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.sublabel}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 shrink-0 ml-2">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800 text-[11px] text-slate-400 px-2">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-slate-500">GeoAir Intelligence</span>
        </div>
      </div>
    </div>
  );
};
