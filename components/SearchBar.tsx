"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/stores/useAppStore";
import { Search, MapPin, X, Loader2 } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  elevation?: number;
}

interface SearchBarProps {
  onSelectLocation?: (result: SearchResult) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelectLocation }) => {
  const { setSelectedPoint } = useAppStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Geocoding lookup error:", err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResult) => {
    const formatted = {
      id: item.id,
      name: `${item.name}${item.country ? `, ${item.country}` : ""}`,
      lat: item.latitude,
      lng: item.longitude,
      country: item.country,
    };

    // Log to recent queries in Firebase
    fetch("/api/locations/recent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: item.name,
        name: formatted.name,
        latitude: item.latitude,
        longitude: item.longitude,
      }),
    }).catch(() => {});

    setSelectedPoint(formatted);
    if (onSelectLocation) {
      onSelectLocation(item);
    }

    setQuery(`${item.name}${item.country ? `, ${item.country}` : ""}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full max-w-sm sm:max-w-md select-none">
      {/* Search Input Box */}
      <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 focus-within:border-slate-600 rounded-lg shadow-xl transition-colors">
        <div className="pl-3 pr-2 text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search any global city, region, or place..."
          className="w-full py-2.5 pr-8 bg-transparent text-xs text-white placeholder:text-slate-400 tracking-wide focus:outline-none"
        />

        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-2 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800">
          {results.map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                idx === activeIndex
                  ? "bg-slate-800 text-white"
                  : "text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {[item.admin1, item.country].filter(Boolean).join(", ")}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-right text-slate-400 font-mono-data shrink-0 ml-3">
                <div>{item.latitude.toFixed(2)}°N</div>
                <div>{item.longitude.toFixed(2)}°E</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
