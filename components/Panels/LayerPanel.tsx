"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/stores/useAppStore";
import { SavedLocation, RecentQuery } from "@/lib/database/savedLocations";
import {
  Wind,
  Flame,
  CloudRain,
  Grid,
  Layers,
  X,
  Trash2,
  Bookmark,
  MapPin,
  Clock,
  Pin,
  Check,
  RefreshCw,
} from "lucide-react";

export const LayerPanel: React.FC = () => {
  const {
    leftPanelOpen,
    setLeftPanelOpen,
    layers,
    toggleLayer,
    selectedPoint,
    selectedPolygon,
    setSelectedPoint,
    clearSelection,
    comparisonLocations,
    addComparisonLocation,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<"layers" | "saved" | "recent">("layers");
  const [savedList, setSavedList] = useState<SavedLocation[]>([]);
  const [recentList, setRecentList] = useState<RecentQuery[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);

  const fetchSaved = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch("/api/locations/saved");
      if (res.ok) {
        const json = await res.json();
        setSavedList(json.data || []);
      }
    } catch (e) {
      console.warn("Failed to fetch saved locations:", e);
    } finally {
      setLoadingSaved(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await fetch("/api/locations/recent?limit=8");
      if (res.ok) {
        const json = await res.json();
        setRecentList(json.data || []);
      }
    } catch (e) {
      console.warn("Failed to fetch recent queries:", e);
    }
  };

  useEffect(() => {
    if (leftPanelOpen) {
      if (activeTab === "saved") fetchSaved();
      if (activeTab === "recent") fetchRecent();
    }
  }, [leftPanelOpen, activeTab]);

  const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/locations/saved?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setSavedList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting saved location:", err);
    }
  };

  if (!leftPanelOpen) return null;

  return (
    <aside className="fixed left-3 sm:left-4 top-16 z-30 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl p-3.5 select-none animate-in fade-in slide-in-from-left duration-200 flex flex-col max-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-300" />
          <h2 className="text-xs font-semibold text-white tracking-wider uppercase">
            Data Feeds & Sectors
          </h2>
        </div>
        <button
          onClick={() => setLeftPanelOpen(false)}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-800 mb-3 text-xs">
        <button
          onClick={() => setActiveTab("layers")}
          className={`flex-1 pb-2 font-medium text-center border-b-2 transition-colors ${
            activeTab === "layers"
              ? "text-white border-white font-semibold"
              : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          Layers
        </button>
        <button
          onClick={() => {
            setActiveTab("saved");
            fetchSaved();
          }}
          className={`flex-1 pb-2 font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "saved"
              ? "text-white border-white font-semibold"
              : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          <Bookmark className="w-3 h-3 text-amber-400" />
          <span>Saved</span>
          {savedList.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full text-slate-300">
              {savedList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("recent");
            fetchRecent();
          }}
          className={`flex-1 pb-2 font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
            activeTab === "recent"
              ? "text-white border-white font-semibold"
              : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Recent</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {/* TAB 1: SENSOR LAYERS */}
        {activeTab === "layers" && (
          <div className="space-y-2 text-xs">
            {/* Air Quality */}
            <button
              onClick={() => toggleLayer("aqi")}
              className={`w-full p-2.5 flex items-center justify-between rounded-lg border transition-colors ${
                layers.aqi
                  ? "bg-slate-800/90 border-slate-700 text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wind className={`w-4 h-4 ${layers.aqi ? "text-sky-400" : "text-slate-500"}`} />
                <div className="text-left">
                  <div className="font-medium text-white">Air Quality (AQI / PM2.5)</div>
                  <div className="text-[10px] text-slate-400">Open-Meteo European & US EPA</div>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${layers.aqi ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-500"}`}>
                {layers.aqi ? "ON" : "OFF"}
              </span>
            </button>

            {/* NASA FIRMS Hotspots */}
            <button
              onClick={() => toggleLayer("fires")}
              className={`w-full p-2.5 flex items-center justify-between rounded-lg border transition-colors ${
                layers.fires
                  ? "bg-slate-800/90 border-slate-700 text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className={`w-4 h-4 ${layers.fires ? "text-rose-400 animate-pulse" : "text-slate-500"}`} />
                <div className="text-left">
                  <div className="font-medium text-white">Thermal Hotspots & Fires</div>
                  <div className="text-[10px] text-slate-400">NASA FIRMS VIIRS satellite feed</div>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${layers.fires ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-500"}`}>
                {layers.fires ? "ON" : "OFF"}
              </span>
            </button>

            {/* Weather */}
            <button
              onClick={() => toggleLayer("weather")}
              className={`w-full p-2.5 flex items-center justify-between rounded-lg border transition-colors ${
                layers.weather
                  ? "bg-slate-800/90 border-slate-700 text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CloudRain className={`w-4 h-4 ${layers.weather ? "text-emerald-400" : "text-slate-500"}`} />
                <div className="text-left">
                  <div className="font-medium text-white">Weather & Wind Vectors</div>
                  <div className="text-[10px] text-slate-400">Temperature, humidity, pressure</div>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${layers.weather ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
                {layers.weather ? "ON" : "OFF"}
              </span>
            </button>

            {/* Heatmap Layer */}
            <button
              onClick={() => toggleLayer("heatmap")}
              className={`w-full p-2.5 flex items-center justify-between rounded-lg border transition-colors ${
                layers.heatmap
                  ? "bg-slate-800/90 border-slate-700 text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Grid className={`w-4 h-4 ${layers.heatmap ? "text-amber-400" : "text-slate-500"}`} />
                <div className="text-left">
                  <div className="font-medium text-white">AQI Density Heatmap</div>
                  <div className="text-[10px] text-slate-400">Viewport coarse grid sampling</div>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${layers.heatmap ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"}`}>
                {layers.heatmap ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        )}

        {/* TAB 2: SAVED SECTORS (FIREBASE) */}
        {activeTab === "saved" && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
              <span>Saved Sectors</span>
              <button
                onClick={fetchSaved}
                title="Refresh saved list"
                className="text-slate-300 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingSaved ? "animate-spin" : ""}`} />
                <span>Sync</span>
              </button>
            </div>

            {savedList.length === 0 && !loadingSaved && (
              <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                <Bookmark className="w-6 h-6 text-slate-600 mx-auto" />
                <div>No saved locations yet.</div>
                <div className="text-[10px] text-slate-400">
                  Click &quot;Save Sector&quot; in the right dashboard to bookmark targets.
                </div>
              </div>
            )}

            {savedList.map((loc) => {
              const isPinned = comparisonLocations.some((l) => l.id === loc.id);
              return (
                <div
                  key={loc.id}
                  onClick={() =>
                    setSelectedPoint({
                      id: loc.id,
                      name: loc.name,
                      lat: loc.latitude,
                      lng: loc.longitude,
                      country: loc.country,
                    })
                  }
                  className="p-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-white truncate text-xs flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{loc.name}</span>
                    </div>
                    <div className="text-[10px] font-mono-data text-slate-400 mt-0.5">
                      {loc.latitude.toFixed(2)}°N, {loc.longitude.toFixed(2)}°E
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addComparisonLocation({
                          id: loc.id,
                          name: loc.name,
                          lat: loc.latitude,
                          lng: loc.longitude,
                          country: loc.country,
                        });
                      }}
                      title={isPinned ? "Already Pinned" : "Pin to Compare"}
                      className={`p-1.5 rounded transition-colors ${
                        isPinned ? "text-white bg-slate-800" : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {isPinned ? <Check className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => handleDeleteSaved(loc.id, e)}
                      title="Delete from Firebase"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: RECENT SEARCHES */}
        {activeTab === "recent" && (
          <div className="space-y-1.5 text-xs">
            <div className="text-[11px] text-slate-400 pb-1">Recent Searches</div>

            {recentList.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No recent searches logged.
              </div>
            ) : (
              recentList.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setSelectedPoint({
                      id: `recent_${idx}`,
                      name: item.name,
                      lat: item.latitude,
                      lng: item.longitude,
                    })
                  }
                  className="p-2 bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-slate-200 truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-mono-data text-slate-400 shrink-0">
                    {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Target Status Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span>Target Lock</span>
          <button
            onClick={clearSelection}
            className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>

        <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
          <div className="font-medium text-white truncate">
            {selectedPoint ? selectedPoint.name : selectedPolygon ? "Enclosed Polygon Area" : "None (Click map)"}
          </div>
          <div className="text-[10px] text-slate-400 font-mono-data mt-0.5">
            {selectedPoint
              ? `${selectedPoint.lat.toFixed(4)}°N, ${selectedPoint.lng.toFixed(4)}°E`
              : selectedPolygon
              ? `${selectedPolygon.length} Vertices sampled`
              : "Click anywhere on globe to select"}
          </div>
        </div>
      </div>
    </aside>
  );
};
