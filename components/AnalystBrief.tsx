"use client";

import React, { useState, useEffect } from "react";
import { EnvironmentalProfile } from "@/lib/types/environmental";
import { AnalystBrief } from "@/lib/ai/schema";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface AnalystBriefCardProps {
  profile: EnvironmentalProfile;
}

export const AnalystBriefCard: React.FC<AnalystBriefCardProps> = ({ profile }) => {
  const [brief, setBrief] = useState<AnalystBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [displayedSummary, setDisplayedSummary] = useState<string>("");

  const fetchBrief = async () => {
    setLoading(true);
    setDisplayedSummary("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        const json = await res.json();
        setBrief(json.data);
      }
    } catch (e) {
      console.error("Failed to generate AI analyst brief:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, [profile.location.name, profile.airQuality.usAqi]);

  // Clean typewriter reveal for the summary
  useEffect(() => {
    if (!brief?.summary) return;

    let index = 0;
    const text = brief.summary;
    setDisplayedSummary("");

    const interval = setInterval(() => {
      index++;
      setDisplayedSummary(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [brief?.summary]);

  const getRiskBadge = (level: AnalystBrief["riskLevel"]) => {
    switch (level) {
      case "CRITICAL":
        return { label: "Critical", bg: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
      case "HIGH":
        return { label: "High Risk", bg: "bg-orange-500/20 text-orange-300 border-orange-500/40" };
      case "ELEVATED":
        return { label: "Elevated", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
      case "MODERATE":
        return { label: "Moderate", bg: "bg-slate-800 text-slate-300 border-slate-700" };
      default:
        return { label: "Low Risk", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
    }
  };

  return (
    <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 font-sans">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-800/80 border border-slate-700/80 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
              <span>Environmental Intelligence</span>
              <span className="text-[10px] text-slate-400 font-mono-data font-normal">Gemini 3.5</span>
            </h3>
            <div className="text-[10px] text-slate-400">
              Automated Atmospheric Synthesis
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {brief && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                getRiskBadge(brief.riskLevel).bg
              }`}
            >
              {getRiskBadge(brief.riskLevel).label}
            </span>
          )}

          <button
            onClick={fetchBrief}
            disabled={loading}
            title="Regenerate Analysis"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-200" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !brief && (
        <div className="py-6 text-center space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
          <p className="text-xs text-slate-400">
            Synthesizing environmental conditions...
          </p>
        </div>
      )}

      {/* Brief Content */}
      {brief && (
        <div className="space-y-3">
          {/* Executive Summary with Typewriter Effect */}
          <div className="text-xs text-slate-200 leading-relaxed min-h-[44px]">
            {displayedSummary}
            {displayedSummary.length < brief.summary.length && (
              <span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-0.5 animate-pulse" />
            )}
          </div>

          {/* Key Concerns */}
          {brief.keyConcerns && brief.keyConcerns.length > 0 && (
            <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-lg space-y-1.5">
              <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Identified Environmental Hazards</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {brief.keyConcerns.map((concern, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Health Precautions */}
          {brief.healthPrecautions && brief.healthPrecautions.length > 0 && (
            <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-lg space-y-1.5">
              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Recommended Health Precautions</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {brief.healthPrecautions.map((precaution, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                    <span>{precaution}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trend Interpretation */}
          {brief.trendInterpretation && (
            <div className="p-2.5 bg-slate-900/50 border border-slate-800/60 rounded-lg text-xs space-y-1">
              <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span>Atmospheric Dispersion Assessment</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {brief.trendInterpretation}
              </p>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono-data">
            <span>Confidence Index: <strong className="text-white">{brief.confidenceScore}%</strong></span>
            <span>Gemini AI Synthesis</span>
          </div>
        </div>
      )}
    </div>
  );
};
