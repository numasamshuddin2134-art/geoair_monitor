"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { useAppStore } from "@/lib/stores/useAppStore";
import {
  Crosshair,
  Pentagon,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Activity,
  Flame,
} from "lucide-react";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "KEy";

mapboxgl.accessToken = MAPBOX_TOKEN;

export const GlobeMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const isSpinningRef = useRef<boolean>(true);
  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    projection,
    layers,
    toggleLayer,
    selectedPoint,
    setSelectedPoint,
    selectedPolygon,
    setSelectedPolygon,
    clearSelection,
    setCursorCoords,
  } = useAppStore();

  const [activeDrawMode, setActiveDrawMode] = useState<"point" | "polygon">("point");
  const [zoomLevel, setZoomLevel] = useState<number>(2.5);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [selectedPoint?.lng || 77.209, selectedPoint?.lat || 28.6139],
      zoom: 2.8,
      projection: { name: projection },
      attributionControl: false,
    });

    mapRef.current = map;

    // Atmospheric Horizon Fog
    map.on("style.load", () => {
      map.setFog({
        color: "rgb(9, 13, 22)",
        "high-color": "rgb(15, 23, 42)",
        "horizon-blend": 0.06,
        "space-color": "rgb(4, 7, 13)",
        "star-intensity": 0.5,
      });

      // 1. Polygon outline source & layers
      if (!map.getSource("custom-polygon-outline")) {
        map.addSource("custom-polygon-outline", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "custom-polygon-line",
          type: "line",
          source: "custom-polygon-outline",
          paint: {
            "line-color": "#38bdf8",
            "line-width": 2,
            "line-dasharray": [3, 2],
          },
        });

        map.addLayer({
          id: "custom-polygon-fill",
          type: "fill",
          source: "custom-polygon-outline",
          paint: {
            "fill-color": "#38bdf8",
            "fill-opacity": 0.12,
          },
        });
      }

      // 2. NASA FIRMS Fire Hotspots Source & Layers
      if (!map.getSource("firms-fires-source")) {
        map.addSource("firms-fires-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "firms-fires-glow",
          type: "circle",
          source: "firms-fires-source",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 8, 16],
            "circle-color": "#ef4444",
            "circle-opacity": 0.5,
            "circle-blur": 0.6,
          },
        });

        map.addLayer({
          id: "firms-fires-point",
          type: "circle",
          source: "firms-fires-source",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 3, 8, 7],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "brightness"],
              300, "#f59e0b",
              350, "#ef4444",
              400, "#ffffff"
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.on("click", "firms-fires-point", (e) => {
          if (!e.features || e.features.length === 0) return;
          const f = e.features[0];
          const props = f.properties || {};
          const geom = f.geometry as any;
          const coords = geom.coordinates;

          new mapboxgl.Popup({ closeButton: true })
            .setLngLat(coords)
            .setHTML(`
              <div style="background:#0f172a; color:#f8fafc; padding:10px; border-radius:8px; font-family:Inter,sans-serif; font-size:12px; border:1px solid #ef4444;">
                <div style="color:#ef4444; font-weight:700; margin-bottom:4px;">🔥 NASA FIRMS HOTSPOT</div>
                <div><strong>Brightness:</strong> ${props.brightness || 320} K</div>
                <div><strong>Satellite:</strong> ${props.satellite || "VIIRS"}</div>
                <div><strong>Date:</strong> ${props.acquiredDate || ""} ${props.acquiredTime || ""} UTC</div>
                <div><strong>FRP:</strong> ${props.frp || 1.0} MW</div>
                <div style="color:#06b6d4; font-size:10px; margin-top:4px;">${coords[1].toFixed(3)}°N, ${coords[0].toFixed(3)}°E</div>
              </div>
            `)
            .addTo(map);
        });

        map.on("mouseenter", "firms-fires-point", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "firms-fires-point", () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // 3. AQI / PM2.5 Heatmap Layer
      if (!map.getSource("heatmap-source")) {
        map.addSource("heatmap-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "aqi-heatmap-layer",
          type: "heatmap",
          source: "heatmap-source",
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.2, "#10b981",
              0.4, "#f59e0b",
              0.6, "#f97316",
              0.8, "#ef4444",
              1.0, "#8b5cf6"
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 18, 5, 40, 10, 70],
            "heatmap-opacity": 0.75,
          },
        });
      }
    });

    // Initialize Mapbox Draw
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: {
            "fill-color": "#06b6d4",
            "fill-outline-color": "#06b6d4",
            "fill-opacity": 0.18,
          },
        },
        {
          id: "gl-draw-polygon-stroke-active",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#06b6d4",
            "line-dasharray": [2, 2],
            "line-width": 2.5,
          },
        },
        {
          id: "gl-draw-polygon-and-line-vertex-active",
          type: "circle",
          filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
          paint: {
            "circle-radius": 6,
            "circle-color": "#06b6d4",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        },
      ],
    });

    map.addControl(draw);
    drawRef.current = draw;

    map.on("mousemove", (e) => {
      setCursorCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on("zoom", () => setZoomLevel(Number(map.getZoom().toFixed(1))));

    // Click to select point
    map.on("click", async (e) => {
      if (draw.getMode() !== "simple_select" && draw.getMode() !== "direct_select") {
        return;
      }

      const { lat, lng } = e.lngLat;
      updateMarker(lng, lat);

      try {
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const json = await res.json();
          setSelectedPoint({
            id: `coord-${lat.toFixed(4)}-${lng.toFixed(4)}`,
            name: json.location?.name || `Sector [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`,
            lat,
            lng,
            country: json.location?.country,
          });
        }
      } catch {
        setSelectedPoint({
          id: `coord-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          name: `Sector [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`,
          lat,
          lng,
        });
      }
    });

    // Draw Event Handlers
    const handleDrawUpdate = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const feature = data.features[data.features.length - 1];
        if (feature.geometry.type === "Polygon") {
          const coords = feature.geometry.coordinates[0];
          setSelectedPolygon(coords);

          const outlineSource = map.getSource("custom-polygon-outline") as mapboxgl.GeoJSONSource;
          if (outlineSource) {
            outlineSource.setData(feature as any);
          }
        }
      }
    };

    map.on("draw.create", handleDrawUpdate);
    map.on("draw.update", handleDrawUpdate);
    map.on("draw.delete", () => {
      setSelectedPolygon(null);
      const outlineSource = map.getSource("custom-polygon-outline") as mapboxgl.GeoJSONSource;
      if (outlineSource) {
        outlineSource.setData({ type: "FeatureCollection", features: [] });
      }
    });

    // Idle slow spin
    const spinGlobe = () => {
      if (!mapRef.current) return;
      const zoom = mapRef.current.getZoom();
      if (isSpinningRef.current && zoom < 4 && projection === "globe") {
        const center = mapRef.current.getCenter();
        center.lng -= 0.08;
        mapRef.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    };

    const spinInterval = setInterval(spinGlobe, 1000);

    const pauseSpin = () => {
      isSpinningRef.current = false;
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      spinTimerRef.current = setTimeout(() => {
        isSpinningRef.current = true;
      }, 8000);
    };

    map.on("mousedown", pauseSpin);
    map.on("touchstart", pauseSpin);
    map.on("wheel", pauseSpin);
    map.on("dragstart", pauseSpin);

    if (selectedPoint) {
      updateMarker(selectedPoint.lng, selectedPoint.lat);
    }

    return () => {
      clearInterval(spinInterval);
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      if (markerRef.current) markerRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const updateMarker = (lng: number, lat: number) => {
    if (!mapRef.current) return;

    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "hud-pulse-marker";
      el.innerHTML = `
        <div class="ring"></div>
        <div class="core"></div>
      `;
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setProjection({ name: projection });
  }, [projection]);

  useEffect(() => {
    if (!mapRef.current || !selectedPoint) return;
    updateMarker(selectedPoint.lng, selectedPoint.lat);

    mapRef.current.flyTo({
      center: [selectedPoint.lng, selectedPoint.lat],
      zoom: Math.max(mapRef.current.getZoom(), 5),
      essential: true,
      duration: 1800,
    });
  }, [selectedPoint]);

  // Sync FIRMS Fires Layer
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateFires = async () => {
      const glowLayer = map.getLayer("firms-fires-glow");
      const pointLayer = map.getLayer("firms-fires-point");

      if (!layers.fires) {
        if (glowLayer) map.setLayoutProperty("firms-fires-glow", "visibility", "none");
        if (pointLayer) map.setLayoutProperty("firms-fires-point", "visibility", "none");
        return;
      }

      if (glowLayer) map.setLayoutProperty("firms-fires-glow", "visibility", "visible");
      if (pointLayer) map.setLayoutProperty("firms-fires-point", "visibility", "visible");

      const center = selectedPoint || { lat: map.getCenter().lat, lng: map.getCenter().lng };
      try {
        const delta = 4.0;
        const res = await fetch(`/api/fires?lat=${center.lat}&lng=${center.lng}&delta=${delta}`);
        if (res.ok) {
          const json = await res.json();
          const fireSource = map.getSource("firms-fires-source") as mapboxgl.GeoJSONSource;
          if (fireSource && json.data) {
            fireSource.setData(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load FIRMS fires layer:", err);
      }
    };

    if (map.isStyleLoaded()) {
      updateFires();
    } else {
      map.once("style.load", updateFires);
    }
  }, [layers.fires, selectedPoint]);

  // Sync Heatmap Layer
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateHeatmap = async () => {
      const heatmapLayer = map.getLayer("aqi-heatmap-layer");

      if (!layers.heatmap) {
        if (heatmapLayer) map.setLayoutProperty("aqi-heatmap-layer", "visibility", "none");
        return;
      }

      if (heatmapLayer) map.setLayoutProperty("aqi-heatmap-layer", "visibility", "visible");

      const center = selectedPoint || { lat: map.getCenter().lat, lng: map.getCenter().lng };
      try {
        const delta = 6.0;
        const res = await fetch(`/api/heatmap?lat=${center.lat}&lng=${center.lng}&delta=${delta}`);
        if (res.ok) {
          const json = await res.json();
          const heatmapSource = map.getSource("heatmap-source") as mapboxgl.GeoJSONSource;
          if (heatmapSource && json.data) {
            heatmapSource.setData(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load heatmap layer:", err);
      }
    };

    if (map.isStyleLoaded()) {
      updateHeatmap();
    } else {
      map.once("style.load", updateHeatmap);
    }
  }, [layers.heatmap, selectedPoint]);

  const handleStartDrawPolygon = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.deleteAll();
    drawRef.current.changeMode("draw_polygon");
    setActiveDrawMode("polygon");
  }, []);

  const handleClear = useCallback(() => {
    if (drawRef.current) drawRef.current.deleteAll();
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    clearSelection();
    setActiveDrawMode("point");

    if (mapRef.current) {
      const outlineSource = mapRef.current.getSource("custom-polygon-outline") as mapboxgl.GeoJSONSource;
      if (outlineSource) {
        outlineSource.setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [clearSelection]);

  const handleResetOrientation = () => mapRef.current?.resetNorthPitch({ duration: 800 });
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 3D Mapbox Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Drawing Instruction Pill (when active) */}
      {activeDrawMode === "polygon" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 bg-slate-900/95 text-slate-200 border border-slate-700 rounded-full text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Click map to add perimeter vertices • Double-click to complete area</span>
        </div>
      )}

      {/* Prominent Floating Tactical Draw & View Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        {/* Draw Tools Dock */}
        <div className="p-1 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl flex items-center gap-1">
          <button
            onClick={() => {
              if (drawRef.current) drawRef.current.changeMode("simple_select");
              setActiveDrawMode("point");
            }}
            title="Point Selection Mode"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeDrawMode === "point"
                ? "bg-white text-slate-950 font-semibold shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Point</span>
          </button>

          <button
            onClick={handleStartDrawPolygon}
            title="Draw Polygon Area"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeDrawMode === "polygon"
                ? "bg-white text-slate-950 font-semibold shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Pentagon className="w-3.5 h-3.5" />
            <span>Draw Area</span>
          </button>

          <button
            onClick={handleClear}
            title="Clear Selection"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Heatmap Quick Toggle Pill */}
        <button
          onClick={() => toggleLayer("heatmap")}
          title="Toggle AQI Heatmap Density Overlay"
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 backdrop-blur-xl shadow-2xl transition-colors ${
            layers.heatmap
              ? "bg-slate-800 text-amber-300 border-amber-500/50 font-semibold"
              : "bg-slate-900/95 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Activity className={`w-3.5 h-3.5 ${layers.heatmap ? "text-amber-400" : "text-slate-400"}`} />
          <span className="hidden sm:inline">Heatmap</span>
        </button>

        {/* Zoom & Camera Controls */}
        <div className="p-1 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl flex items-center gap-0.5">
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetOrientation}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset North & Pitch"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
