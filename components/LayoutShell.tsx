"use client";

import React from "react";
import { useAppStore } from "@/lib/stores/useAppStore";
import { formatCoordinates } from "@/lib/utils";
import {
  calculatePolygonAreaKm2,
  getPolygonCentroid,
  sampleGridInsidePolygon,
} from "@/lib/geo";
import {
  Layers,
  Wind,
  Flame,
  CloudRain,
  Grid,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Crosshair,
  MapPin,
  Maximize2,
  Minimize2,
  Activity,
  Sliders,
  ShieldAlert,
  Compass,
} from "lucide-react";

interface LayoutShellProps {
  children?: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const {
    leftPanelOpen,
    setLeftPanelOpen,
    rightPanelOpen,
    setRightPanelOpen,
    bottomPanelOpen,
    setBottomPanelOpen,
    layers,
    toggleLayer,
    selectedPoint,
    selectedPolygon,
    cursorCoords,
    projection,
  } = useAppStore();

  const coords = formatCoordinates(cursorCoords.lat, cursorCoords.lng);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-hud-bg font-mono select-none pt-14 text-hud-text">
      {/* Background HUD Grid & Scanlines */}
      <div className="absolute inset-0 hud-grid-pattern opacity-30 pointer-events-none z-0" />
      <div className="absolute inset-0 hud-scanline-overlay pointer-events-none z-10" />

      {/* Center Screen Crosshair Reticle Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <div className="relative w-36 h-36 opacity-30">
          <div className="absolute inset-0 border border-hud-cyan/40 rounded-full animate-pulse-slow" />
          <div className="absolute inset-4 border border-dashed border-hud-cyan/30 rounded-full" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-hud-cyan/40 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-hud-cyan/40 -translate-x-1/2" />
          <div className="absolute top-2 left-2 text-[8px] text-hud-cyan tracking-widest font-mono">
            HUD // RETICLE
          </div>
        </div>
      </div>

      {/* Primary Map Viewport Container */}
      <div className="absolute inset-0 top-14 bottom-0 z-0">
        {children}
      </div>

      {/* ======================================================== */}
      {/* LEFT PANEL: LAYERS, SENSORS & TACTICAL TOOLS              */}
      {/* ======================================================== */}
      <div
        className={`absolute left-3 top-16 z-30 transition-all duration-300 ease-in-out flex items-start ${
          leftPanelOpen ? "translate-x-0" : "-translate-x-[calc(100%-12px)]"
        }`}
      >
        <aside className="w-72 sm:w-80 bg-hud-surface/90 backdrop-blur-md border border-hud-border p-3 shadow-2xl hud-corners">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-hud-border">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-hud-cyan" />
              <span className="font-hud text-xs font-bold tracking-wider text-white">
                TACTICAL SENSORS // LAYERS
              </span>
            </div>
            <span className="text-[9px] text-hud-cyan bg-hud-cyan/10 px-1.5 py-0.5 border border-hud-cyan/30">
              MOD 01
            </span>
          </div>

