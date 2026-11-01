"use client";

import React, { useState, useEffect } from "react";
import { AQICategory } from "@/lib/types/environmental";

interface AQIDialProps {
  aqi: number;
  category: AQICategory;
  dominantPollutant?: string;
  size?: number;
}

export const AQIDial: React.FC<AQIDialProps> = ({
  aqi,
  category,
  dominantPollutant = "PM2.5",
  size = 180,
}) => {
  const [displayAqi, setDisplayAqi] = useState<number>(0);

  // Smooth number count-up micro-interaction
  useEffect(() => {
    let startTime: number | null = null;
    const duration = 800; // ms
    const startVal = displayAqi;
    const endVal = aqi;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAqi(Math.round(startVal + (endVal - startVal) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [aqi]);

  // Angle calculations for a 240-degree sweep arc
  const startAngle = 150;
  const totalAngle = 240;
  const radius = (size / 2) - 16;
  const center = size / 2;

  // Clamp AQI to 0 - 500
  const normalizedAqi = Math.min(500, Math.max(0, aqi));
  const progressRatio = normalizedAqi / 500;
  const currentAngle = startAngle + (progressRatio * totalAngle);

  // SVG arc math
  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const startPt = polarToCartesian(cx, cy, r, end);
    const endPt = polarToCartesian(cx, cy, r, start);
    const largeArcFlag = end - start <= 180 ? "0" : "1";
    return ["M", startPt.x, startPt.y, "A", r, r, 0, largeArcFlag, 0, endPt.x, endPt.y].join(" ");
  };

  const backgroundArc = describeArc(center, center, radius, startAngle, startAngle + totalAngle);
  const activeArc = describeArc(center, center, radius, startAngle, Math.max(startAngle + 0.1, currentAngle));

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* Background track */}
          <path
            d={backgroundArc}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Active value track */}
          <path
            d={activeArc}
            fill="none"
            stroke={category.color}
            strokeWidth="9"
            strokeLinecap="round"
            className="transition-[d,stroke] duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 4px ${category.color}60)` }}
          />

          {/* Segment Tick Marks */}
          {[0, 50, 100, 150, 200, 300, 500].map((tick) => {
            const angle = startAngle + ((tick / 500) * totalAngle);
            const p1 = polarToCartesian(center, center, radius - 8, angle);
            const p2 = polarToCartesian(center, center, radius - 4, angle);
            return (
              <line
                key={tick}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#475569"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Center Readout Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none pt-2">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Air Quality Index
          </span>
          <div className="text-4xl font-bold font-mono-data text-white tracking-tight leading-none my-1">
            {displayAqi}
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
            style={{
              backgroundColor: category.bgColor,
              color: category.color,
              border: `1px solid ${category.borderColor}`,
            }}
          >
            {category.label}
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
        <span>Dominant:</span>
        <strong className="text-slate-200 font-mono-data">{dominantPollutant}</strong>
      </div>
    </div>
  );
};
