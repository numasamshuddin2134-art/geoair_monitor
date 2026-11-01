"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { HistoricalTrendsResult } from "@/lib/providers/history";
import { TrendingDown, TrendingUp, Minus, Calendar, Loader2 } from "lucide-react";

interface HistoricalChartProps {
  lat: number;
  lng: number;
}

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ lat, lng }) => {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");
  const [metric, setMetric] = useState<"aqi" | "pm" | "weather">("aqi");
  const [data, setData] = useState<HistoricalTrendsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/history?lat=${lat}&lng=${lng}&range=${range}`);
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled) setData(json.data);
        }
      } catch (e) {
        console.error("Failed to fetch historical trends:", e);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isCancelled = true;
    };
  }, [lat, lng, range]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-2.5 rounded-lg shadow-xl text-xs font-mono-data">
          <div className="text-[11px] text-slate-400 font-sans mb-1">{label}</div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300 font-sans">{entry.name}:</span>
              <strong className="text-white font-bold">{entry.value}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Range and Metric Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        {/* Metric Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {[
            { id: "aqi", label: "AQI Index" },
            { id: "pm", label: "PM2.5 / PM10" },
            { id: "weather", label: "Temp & Rain" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id as any)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                metric === m.id
                  ? "bg-white text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 rounded-md font-medium uppercase font-mono-data ${
                range === r
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Strip */}
      {data && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Average AQI</span>
            <div className="text-base font-bold font-mono-data text-white mt-0.5">
              {data.summary.avgAqi}
            </div>
          </div>

          <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Peak AQI</span>
            <div className="text-base font-bold font-mono-data text-red-400 mt-0.5">
              {data.summary.peakAqi}
            </div>
          </div>

          <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Trend</span>
            <div className="flex items-center justify-center gap-1 mt-0.5 font-semibold text-xs capitalize">
              {data.summary.trend === "improving" ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Improving</span>
                </>
              ) : data.summary.trend === "degrading" ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400">Degrading</span>
                </>
              ) : (
                <>
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">Stable</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-56 w-full pt-1">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <span>Loading historical trends...</span>
          </div>
        ) : !data || data.points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            No historical records found for this sector.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="time"
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {metric === "aqi" && (
                <>
                  <ReferenceLine
                    y={100}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ value: "Moderate (100)", fill: "#f59e0b", fontSize: 9, position: "insideTopRight" }}
                  />
                  <ReferenceLine
                    y={150}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: "Unhealthy (150)", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="usAqi"
                    name="Air Quality Index"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#aqiGradient)"
                  />
                </>
              )}

              {metric === "pm" && (
                <>
                  <ReferenceLine
                    y={15}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    label={{ value: "WHO 24h Limit (15 µg/m³)", fill: "#10b981", fontSize: 9, position: "insideTopRight" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pm2_5"
                    name="PM2.5 (µg/m³)"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pm25Gradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pm10"
                    name="PM10 (µg/m³)"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    fillOpacity={0}
                  />
                </>
              )}

              {metric === "weather" && (
                <Area
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#tempGradient)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