          {/* Sensor Layer Toggles */}
          <div className="space-y-1.5 text-xs">
            {/* Air Quality Layer */}
            <button
              onClick={() => toggleLayer("aqi")}
              className={`w-full p-2 flex items-center justify-between border transition-all ${
                layers.aqi
                  ? "bg-hud-cyan/15 border-hud-cyan text-white shadow-sm"
                  : "bg-hud-bg/60 border-hud-border text-hud-muted hover:border-hud-cyan/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <Wind className={`w-3.5 h-3.5 ${layers.aqi ? "text-hud-cyan" : "text-hud-muted"}`} />
                <span className="tracking-wider">AIR QUALITY (AQI / PM2.5)</span>
              </div>
              <span className={`text-[9px] font-bold ${layers.aqi ? "text-hud-cyan" : "text-hud-muted"}`}>
                {layers.aqi ? "ACTIVE" : "STANDBY"}
              </span>
            </button>

            {/* NASA FIRMS Thermal Fires Layer */}
            <button
              onClick={() => toggleLayer("fires")}
              className={`w-full p-2 flex items-center justify-between border transition-all ${
                layers.fires
                  ? "bg-hud-red/15 border-hud-red text-white shadow-sm"
                  : "bg-hud-bg/60 border-hud-border text-hud-muted hover:border-hud-red/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <Flame className={`w-3.5 h-3.5 ${layers.fires ? "text-hud-red animate-pulse" : "text-hud-muted"}`} />
                <span className="tracking-wider">NASA FIRMS THERMAL HOTSPOTS</span>
              </div>
              <span className={`text-[9px] font-bold ${layers.fires ? "text-hud-red" : "text-hud-muted"}`}>
                {layers.fires ? "TRACKING" : "OFF"}
              </span>
            </button>

            {/* Weather & Vectors */}
            <button
              onClick={() => toggleLayer("weather")}
              className={`w-full p-2 flex items-center justify-between border transition-all ${
                layers.weather
                  ? "bg-hud-green/15 border-hud-green text-white shadow-sm"
                  : "bg-hud-bg/60 border-hud-border text-hud-muted hover:border-hud-green/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <CloudRain className={`w-3.5 h-3.5 ${layers.weather ? "text-hud-green" : "text-hud-muted"}`} />
                <span className="tracking-wider">WEATHER & WIND STREAMLINES</span>
              </div>
              <span className={`text-[9px] font-bold ${layers.weather ? "text-hud-green" : "text-hud-muted"}`}>
                {layers.weather ? "ONLINE" : "OFF"}
              </span>
            </button>

            {/* Heatmap Density */}
            <button
              onClick={() => toggleLayer("heatmap")}
              className={`w-full p-2 flex items-center justify-between border transition-all ${
                layers.heatmap
                  ? "bg-hud-amber/15 border-hud-amber text-white shadow-sm"
                  : "bg-hud-bg/60 border-hud-border text-hud-muted hover:border-hud-amber/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className={`w-3.5 h-3.5 ${layers.heatmap ? "text-hud-amber" : "text-hud-muted"}`} />
                <span className="tracking-wider">DENSITY HEATMAP GRID</span>
              </div>
              <span className={`text-[9px] font-bold ${layers.heatmap ? "text-hud-amber" : "text-hud-muted"}`}>
                {layers.heatmap ? "SAMPLE" : "OFF"}
              </span>
            </button>

            {/* Tactical Grid */}
            <button
              onClick={() => toggleLayer("grid")}
              className={`w-full p-2 flex items-center justify-between border transition-all ${
                layers.grid
                  ? "bg-hud-panel border-hud-cyan/40 text-hud-text"
                  : "bg-hud-bg/60 border-hud-border text-hud-muted hover:border-hud-cyan/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Grid className="w-3.5 h-3.5 text-hud-cyan" />
                <span className="tracking-wider">MGRS TACTICAL COORDINATE GRID</span>
              </div>
              <span className="text-[9px] text-hud-cyan">{layers.grid ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Quick Target Acquisition Details */}
          <div className="mt-3 pt-3 border-t border-hud-border">
            <div className="text-[10px] text-hud-muted tracking-widest uppercase mb-1.5 flex items-center justify-between">
              <span>ACTIVE TARGET LOCK</span>
              <span className="text-hud-green font-bold">LOCKED</span>
            </div>
            <div className="p-2 bg-hud-bg/80 border border-hud-border text-[11px] space-y-1">
              <div className="text-white font-bold tracking-wider truncate">
                {selectedPoint ? selectedPoint.name : selectedPolygon ? "POLYGON AREA BOUND" : "GLOBAL SCAN MODE"}
              </div>
              <div className="text-[10px] text-hud-cyan">
                {selectedPoint
                  ? `LAT: ${selectedPoint.lat.toFixed(4)}° | LNG: ${selectedPoint.lng.toFixed(4)}°`
                  : selectedPolygon
                  ? `VERTICES: ${selectedPolygon.length} PTS`
                  : "CLICK MAP OR DRAW AREA TO ENGAGE"}
              </div>
            </div>
          </div>

          {/* Projection Indicator */}
          <div className="mt-3 pt-2 border-t border-hud-border/50 flex items-center justify-between text-[9px] text-hud-muted">
            <span>PROJECTION: <strong className="text-hud-cyan">{projection.toUpperCase()}</strong></span>
            <span>GRID: <strong className="text-hud-green">WGS-84</strong></span>
          </div>
        </aside>

        {/* Left Panel Toggle Tab */}
        <button
          onClick={() => setLeftPanelOpen((prev) => !prev)}
          title="Toggle Layers Panel"
          className="ml-1 mt-2 p-1.5 bg-hud-panel border border-hud-border text-hud-cyan hover:bg-hud-cyan hover:text-black transition-colors"
        >
          {leftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL: ENVIRONMENTAL SECTOR PROFILE & INTEL        */}
      {/* ======================================================== */}
      <div
        className={`absolute right-3 top-16 z-30 transition-all duration-300 ease-in-out flex items-start flex-row-reverse ${
          rightPanelOpen ? "translate-x-0" : "translate-x-[calc(100%-12px)]"
        }`}
      >
        <aside className="w-80 sm:w-96 bg-hud-surface/90 backdrop-blur-md border border-hud-border p-3.5 shadow-2xl hud-corners max-h-[calc(100vh-140px)] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-hud-border">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-hud-cyan animate-pulse" />
              <span className="font-hud text-xs font-bold tracking-wider text-white">
                SECTOR PROFILE // ANALYSIS
              </span>
            </div>
            <span className="text-[9px] text-hud-green bg-hud-green/10 px-1.5 py-0.5 border border-hud-green/30">
              SYS NOMINAL
            </span>
          </div>

          {/* Target Location Banner */}
          <div className="p-2.5 bg-hud-panel border border-hud-border mb-3">
            <div className="text-[9px] text-hud-muted tracking-widest uppercase mb-1">
              CURRENT TARGET DESIGNATION
            </div>
            {selectedPolygon ? (
              <div>
                <div className="text-sm font-bold text-hud-cyan tracking-wider">
                  ENCLOSED AREA BOUNDARY
                </div>
                <div className="flex items-center justify-between text-[10px] text-hud-amber mt-1">
                  <span>AREA: {calculatePolygonAreaKm2(selectedPolygon)} km²</span>
                  <span>VERTICES: {selectedPolygon.length} PTS</span>
                </div>
                <div className="text-[9px] text-hud-muted mt-0.5">
                  CENTROID: {getPolygonCentroid(selectedPolygon).lat.toFixed(4)}°N, {getPolygonCentroid(selectedPolygon).lng.toFixed(4)}°E
                </div>
                <div className="text-[9px] text-hud-green mt-0.5">
                  GRID SAMPLE: {sampleGridInsidePolygon(selectedPolygon).length} SENSOR NODES
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-bold text-white tracking-wider">
                  {selectedPoint?.name || "TACTICAL SECTOR FOCUS"}
                </div>
                <div className="text-[10px] text-hud-cyan tracking-wider mt-0.5">
                  {selectedPoint ? `${selectedPoint.lat.toFixed(4)}°N // ${selectedPoint.lng.toFixed(4)}°E` : `${coords.latStr} // ${coords.lngStr}`}
                </div>
              </div>
            )}
          </div>

          {/* Metric Overview Grid (Phase 1 preview slots, wired to real APIs in Phase 3) */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            {/* AQI Metric Preview */}
            <div className="p-2.5 bg-hud-bg/80 border border-hud-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[9px] text-hud-muted">
                <span>AQI LEVEL</span>
                <span className="w-1.5 h-1.5 rounded-full bg-hud-amber" />
              </div>
              <div className="my-1">
                <span className="text-2xl font-bold font-hud text-hud-amber">142</span>
                <span className="text-[9px] text-hud-muted ml-1">US-AQI</span>
              </div>
              <div className="text-[9px] text-hud-amber tracking-wider font-semibold">
                MODERATE // ELEVATED
              </div>
            </div>

            {/* Temperature & Meteorology Preview */}
            <div className="p-2.5 bg-hud-bg/80 border border-hud-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[9px] text-hud-muted">
                <span>METEOROLOGY</span>
                <span className="w-1.5 h-1.5 rounded-full bg-hud-green" />
              </div>
              <div className="my-1">
                <span className="text-2xl font-bold font-hud text-white">24.6°</span>
                <span className="text-[9px] text-hud-muted ml-1">C</span>
              </div>
              <div className="text-[9px] text-hud-green tracking-wider font-semibold">
                WIND 14 KM/H // NE
              </div>
            </div>

            {/* Thermal Hotspots Preview */}
            <div className="p-2.5 bg-hud-bg/80 border border-hud-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[9px] text-hud-muted">
                <span>FIRMS THERMAL</span>
                <span className="w-1.5 h-1.5 rounded-full bg-hud-red animate-pulse" />
              </div>
              <div className="my-1">
                <span className="text-2xl font-bold font-hud text-hud-red">18</span>
                <span className="text-[9px] text-hud-muted ml-1">HOTSPOTS</span>
              </div>
              <div className="text-[9px] text-hud-red tracking-wider font-semibold">
                THERMAL DETECTIONS
              </div>
            </div>

            {/* PM2.5 Concentration Preview */}
            <div className="p-2.5 bg-hud-bg/80 border border-hud-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[9px] text-hud-muted">
                <span>PM2.5 CONC</span>
                <span className="w-1.5 h-1.5 rounded-full bg-hud-cyan" />
              </div>
              <div className="my-1">
                <span className="text-2xl font-bold font-hud text-hud-cyan">58.4</span>
                <span className="text-[9px] text-hud-muted ml-1">µg/m³</span>
              </div>
              <div className="text-[9px] text-hud-cyan tracking-wider font-semibold">
                WHO LIMIT: 15 µg/m³
              </div>
            </div>
          </div>

          {/* AI Analyst Brief Container Placeholder */}
          <div className="p-3 bg-hud-panel border border-hud-border relative hud-corners">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-hud-border/70">
              <div className="flex items-center gap-1.5 text-xs text-hud-cyan font-bold tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>AI ANALYST BRIEF</span>
              </div>
              <span className="text-[8px] text-hud-muted">GEMINI-2.5-PRO</span>
            </div>
            <div className="text-[11px] text-hud-text/80 leading-relaxed font-mono">
              [SITREP READY] Target sector exhibits elevated particulate suspension due to regional boundary layer stagnation. Recommended protocol: minimize prolonged outdoor exertion in affected perimeter.
            </div>
            <div className="mt-2 pt-2 border-t border-hud-border/50 flex items-center justify-between text-[9px] text-hud-muted">
              <span>CONFIDENCE: 94.8%</span>
              <span className="text-hud-cyan">INTEL PROTOCOL READY</span>
            </div>
          </div>
        </aside>

        {/* Right Panel Toggle Tab */}
        <button
          onClick={() => setRightPanelOpen((prev) => !prev)}
          title="Toggle Profile Panel"
          className="mr-1 mt-2 p-1.5 bg-hud-panel border border-hud-border text-hud-cyan hover:bg-hud-cyan hover:text-black transition-colors"
        >
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM PANEL: TIMELINE SCRUBBER & TELEMETRY STREAM       */}
      {/* ======================================================== */}
      <div
        className={`absolute left-3 right-3 bottom-2 z-30 transition-all duration-300 ease-in-out ${
          bottomPanelOpen ? "translate-y-0" : "translate-y-[calc(100%-28px)]"
        }`}
      >
        <footer className="bg-hud-surface/90 backdrop-blur-md border border-hud-border p-2.5 shadow-2xl hud-corners">
          {/* Header Row & Collapse Toggle */}
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-hud-border text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-hud-cyan font-bold tracking-wider text-[11px]">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>REAL-TIME TELEMETRY STREAM</span>
              </div>
              <span className="text-hud-border">|</span>
              <div className="hidden md:flex items-center gap-2 text-[10px] text-hud-muted truncate max-w-md">
                <span className="text-hud-green font-bold">[FEED 01]</span>
                <span>SENTINEL-5P TROPOMI ATMOSPHERIC PROFILE INGESTION COMPLETE</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-hud-bg p-0.5 border border-hud-border text-[9px]">
                {["LIVE", "24H", "7D", "30D", "90D"].map((range, idx) => (
                  <button
                    key={range}
                    className={`px-2 py-0.5 font-bold transition-colors ${
                      idx === 0
                        ? "bg-hud-cyan text-black"
                        : "text-hud-muted hover:text-white"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setBottomPanelOpen((prev) => !prev)}
                className="p-1 hover:bg-hud-panel border border-hud-border text-hud-cyan transition-colors"
                title="Collapse / Expand Timeline"
              >
                {bottomPanelOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Timeline Bar & Scrubber Track */}
          <div className="flex items-center gap-3 text-[10px] text-hud-muted">
            <span className="font-bold text-hud-cyan">T-00:00 (NOW)</span>
            <div className="relative flex-1 h-3 bg-hud-bg border border-hud-border flex items-center px-1">
              {/* Simulated timeline ticks */}
              <div className="w-full flex justify-between opacity-30 text-[8px] font-mono pointer-events-none">
                <span>-24H</span>
                <span>-18H</span>
                <span>-12H</span>
                <span>-6H</span>
                <span className="text-hud-cyan font-bold">CURRENT</span>
              </div>
              <div className="absolute right-1 w-2 h-3.5 bg-hud-cyan border border-white shadow-hud-cyan" />
            </div>
            <span className="hidden sm:inline text-hud-text">RESOLUTION: 1-HOUR STEP</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
