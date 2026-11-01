"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/stores/useAppStore";
import { Terminal, Shield, CheckCircle2, ChevronRight, Zap } from "lucide-react";

const BOOT_LOGS = [
  { text: "INITIALIZING GEOAIR C2 OPERATING SYSTEM [KERNEL 6.4.12-ENV]", delay: 100 },
  { text: "ESTABLISHING ENCRYPTED SECURE CHANNEL [TLS 1.3 // AES-256-GCM]", delay: 300 },
  { text: "ALLOCATING VOLATILE TELEMETRY BUFFERS...", delay: 550 },
  { text: "LINKING ORBITAL FEEDS: SENTINEL-5P TROPOMI ATMOSPHERIC SENSORS...", delay: 850 },
  { text: "CONNECTING OPEN-METEO GLOBAL FORECAST ENSEMBLE [0.1° GRID]... [OK]", delay: 1200 },
  { text: "SYNCHRONIZING NASA FIRMS THERMAL ANOMALY CONSTELLATION (VIIRS/MODIS)... [OK]", delay: 1550 },
  { text: "VERIFYING CRYPTOGRAPHIC CERTIFICATES: CLEARANCE GRANTED", delay: 1850 },
  { text: "CALIBRATING 3D TERRAIN & SPHERICAL PROJECTION SYSTEM... [OK]", delay: 2150 },
  { text: "GEOAIR C2 ONLINE // OPERATIONAL READINESS 100%", delay: 2500 },
];

export const BootSequence: React.FC = () => {
  const { isBooted, completeBoot } = useAppStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    // If already booted in session, return early
    if (isBooted) return;

    // Check if user previously booted during this session
    const previouslyBooted = sessionStorage.getItem("geoair_booted");
    if (previouslyBooted) {
      completeBoot();
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    // Schedule log outputs
    BOOT_LOGS.forEach((item, index) => {
      const t = setTimeout(() => {
        setLogs((prev) => [...prev, item.text]);
        setProgress(Math.round(((index + 1) / BOOT_LOGS.length) * 100));
        if (index === BOOT_LOGS.length - 1) {
          setReady(true);
          const autoFinish = setTimeout(() => {
            sessionStorage.setItem("geoair_booted", "true");
            completeBoot();
          }, 800);
          timers.push(autoFinish);
        }
      }, item.delay);
      timers.push(t);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        sessionStorage.setItem("geoair_booted", "true");
        completeBoot();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBooted, completeBoot]);

  if (isBooted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="fixed inset-0 z-50 bg-[#040609] flex flex-col items-center justify-center p-4 font-mono select-none"
      >
        {/* Subtle background grid & scanlines */}
        <div className="absolute inset-0 hud-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute inset-0 hud-scanline-overlay pointer-events-none" />

        {/* Central Boot Container */}
        <div className="relative w-full max-w-2xl bg-hud-surface/95 border border-hud-border p-6 shadow-2xl hud-corners">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-hud-border">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-hud-cyan animate-pulse" />
              <span className="font-hud text-sm font-bold tracking-wider text-white">
                GEOAIR COMMAND CENTER // BOOT LOADER
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-hud-muted">
              <span>SEC: TOP SECRET // OSINT</span>
              <button
                onClick={() => {
                  sessionStorage.setItem("geoair_booted", "true");
                  completeBoot();
                }}
                className="px-2 py-0.5 bg-hud-panel border border-hud-cyan/40 text-hud-cyan hover:bg-hud-cyan hover:text-black transition-colors"
              >
                SKIP [ESC]
              </button>
            </div>
          </div>

          {/* Terminal Log Output */}
          <div className="h-64 overflow-y-auto space-y-1.5 p-3 bg-hud-bg/90 border border-hud-border/70 text-xs text-hud-text/90 font-mono">
            {logs.map((log, index) => {
              const isLast = index === logs.length - 1;
              const isSuccess = log.includes("[OK]") || log.includes("100%");
              return (
                <div key={index} className="flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-hud-cyan shrink-0 mt-0.5" />
                  <span
                    className={
                      isSuccess
                        ? "text-hud-green font-semibold"
                        : isLast
                        ? "text-hud-cyan font-semibold"
                        : "text-hud-text/80"
                    }
                  >
                    {log}
                  </span>
                </div>
              );
            })}
            {!ready && (
              <div className="flex items-center gap-2 text-hud-cyan">
                <span className="inline-block w-2 h-4 bg-hud-cyan animate-blink" />
                <span className="text-[10px] text-hud-muted uppercase">PROCESSING STREAM...</span>
              </div>
            )}
          </div>

          {/* Progress Bar & Indicators */}
          <div className="mt-4 pt-3 border-t border-hud-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-hud-cyan">
                <Zap className="w-3.5 h-3.5" />
                <span className="tracking-widest">
                  {ready ? "INITIALIZATION COMPLETE" : "MOUNTING TELEMETRY BUS"}
                </span>
              </div>
              <span className="text-hud-cyan font-bold tracking-widest">{progress}%</span>
            </div>

            <div className="w-full h-1.5 bg-hud-bg border border-hud-border overflow-hidden">
              <motion.div
                className="h-full bg-hud-cyan"
                style={{
                  width: `${progress}%`,
                  boxShadow: "0 0 10px rgba(0, 229, 255, 0.7)",
                }}
                transition={{ ease: "easeOut", duration: 0.2 }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-hud-muted pt-1">
              <span>SECURITY CLEARANCE: DEFCON-4</span>
              <span>GEOAIR DISTRIBUTED SENSOR NETWORK</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
