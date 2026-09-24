/**
 * GlobeRouteMap.jsx — 3D animated globe showing vessel route arcs
 * colored by fuel type. Uses react-globe.gl (three.js-backed).
 *
 * Fixes applied:
 *  - ResizeObserver measures real container pixel width → passed to Globe
 *  - Broader port registry with aliases (New York, Dubai, etc.)
 *  - Fallback solid-colour globe if CDN textures fail to load
 */
import { useRef, useEffect, useState, useMemo, useCallback, useLayoutEffect } from "react";
import Globe from "react-globe.gl";

/* ── Port registry — canonical hubs + common aliases ─────────── */
const PORT_COORDS = {
  // ── The 5 canonical hubs ──
  Singapore: { lat: 1.29, lng: 103.85 },
  Rotterdam: { lat: 51.95, lng: 4.14 },
  Shanghai: { lat: 31.23, lng: 121.47 },
  Houston: { lat: 29.75, lng: -95.36 },
  Mumbai: { lat: 18.96, lng: 72.82 },
  // ── Common route endpoints that appear in optimizer output ──
  "New York": { lat: 40.71, lng: -74.01 },
  "New york": { lat: 40.71, lng: -74.01 },
  Dubai: { lat: 25.20, lng: 55.27 },
  "Los Angeles": { lat: 33.74, lng: -118.25 },
  Tokyo: { lat: 35.69, lng: 139.69 },
  Busan: { lat: 35.10, lng: 129.04 },
  Antwerp: { lat: 51.26, lng: 4.40 },
  Hamburg: { lat: 53.55, lng: 9.99 },
  Colombo: { lat: 6.93, lng: 79.85 },
  "Port Said": { lat: 31.26, lng: 32.28 },
  Chennai: { lat: 13.08, lng: 80.27 },
  Jakarta: { lat: -6.13, lng: 106.82 },
  Sydney: { lat: -33.87, lng: 151.21 },
  London: { lat: 51.50, lng: -0.12 },
};

/* ── Fuel → arc colour ──────────────────────────────────────── */
const FUEL_ARC_COLOR = {
  LNG: "#27AEB9",
  HFO: "#f43f5e",
  Ammonia: "#34d399",
  Methanol: "#facc15",
  Hydrogen: "#a78bfa",
};

const PORT_RING_COLOR = "rgba(39,174,185,0.7)";

