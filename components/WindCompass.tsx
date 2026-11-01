"use client";

import React from "react";
import { Navigation } from "lucide-react";

interface WindCompassProps {
  speed: number;
  direction: number;
  compass: string;
}

export const WindCompass: React.FC<WindCompassProps> = ({ speed, direction, compass }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
      {/* Compass Dial */}
      <div className="relative w-12 h-12 rounded-full border border-slate-700 bg-slate-950/80 flex items-center justify-center shrink-0">
        <span className="absolute top-1 text-[8px] font-bold text-slate-400">N</span>
        <span className="absolute right-1 text-[8px] font-bold text-slate-500">E</span>
        <span className="absolute bottom-1 text-[8px] font-bold text-slate-500">S</span>
        <span className="absolute left-1 text-[8px] font-bold text-slate-500">W</span>

        <Navigation
          className="w-5 h-5 text-sky-400 transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${direction}deg)` }}
        />
      </div>

      {/* Speed & Heading Readout */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          Wind Velocity
        </div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-xl font-bold font-mono-data text-white">{speed}</span>
          <span className="text-xs text-slate-400">km/h</span>
          <span className="text-xs font-semibold text-slate-300 ml-1.5 font-mono-data">
            {compass} ({direction}°)
          </span>
        </div>
      </div>
    </div>
  );
};
