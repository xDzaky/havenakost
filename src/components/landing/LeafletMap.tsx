"use client";

import React, { useEffect, useRef } from "react";
import type { KostListing, Landmark } from "@/types/kost";

interface LeafletMapProps {
  kosts: KostListing[];
  dest: Landmark;
  scanRadius: number;
  onOpenDetail: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  putra: "#0369A1",
  putri: "#DB2777",
  campur: "#0D9488",
  pasutri: "#7C3AED",
};

export function LeafletMap({
  kosts,
  dest,
  scanRadius,
  onOpenDetail,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Check if Leaflet is available in window
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Destroy existing map if any
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {}
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: true,
        zoomControl: true,
        preferCanvas: true,
      }).setView([dest.lat, dest.lng], 14);

      // Open-source CartoDB Voyager Tiles (No 403 block, ultra clean design)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Destination Marker
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:30px;height:30px;background:#EF4444;border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(239,68,68,.5);font-size:15px;color:#fff;">🎯<div class="hk-dest-pulse"></div></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      L.marker([dest.lat, dest.lng], { icon: destIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(
          `<b>Titik Tujuan: ${dest.name}</b><br><small style="color:#64748B">Jarak kost diukur dari titik ini.</small>`
        );

      // Scan Radius Circle
      if (scanRadius > 0) {
        L.circle([dest.lat, dest.lng], {
          radius: scanRadius,
          color: "#0D9488",
          weight: 1.5,
          fillColor: "#0D9488",
          fillOpacity: 0.08,
        }).addTo(map);
      }

      // Fast HTML5 Canvas renderer for zero-lag pins
      const canvasRenderer = L.canvas({ padding: 0.5 });

      kosts.forEach((k) => {
        const color = TYPE_COLORS[k.kost_type] || "#0D9488";
        const marker = L.circleMarker([k.lat, k.lng], {
          renderer: canvasRenderer,
          radius: 7,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          fillOpacity: 0.95,
        });

        const cov =
          k.photos && k.photos.length > 0
            ? k.photos[0].photo_url
            : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=80";

        const distStr =
          k._d != null
            ? k._d < 1000
              ? `${Math.round(k._d / 10) * 10} m`
              : `${(k._d / 1000).toFixed(1).replace(".", ",")} km`
            : "";

        const popHtml = `
          <div style="width:200px;font-family:sans-serif;">
            <img src="${cov}" style="width:100%;height:95px;object-fit:cover;border-radius:8px;margin-bottom:6px;">
            <b style="font-size:13px;display:block;margin-bottom:2px;color:#0F172A;">${k.name}</b>
            <small style="color:#64748B;display:block;margin-bottom:4px;">${k.district} &middot; ${distStr} dari tujuan</small>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
              <b style="color:#0D9488;font-size:13.5px;">Rp ${Number(k.price_monthly).toLocaleString("id-ID")}<small style="font-weight:400;color:#64748B">/bln</small></b>
            </div>
            <button id="btn-map-${k.id}" style="width:100%;margin-top:8px;background:#0D9488;color:#fff;border:none;border-radius:6px;padding:7px;font-size:12px;font-weight:700;cursor:pointer;">Lihat Detail</button>
          </div>
        `;

        marker.bindPopup(popHtml);
        marker.on("popupopen", () => {
          const btn = document.getElementById(`btn-map-${k.id}`);
          if (btn) {
            btn.onclick = () => onOpenDetail(k.id);
          }
        });

        marker.addTo(map);
      });

      mapInstanceRef.current = map;

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch (e) {}
      }, 200);
    } catch (err) {
      console.error("Map render error:", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, [kosts, dest, scanRadius]);

  return (
    <div
      className="mapbox"
      style={{
        background: "#fff",
        borderRadius: 20,
        border: "1px solid var(--line)",
        overflow: "hidden",
        boxShadow: "var(--sh-md)",
      }}
    >
      <div
        className="map-head"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          background: "#F8FAFC",
          borderBottom: "1px solid var(--line)",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg className="ic" style={{ width: 17, height: 17, color: "#0D9488" }}>
            <use href="#i-map" />
          </svg>
          <b style={{ fontSize: 13, color: "var(--teal-950)" }}>
            Peta Interaktif Kost Malang Raya
          </b>
          <span
            style={{
              background: "var(--emerald-soft2)",
              color: "var(--emerald-dark)",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {kosts.length} kost
          </span>
        </div>

        <div
          className="map-legend"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 11.5,
            color: "var(--ink2)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: "#0369A1", display: "inline-block" }} /> Putra
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: "#DB2777", display: "inline-block" }} /> Putri
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: "#0D9488", display: "inline-block" }} /> Campur
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED", display: "inline-block" }} /> Pasutri
          </span>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        id="leafletMap"
        style={{
          width: "100%",
          height: 560,
          background: "#E2E8F0",
        }}
      />
    </div>
  );
}