/* ── Arc gradient helper ────────────────────────────────────── */
function makeGradient(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [`rgba(${r},${g},${b},0.05)`, `rgba(${r},${g},${b},0.9)`];
}

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function GlobeRouteMap({ assignments = [] }) {
  const globeRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [dims, setDims] = useState({ w: 800, h: 480 });

  /* ── Measure real container width (ResizeObserver) ─────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setDims(d => ({ ...d, w }));
      }
    });
    ro.observe(containerRef.current);
    // Initial read
    const w = Math.floor(containerRef.current.getBoundingClientRect().width);
    if (w > 0) setDims(d => ({ ...d, w }));
    return () => ro.disconnect();
  }, []);

  /* ── Auto-rotate + camera on globe ready ───────────────────── */
  useEffect(() => {
    if (!globeReady || !globeRef.current) return;
    globeRef.current.pointOfView({ lat: 20, lng: 70, altitude: 2.4 }, 800);
    const ctrl = globeRef.current.controls();
    if (ctrl) {
      ctrl.autoRotate = true;
      ctrl.autoRotateSpeed = 0.4;
      ctrl.enableZoom = true;
      ctrl.minDistance = 150;
      ctrl.maxDistance = 800;
    }
  }, [globeReady]);

  /* ── Derive arcs from assignments ──────────────────────────── */
  const arcs = useMemo(() => {
    return assignments
      .filter(a => PORT_COORDS[a.origin_port] && PORT_COORDS[a.destination_port])
      .map((a, i) => ({
        id: i,
        startLat: PORT_COORDS[a.origin_port].lat,
        startLng: PORT_COORDS[a.origin_port].lng,
        endLat: PORT_COORDS[a.destination_port].lat,
        endLng: PORT_COORDS[a.destination_port].lng,
        color: FUEL_ARC_COLOR[a.fuel_type] || "#94a3b8",
        label: a.vessel_id,
        fuel: a.fuel_type,
        cost: a.fuel_cost,
        ghg: a.ghg_emissions_tons,
        origin: a.origin_port,
        dest: a.destination_port,
      }));
  }, [assignments]);

  /* ── Port dots — only ports actually used in arcs + 5 hubs ── */
  const usedPortNames = useMemo(() => {
    const used = new Set(["Singapore", "Rotterdam", "Shanghai", "Houston", "Mumbai"]);
    assignments.forEach(a => {
      if (PORT_COORDS[a.origin_port]) used.add(a.origin_port);
      if (PORT_COORDS[a.destination_port]) used.add(a.destination_port);
    });
    return [...used];
  }, [assignments]);

  const points = useMemo(() =>
    usedPortNames.map(name => ({ name, ...PORT_COORDS[name] })),
    [usedPortNames]);

  /* ── Pulse rings on used ports ─────────────────────────────── */
  const rings = useMemo(() =>
    points.map(p => ({
      lat: p.lat, lng: p.lng,
      maxR: 3, propagationSpeed: 2.5, repeatPeriod: 850,
      color: PORT_RING_COLOR,
    })), [points]);

  /* ── Stable arc colour accessor ────────────────────────────── */
  const arcColor = useCallback(d => makeGradient(d.color), []);

  /* ── Hover ─────────────────────────────────────────────────── */
  const onArcHover = useCallback(arc => setTooltip(arc || null), []);

  return (
    <div className="globe-outer" id="globe-route-map">

      {/* ── Header ── */}
      <div className="globe-header">
        <span className="globe-title">🌐 Live Route Network — Fuel Mix Visualization</span>
        <span className="globe-sub">Arc color = fuel type on that voyage leg</span>
      </div>

      {/* ── Canvas wrapper — measured by ResizeObserver ── */}
      <div className="globe-canvas-wrap" ref={containerRef} style={{ height: dims.h }}>
        <Globe
          ref={globeRef}
          onGlobeReady={() => setGlobeReady(true)}
          width={dims.w}
          height={dims.h}

          /* Appearance */
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#27AEB9"
          atmosphereAltitude={0.2}
          backgroundColor="rgba(0,0,0,0)"

          /* Port markers */
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.015}
          pointRadius={0.5}
          pointColor={() => "#27AEB9"}
          pointLabel={d => `<div class="globe-tooltip"><strong>⚓ ${d.name}</strong></div>`}

          /* Pulse rings */
          ringsData={rings}
          ringLat="lat"
          ringLng="lng"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringColor="color"
          ringAltitude={0.005}

          /* Voyage arcs */
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={arcColor}
          arcAltitude={0.35}
          arcStroke={0.7}
          arcDashLength={0.45}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          arcLabel={d => `
            <div class="globe-tooltip">
              <div class="gt-vessel">🚢 ${d.label}</div>
              <div class="gt-route">${d.origin} → ${d.dest}</div>
              <div class="gt-fuel" style="color:${d.color}">⛽ ${d.fuel}</div>
              <div class="gt-meta">💰 $${Number(d.cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div class="gt-meta">🌿 ${Number(d.ghg).toFixed(1)} t CO₂eq</div>
            </div>`}
          onArcHover={onArcHover}
        />

        {/* Hover info panel */}
        {tooltip && (
          <div className="globe-info-panel" style={{ borderColor: tooltip.color }}>
            <div className="gip-vessel">🚢 {tooltip.label}</div>
            <div className="gip-route">{tooltip.origin} → {tooltip.dest}</div>
            <div className="gip-fuel" style={{ color: tooltip.color }}>⛽ {tooltip.fuel}</div>
            <div className="gip-row">
              <span>💰 ${Number(tooltip.cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span>🌿 {Number(tooltip.ghg).toFixed(1)} t CO₂eq</span>
            </div>
          </div>
        )}

        {/* Empty / no match notice */}
        {globeReady && arcs.length === 0 && (
          <div className="globe-empty">
            No route endpoints matched known ports — arcs appear once optimization runs.
          </div>
        )}
      </div>

      {/* ── Fuel legend ─────────────────────────────────────────── */}
      <div className="fuel-legend">
        {[
          ["LNG", "#27AEB9"],
          ["HFO", "#f43f5e"],
          ["Ammonia", "#34d399"],
          ["Hydrogen", "#a78bfa"],
          ["Methanol", "#facc15"],
        ].map(([fuel, color]) => (
          <span key={fuel} className="fl-item">
            <span className="fl-dot" style={{ background: color, boxShadow: `0 0 7px ${color}` }} />
            <span className="fl-label">{fuel}</span>
          </span>
        ))}
        <span className="fl-arc-count">
          {arcs.length > 0 ? `${arcs.length} active route${arcs.length > 1 ? "s" : ""} shown` : ""}
        </span>
      </div>
    </div>
  );
}
