"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/stores/useAppStore";
import { EnvironmentalProfile } from "@/lib/types/environmental";
import { AQIDial } from "@/components/AQIDial";
import { WindCompass } from "@/components/WindCompass";
import { HistoricalChart } from "@/components/Charts/HistoricalChart";
import { AnalystBriefCard } from "@/components/AnalystBrief";
import {
  Activity,
  AlertTriangle,
  Cloud,
  Droplets,
  Flame,
  Gauge,
  Info,
  MapPin,
  RefreshCw,
  Thermometer,
  Wind,
  X,
  LineChart,
  Bookmark,
  Pin,
  Check,
  Layers,
} from "lucide-react";

interface SectorDashboardProps {
  onProfileLoaded?: (profile: EnvironmentalProfile) => void;
}

export const SectorDashboard: React.FC<SectorDashboardProps> = ({ onProfileLoaded }) => {
  const {
    selectedPoint,
    selectedPolygon,
    rightPanelOpen,
    setRightPanelOpen,
    comparisonLocations,
    addComparisonLocation,
    removeComparisonLocation,
    setCompareModalOpen,
  } = useAppStore();

  const [data, setData] = useState<EnvironmentalProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "pollutants" | "trends" | "weather" | "fires">("overview");
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(true);
  const [savedStatus, setSavedStatus] = useState<"idle" | "saving" | "saved">("idle");

  const currentLocId = selectedPoint
    ? selectedPoint.id
    : selectedPolygon
    ? `poly_${selectedPolygon.length}`
    : "default-loc";

  const isPinned = comparisonLocations.some((l) => l.id === currentLocId);

  const togglePin = () => {
    if (isPinned) {
      removeComparisonLocation(currentLocId);
    } else {
      if (selectedPoint) {
        addComparisonLocation(selectedPoint);
      } else if (data) {
        addComparisonLocation({
          id: currentLocId,
          name: data.location.name,
          lat: data.location.latitude,
          lng: data.location.longitude,
        });
      }
    }
  };

  const handleSaveToFirebase = async () => {
    if (!data) return;
    setSavedStatus("saving");
    try {
      const res = await fetch("/api/locations/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentLocId,
          name: data.location.name,
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        }),
      });
      if (res.ok) {
        setSavedStatus("saved");
        setTimeout(() => setSavedStatus("idle"), 2500);
      } else {
        setSavedStatus("idle");
      }
    } catch {
      setSavedStatus("idle");
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedPolygon && selectedPolygon.length >= 3) {
        const res = await fetch("/api/environmental", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: selectedPolygon }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json.data);
        if (onProfileLoaded) onProfileLoaded(json.data);
      } else if (selectedPoint) {
        const url = `/api/environmental?lat=${selectedPoint.lat}&lng=${selectedPoint.lng}&name=${encodeURIComponent(
          selectedPoint.name
        )}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json.data);
        if (onProfileLoaded) onProfileLoaded(json.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch environmental intelligence:", err);
      setError("Feed interrupted while querying orbital sensors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [selectedPoint, selectedPolygon]);

  if (!rightPanelOpen && !isMobileOpen) {
    return (
      <button
        onClick={() => {
          setRightPanelOpen(true);
          setIsMobileOpen(true);
        }}
        className="fixed bottom-4 right-4 z-30 px-3.5 py-2.5 bg-slate-900/95 text-white border border-slate-700/80 rounded-lg shadow-xl flex items-center gap-2 text-xs font-medium hover:bg-slate-800 transition-colors"
      >
        <Activity className="w-4 h-4 text-emerald-400" />
        <span>View Sector Intel</span>
      </button>
    );
  }

  return (
    <aside
      className={`fixed z-30 transition-[transform,opacity] duration-200 ease-out 
        /* Mobile: Bottom Sheet */
        inset-x-0 bottom-0 max-h-[75vh] bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 rounded-t-2xl shadow-2xl flex flex-col
        /* Desktop: Floating Right Sidebar */
        md:inset-auto md:right-4 md:top-16 md:bottom-4 md:w-96 md:border md:rounded-xl md:max-h-[calc(100vh-80px)] overflow-hidden`}
    >
      {/* Mobile Drag Handle */}
      <div className="w-full pt-2.5 pb-1 flex justify-center md:hidden">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
      </div>

      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-950/40">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {data?.areaMetrics?.isPolygon ? "Enclosed Sector Profile" : "Target Sector Profile"}
            </span>
          </div>
          <h2 className="text-base font-bold text-white truncate mt-0.5">
            {data?.location.name || selectedPoint?.name || "Target Location"}
          </h2>
          <div className="text-[11px] font-mono-data text-slate-400 mt-0.5">
            {selectedPoint
              ? `${selectedPoint.lat.toFixed(4)}°N, ${selectedPoint.lng.toFixed(4)}°E`
              : selectedPolygon
              ? `${selectedPolygon.length} Vertices • Area ${data?.areaMetrics?.areaKm2 || 0} km²`
              : "Global Telemetry"}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={fetchProfile}
            disabled={loading}
            title="Refresh Feed"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-slate-200" : ""}`} />
          </button>
          <button
            onClick={() => {
              setRightPanelOpen(false);
              setIsMobileOpen(false);
            }}
            title="Close Panel"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Action Toolbar: Pin to Compare & Save to Firebase */}
      <div className="px-3.5 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Pin Button */}
          <button
            onClick={togglePin}
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-medium transition-colors ${
              isPinned
                ? "bg-slate-800 border-slate-600 text-white font-semibold"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Pin className={`w-3 h-3 ${isPinned ? "fill-white text-white rotate-45" : "text-slate-400"}`} />
            <span>{isPinned ? "Pinned to Compare" : "Pin to Compare"}</span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleSaveToFirebase}
            disabled={savedStatus === "saving"}
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-medium transition-colors ${
              savedStatus === "saved"
                ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            {savedStatus === "saved" ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3 h-3 text-slate-400" />
                <span>{savedStatus === "saving" ? "Saving..." : "Save Sector"}</span>
              </>
            )}
          </button>
        </div>

        {/* View Compare Link if >= 1 items pinned */}
        {comparisonLocations.length > 0 && (
          <button
            onClick={() => setCompareModalOpen(true)}
            className="text-[11px] text-slate-300 hover:text-white font-medium flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-sky-400" />
            <span>Compare ({comparisonLocations.length}/4)</span>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center px-3 pt-2 border-b border-slate-800 gap-1 bg-slate-950/20 text-xs overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "pollutants", label: "Pollutants", icon: Gauge },
          { id: "trends", label: "Trends", icon: LineChart },
          { id: "weather", label: "Weather", icon: Cloud },
          {
            id: "fires",
            label: `Fires (${data?.fires.count || 0})`,
            icon: Flame,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-1 text-center font-medium rounded-t-md transition-colors flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
                isActive
                  ? "text-white border-white bg-slate-800/40 font-semibold"
                  : "text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-44 bg-slate-800/50 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 bg-slate-800/50 rounded-lg" />
              <div className="h-16 bg-slate-800/50 rounded-lg" />
            </div>
            <div className="h-12 bg-slate-800/50 rounded-lg" />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <div>
              <div className="text-xs font-bold text-red-300 uppercase tracking-wider">
                Feed Interrupted
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{error}</p>
            </div>
            <button
              onClick={fetchProfile}
              className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-md text-xs font-semibold transition-colors"
            >
              Retry Uplink
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !data && (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
            <div>Pick any point or draw an area on the 3D globe to load telemetry.</div>
          </div>
        )}

        {/* Real Data Loaded */}
        {!loading && !error && data && (
          <>
            {/* AREA METRICS (if Polygon Drawn) */}
            {data.areaMetrics?.isPolygon && (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Area Sampling Breakdown</span>
                  <span className="font-mono-data text-slate-400">{data.areaMetrics.samplePointsCount} Nodes</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400">Avg AQI</span>
                    <div className="text-lg font-bold font-mono-data text-white">{data.areaMetrics.avgAqi}</div>
                  </div>
                  <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400">Min AQI</span>
                    <div className="text-lg font-bold font-mono-data text-emerald-400">{data.areaMetrics.minAqi}</div>
                  </div>
                  <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400">Max AQI</span>
                    <div className="text-lg font-bold font-mono-data text-rose-400">{data.areaMetrics.maxAqi}</div>
                  </div>
                </div>

                {/* Per-Point Node Breakdown Table */}
                {data.areaMetrics.sampleNodes && data.areaMetrics.sampleNodes.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>Per-Point Grid Breakdown</span>
                      <span>AQI / PM2.5</span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {data.areaMetrics.sampleNodes.map((node) => (
                        <div key={node.id} className="p-1.5 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                            <span className="font-mono-data text-slate-300 text-[11px]">{node.lat}°N, {node.lng}°E</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono-data text-[11px]">
                            <span className="font-bold text-white">AQI {node.aqi}</span>
                            <span className="text-[10px] text-slate-400">({node.pm2_5} µg/m³)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-3.5">
                {/* AQI Radial Dial */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex justify-center">
                  <AQIDial
                    aqi={data.airQuality.usAqi}
                    category={data.airQuality.category}
                    dominantPollutant={data.airQuality.dominantPollutant}
                    size={190}
                  />
                </div>

                {/* Health Recommendation Card */}
                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-white mb-0.5">Health Guidance</div>
                    <div className="text-slate-300 leading-relaxed">
                      {data.airQuality.category.healthRecommendation}
                    </div>
                  </div>
                </div>

                {/* Quick Weather Strip */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-2.5">
                    <Thermometer className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Temperature</div>
                      <div className="text-base font-bold font-mono-data text-white">
                        {data.weather.temperature}°C
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Feels like {data.weather.apparentTemperature}°C
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-2.5">
                    <Droplets className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Humidity</div>
                      <div className="text-base font-bold font-mono-data text-white">
                        {data.weather.relativeHumidity}%
                      </div>
                      <div className="text-[10px] text-slate-400">{data.weather.weatherDescription}</div>
                    </div>
                  </div>
                </div>

                {/* Thermal Fire Banner */}
                {data.fires.count > 0 ? (
                  <div className="p-2.5 bg-red-950/20 border border-red-900/40 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                      <Flame className="w-4 h-4 animate-pulse" />
                      <span>{data.fires.count} Thermal Hotspots Detected</span>
                    </div>
                    <span className="text-[10px] font-mono-data text-red-300 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
                      NASA FIRMS
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-slate-500" />
                      No thermal anomalies in sector
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Nominal</span>
                  </div>
                )}

                {/* Gemini AI Analyst Brief */}
                <AnalystBriefCard profile={data} />
              </div>
            )}

            {/* TAB: POLLUTANTS */}
            {activeTab === "pollutants" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Pollutant (Concentration)</span>
                  <span>WHO Guideline Limit</span>
                </div>

                {Object.values(data.airQuality.pollutants).map((p) => {
                  const pct = Math.min(250, p.percentageOfLimit);
                  const isHigh = p.percentageOfLimit > 100;
                  return (
                    <div key={p.code} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-white">{p.name}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold font-mono-data text-white">{p.value}</span>
                          <span className="text-[10px] text-slate-400">{p.unit}</span>
                        </div>
                      </div>

                      {/* Progress bar vs WHO Limit */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden my-1.5">
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${
                            p.status === "critical"
                              ? "bg-red-500"
                              : p.status === "unhealthy"
                              ? "bg-orange-500"
                              : p.status === "moderate"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min(100, (pct / 200) * 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {isHigh ? (
                            <strong className="text-amber-400">{p.percentageOfLimit}% of WHO limit</strong>
                          ) : (
                            <span className="text-emerald-400">Within WHO guidelines</span>
                          )}
                        </span>
                        <span>WHO Cap: {p.whoLimit} {p.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: TRENDS (7D / 30D / 90D RECHARTS) */}
            {activeTab === "trends" && (
              <div className="p-1">
                <HistoricalChart
                  lat={data.location.latitude}
                  lng={data.location.longitude}
                />
              </div>
            )}

            {/* TAB: WEATHER */}
            {activeTab === "weather" && (
              <div className="space-y-3">
                <WindCompass
                  speed={data.weather.windSpeed}
                  direction={data.weather.windDirection}
                  compass={data.weather.windCompass}
                />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase">Surface Pressure</span>
                    <div className="text-lg font-bold font-mono-data text-white mt-0.5">
                      {data.weather.surfacePressure} <span className="text-xs text-slate-400 font-normal">hPa</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase">Precipitation</span>
                    <div className="text-lg font-bold font-mono-data text-white mt-0.5">
                      {data.weather.precipitation} <span className="text-xs text-slate-400 font-normal">mm</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Conditions</div>
                    <div className="text-sm font-semibold text-white mt-0.5">{data.weather.weatherDescription}</div>
                  </div>
                  <Cloud className="w-6 h-6 text-slate-300" />
                </div>
              </div>
            )}

            {/* TAB: FIRES */}
            {activeTab === "fires" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span>Satellite: VIIRS / MODIS</span>
                  <span className="font-mono-data">{data.fires.count} Detections</span>
                </div>

                {data.fires.hotspots.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active thermal anomalies reported in this sector in the last 24 hours.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40">
                    {data.fires.hotspots.map((fire, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <div>
                            <div className="font-mono-data text-white font-medium">
                              {fire.latitude.toFixed(3)}°N, {fire.longitude.toFixed(3)}°E
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {fire.acquiredDate} • {fire.acquiredTime} UTC
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono-data text-amber-400 font-semibold">
                            {fire.brightness} K
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
