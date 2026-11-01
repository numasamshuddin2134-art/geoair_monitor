"use client";

import React, { useState } from "react";
import { EnvironmentalProfile } from "@/lib/types/environmental";
import {
  AlertTriangle,
  Flame,
  Wind,
  ShieldAlert,
  Thermometer,
  X,
  CheckCircle,
  Bell,
} from "lucide-react";

export interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "advisory";
  title: string;
  description: string;
  threshold: string;
  timestamp: string;
  icon: any;
}

interface AlertFeedProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: EnvironmentalProfile | null;
}

export function generateAlertsFromProfile(profile?: EnvironmentalProfile | null): AlertItem[] {
  if (!profile) return [];

  const alerts: AlertItem[] = [];
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // 1. Critical AQI Alert
  if (profile.airQuality.usAqi > 200) {
    alerts.push({
      id: "aqi-critical",
      severity: "critical",
      title: "Severe Atmospheric Hazard",
      description: `Air Quality Index is ${profile.airQuality.usAqi} (${profile.airQuality.category.label}). High risk of acute respiratory distress. Avoid all outdoor activities.`,
      threshold: "AQI > 200",
      timestamp: time,
      icon: ShieldAlert,
    });
  } else if (profile.airQuality.usAqi > 150) {
    alerts.push({
      id: "aqi-unhealthy",
      severity: "warning",
      title: "Unhealthy Air Quality Exceedance",
      description: `AQI is ${profile.airQuality.usAqi}. General public may experience adverse health effects. Keep windows sealed.`,
      threshold: "AQI > 150",
      timestamp: time,
      icon: AlertTriangle,
    });
  }

  // 2. PM2.5 WHO Threshold Alert
  const pm25 = profile.airQuality.pollutants.pm2_5;
  if (pm25 && pm25.value > 55) {
    alerts.push({
      id: "pm25-spike",
      severity: "warning",
      title: "Elevated PM2.5 Fine Particulates",
      description: `PM2.5 concentration is ${pm25.value} µg/m³ (${pm25.percentageOfLimit}% of WHO 24h safety guideline). N95 mask recommended outdoors.`,
      threshold: "PM2.5 > 55 µg/m³",
      timestamp: time,
      icon: Wind,
    });
  }

  // 3. Thermal Fire Anomalies Alert
  if (profile.fires.count > 0) {
    alerts.push({
      id: "fires-active",
      severity: profile.fires.count > 5 ? "critical" : "warning",
      title: "Active Thermal Hotspots Detected",
      description: `NASA FIRMS VIIRS satellite identified ${profile.fires.count} thermal anomaly hotspot(s) in sector perimeter. Potential wildfire or industrial combustion.`,
      threshold: `${profile.fires.count} Hotspots (VIIRS)`,
      timestamp: time,
      icon: Flame,
    });
  }

  // 4. Extreme Wind Advisory
  if (profile.weather.windSpeed > 35) {
    alerts.push({
      id: "wind-high",
      severity: "advisory",
      title: "High Wind Dispersion Advisory",
      description: `Wind velocities measured at ${profile.weather.windSpeed} km/h (${profile.weather.windCompass}). Particulate transport rapid.`,
      threshold: "Wind > 35 km/h",
      timestamp: time,
      icon: Wind,
    });
  }

  // 5. Extreme Temperature Alert
  if (profile.weather.temperature > 40) {
    alerts.push({
      id: "temp-extreme",
      severity: "warning",
      title: "Extreme Thermal Heat Advisory",
      description: `Ambient surface temperature at ${profile.weather.temperature}°C (feels like ${profile.weather.apparentTemperature}°C). Risk of heat illness and heightened ground ozone formation.`,
      threshold: "Temp > 40°C",
      timestamp: time,
      icon: Thermometer,
    });
  }

  return alerts;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ isOpen, onClose, profile }) => {
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");
  const alerts = generateAlertsFromProfile(profile);

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 px-4 select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 overflow-hidden flex flex-col max-h-[82vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
              <Bell className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Environmental Alerts
              </h2>
              <div className="text-[11px] text-slate-400">
                {profile?.location.name || "Global Sector"} • {alerts.length} Active Notice(s)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 py-2.5 border-b border-slate-800 text-xs">
          {(["all", "critical", "warning"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                filter === lvl
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="font-semibold text-white">No Active Alerts In This Sector</div>
              <p className="text-[11px] text-slate-500">All environmental parameters within nominal thresholds.</p>
            </div>
          ) : (
            filtered.map((alert) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                    alert.severity === "critical"
                      ? "bg-rose-950/20 border-rose-900/40"
                      : alert.severity === "warning"
                      ? "bg-amber-950/20 border-amber-900/40"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                      alert.severity === "critical"
                        ? "bg-rose-900/40 text-rose-300"
                        : alert.severity === "warning"
                        ? "bg-amber-900/40 text-amber-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {alert.title}
                      </span>
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          alert.severity === "critical"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : alert.severity === "warning"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {alert.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono-data">
                      <span>Threshold: {alert.threshold}</span>
                      <span>{alert.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
