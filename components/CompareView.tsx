"use client";

import React, { useState, useEffect } from "react";
import { useAppStore, GeoLocation } from "@/lib/stores/useAppStore";
import { EnvironmentalProfile } from "@/lib/types/environmental";
import { ComparativeAnalysis } from "@/lib/ai/compareGemini";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Flame,
  Wind,
  Thermometer,
  Droplets,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

const PRESET_LOCATIONS: GeoLocation[] = [
  { id: "preset-delhi", name: "New Delhi, India", lat: 28.6139, lng: 77.2090, country: "India" },
  { id: "preset-tokyo", name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503, country: "Japan" },
  { id: "preset-london", name: "London, UK", lat: 51.5074, lng: -0.1278, country: "United Kingdom" },
  { id: "preset-ny", name: "New York, USA", lat: 40.7128, lng: -74.0060, country: "United States" },
  { id: "preset-sao-paulo", name: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333, country: "Brazil" },
];

export const CompareView: React.FC = () => {
  const {
    compareModalOpen,
    setCompareModalOpen,
    comparisonLocations,
    addComparisonLocation,
    removeComparisonLocation,
    clearComparisonLocations,
    setSelectedPoint,
  } = useAppStore();

  const [profiles, setProfiles] = useState<Record<string, EnvironmentalProfile>>({});
  const [loadingProfiles, setLoadingProfiles] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<ComparativeAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Fetch profiles for all pinned locations
  const fetchPinnedProfiles = async () => {
    if (comparisonLocations.length === 0) return;
    setLoadingProfiles(true);
    const newProfiles: Record<string, EnvironmentalProfile> = {};

    try {
      await Promise.all(
        comparisonLocations.map(async (loc) => {
          try {
            const url = `/api/environmental?lat=${loc.lat}&lng=${loc.lng}&name=${encodeURIComponent(
              loc.name
            )}`;
            const res = await fetch(url);
            if (res.ok) {
              const json = await res.json();
              newProfiles[loc.id] = json.data;
            }
          } catch (e) {
            console.error(`Error loading profile for ${loc.name}:`, e);
          }
        })
      );
      setProfiles(newProfiles);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    if (compareModalOpen) {
      fetchPinnedProfiles();
    }
  }, [compareModalOpen, comparisonLocations]);

  // Request AI comparative brief
  const generateComparison = async () => {
    const list = comparisonLocations
      .map((l) => profiles[l.id])
      .filter(Boolean) as EnvironmentalProfile[];

    if (list.length < 2) return;

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/analyze/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: list }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.data) {
        setAnalysis(json.data);
      }
    } catch (err: any) {
      console.error("AI Comparative Brief error:", err);
      setAnalysisError("Failed to synthesize AI comparison brief. Please retry.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!compareModalOpen) return null;

  // Prepare chart data
  const chartData = comparisonLocations
    .map((l) => {
      const p = profiles[l.id];
      if (!p) return null;
      return {
        name: l.name.split(",")[0].trim(),
        aqi: p.airQuality.usAqi,
        pm25: p.airQuality.pollutants.pm2_5?.value || 0,
        temp: p.weather.temperature,
        humidity: p.weather.relativeHumidity,
        wind: p.weather.windSpeed,
        fires: p.fires.count,
      };
    })
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Multi-Sector Comparison
                </h2>
                <span className="text-[11px] font-mono-data px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {comparisonLocations.length} / 4 Pinned
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                Side-by-side environmental metrics and automated comparison analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {comparisonLocations.length > 0 && (
              <button
                onClick={clearComparisonLocations}
                className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
            <button
              onClick={() => setCompareModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Preset Quick-Add Bar */}
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-xs text-slate-400 font-medium">
              Quick-Pin Global Hubs:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_LOCATIONS.map((preset) => {
                const isPinned = comparisonLocations.some((l) => l.id === preset.id);
                return (
                  <button
                    key={preset.id}
                    disabled={isPinned || comparisonLocations.length >= 4}
                    onClick={() => addComparisonLocation(preset)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${
                      isPinned
                        ? "bg-slate-800 border-slate-600 text-white font-medium cursor-default"
                        : comparisonLocations.length >= 4
                        ? "bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    {isPinned ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Plus className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{preset.name.split(",")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty State (< 2 locations) */}
          {comparisonLocations.length < 2 && (
            <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 space-y-3">
              <Layers className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-white">
                Pin at least 2 locations for side-by-side comparison
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Use the Quick-Pin buttons above, search for cities in the navbar, or click the &quot;Pin to Compare&quot; button in any sector profile.
              </p>
            </div>
          )}

          {/* Pinned Locations Grid */}
          {comparisonLocations.length > 0 && (
            <div
              className={`grid gap-4 ${
                comparisonLocations.length === 1
                  ? "grid-cols-1 max-w-md mx-auto"
                  : comparisonLocations.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : comparisonLocations.length === 3
                  ? "grid-cols-1 md:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {comparisonLocations.map((loc) => {
                const profile = profiles[loc.id];
                const aqi = profile?.airQuality.usAqi;
                const aqiCat = profile?.airQuality.category;

                return (
                  <div
                    key={loc.id}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      {/* Top Action Row */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {loc.name}
                          </h4>
                          <span className="text-[10px] font-mono-data text-slate-400">
                            {loc.lat.toFixed(2)}°N, {loc.lng.toFixed(2)}°E
                          </span>
                        </div>
                        <button
                          onClick={() => removeComparisonLocation(loc.id)}
                          title="Unpin location"
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Profile Loading State */}
                      {!profile && loadingProfiles && (
                        <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                          Fetching environmental data...
                        </div>
                      )}

                      {/* Profile Data */}
                      {profile && (
                        <div className="mt-3 space-y-3">
                          {/* AQI Pill */}
                          <div
                            className="p-3 rounded-lg border text-center"
                            style={{
                              backgroundColor: aqiCat?.bgColor || "rgba(15,23,42,0.6)",
                              borderColor: aqiCat?.borderColor || "rgba(51,65,85,0.6)",
                            }}
                          >
                            <div className="text-[10px] uppercase font-semibold text-slate-300">
                              US AQI
                            </div>
                            <div
                              className="text-2xl font-bold font-mono-data"
                              style={{ color: aqiCat?.color || "#fff" }}
                            >
                              {aqi}
                            </div>
                            <div className="text-xs font-semibold mt-0.5" style={{ color: aqiCat?.color }}>
                              {aqiCat?.label}
                            </div>
                          </div>

                          {/* Pollutant Breakdown */}
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between text-slate-400">
                              <span>PM2.5:</span>
                              <span className="font-mono-data text-white font-semibold">
                                {profile.airQuality.pollutants.pm2_5?.value || 0} µg/m³
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>PM10:</span>
                              <span className="font-mono-data text-white font-semibold">
                                {profile.airQuality.pollutants.pm10?.value || 0} µg/m³
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Dominant:</span>
                              <span className="text-slate-200 font-semibold">
                                {profile.airQuality.dominantPollutant}
                              </span>
                            </div>
                          </div>

                          {/* Weather & Fires Quick Strip */}
                          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                              <span>{profile.weather.temperature}°C</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Droplets className="w-3.5 h-3.5 text-sky-400" />
                              <span>{profile.weather.relativeHumidity}%</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Wind className="w-3.5 h-3.5 text-slate-400" />
                              <span>{profile.weather.windSpeed} km/h</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Flame className={`w-3.5 h-3.5 ${profile.fires.count > 0 ? "text-rose-500 animate-pulse" : "text-slate-500"}`} />
                              <span>{profile.fires.count} Fires</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fly-To Footer */}
                    <button
                      onClick={() => {
                        setSelectedPoint(loc);
                        setCompareModalOpen(false);
                      }}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Focus on Globe</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comparative Charts Section */}
          {comparisonLocations.length >= 2 && chartData.length >= 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* AQI & PM2.5 Bar Chart */}
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>Air Quality Index & PM2.5 Comparison</span>
                  <span className="text-[10px] text-slate-400">WHO PM2.5 Limit: 15 µg/m³</span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090d16",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "WHO PM2.5 Limit", fill: "#ef4444", fontSize: 10 }} />
                      <Bar dataKey="aqi" name="US AQI" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pm25" name="PM2.5 (µg/m³)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weather Dynamics Chart */}
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-white">
                  Atmospheric & Meteorological Comparison
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090d16",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar dataKey="temp" name="Temperature (°C)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="humidity" name="Humidity (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="wind" name="Wind (km/h)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* AI Comparative Brief Section */}
          {comparisonLocations.length >= 2 && (
            <div className="p-4 sm:p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Gemini AI Comparative Summary
                  </h3>
                </div>

                <button
                  onClick={generateComparison}
                  disabled={analyzing}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                  <span>{analyzing ? "Generating Analysis..." : "Generate Comparative Brief"}</span>
                </button>
              </div>

              {analysisError && (
                <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              {/* Analysis Result */}
              {analysis && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Synthesis Paragraph */}
                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                    {analysis.overallSynthesis}
                  </p>

                  {/* Best & Worst Callout Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-emerald-400">
                          Cleanest Air Quality
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {analysis.bestLocation}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-900/50 flex items-center justify-center text-rose-400 shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-rose-400">
                          Highest Concern Sector
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {analysis.worstLocation}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rankings Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">
                      Sector Rankings (Cleanest to Most Polluted)
                    </div>
                    <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
                      {analysis.rankings.map((r) => (
                        <div
                          key={r.rank}
                          className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-200 font-mono-data text-xs flex items-center justify-center font-bold">
                              #{r.rank}
                            </span>
                            <div>
                              <div className="font-semibold text-white">{r.locationName}</div>
                              <div className="text-[11px] text-slate-400">{r.verdict}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono-data font-bold text-white">
                              AQI {r.aqi}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {r.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">
                      Actionable Recommendations
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-sky-400 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
