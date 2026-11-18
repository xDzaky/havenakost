"use client";

import React, { useEffect, useRef, useState } from "react";
import type { KostListing, Landmark } from "@/types/kost";

interface LeafletMapProps {
  kosts: KostListing[];
  dest: Landmark;
  scanRadius: number;
  onOpenDetail: (id: string) => void;
  onSelectDest?: (dest: Landmark) => void;
}

// Marker Colors according to specification
const TYPE_COLORS: Record<string, string> = {
  putra: "#38BDF8",   // Sky blue
  putri: "#F472B6",   // Pink
  campur: "#A78BFA",  // Purple
  pasutri: "#F59E0B", // Amber / Warm Orange
};

const TYPE_LABELS: Record<string, string> = {
  putra: "Putra",
  putri: "Putri",
  campur: "Campur",
  pasutri: "Pasutri",
};

// OpenFreeMap Bright Style URL
const OPENFREEMAP_BRIGHT_STYLE = "https://tiles.openfreemap.org/styles/bright";

// Helper to generate GeoJSON polygon for radius circle
function createGeoJSONCircle(
  center: [number, number],
  radiusInMeters: number,
  points = 64
) {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const distanceX =
    radiusInMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusInMeters / 110540;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]); // close polygon

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

export function LeafletMap({
  kosts,
  dest,
  scanRadius,
  onOpenDetail,
  onSelectDest,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const destMarkerRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize MapLibre GL with OpenFreeMap Bright theme
  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        // Load MapLibre GL either from window (preloaded CDN) or dynamic import
        let maplibregl: any = (window as any).maplibregl;
        if (!maplibregl) {
          const mod = (await import("maplibre-gl")) as any;
          maplibregl = mod.default || mod;
        }

        if (isCancelled || !mapContainerRef.current) return;

        // Clean up previous instance
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {}
          mapInstanceRef.current = null;
        }

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: OPENFREEMAP_BRIGHT_STYLE,
          center: [dest.lng, dest.lat],
          zoom: 14,
          attributionControl: false, // will add custom attribution below
        });

        // Add navigation controls (zoom in/out, rotate)
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
          "top-right"
        );

        // Add proper attribution for OpenFreeMap and OpenStreetMap
        map.addControl(
          new maplibregl.AttributionControl({
            customAttribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &middot; <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>',
            compact: true,
          }),
          "bottom-right"
        );

        map.on("error", (e: any) => {
          if (e && e.error && e.error.message) {
            console.warn("MapLibre tile/style notice:", e.error.message);
          }
        });

        map.on("load", () => {
          if (isCancelled) return;
          setIsMapReady(true);

          // Add radius circle source and layers
          if (scanRadius > 0) {
            const circleData = createGeoJSONCircle(
              [dest.lng, dest.lat],
              scanRadius
            );

            map.addSource("dest-radius-source", {
              type: "geojson",
              data: circleData,
            });

            map.addLayer({
              id: "dest-radius-fill",
              type: "fill",
              source: "dest-radius-source",
              paint: {
                "fill-color": "#0D9488",
                "fill-opacity": 0.08,
              },
            });

            map.addLayer({
              id: "dest-radius-line",
              type: "line",
              source: "dest-radius-source",
              paint: {
                "line-color": "#0D9488",
                "line-width": 1.8,
                "line-opacity": 0.7,
              },
            });
          }
        });

        // Feature 8: Pemilihan destinasi melalui klik pada peta
        map.on("click", (e: any) => {
          // If clicked directly on the map surface (not on an active popup)
          if (onSelectDest && e.lngLat) {
            const lat = Number(e.lngLat.lat.toFixed(6));
            const lng = Number(e.lngLat.lng.toFixed(6));
            onSelectDest({
              id: "map-picked",
              name: `Titik Pilihan (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              short: "Pilihan Peta",
              lat,
              lng,
            });
          }
        });

        mapInstanceRef.current = map;
      } catch (err: any) {
        console.error("MapLibre initialization error:", err);
        setMapError(
          "Gagal memuat peta interaktif OpenFreeMap. Pastikan koneksi internet aktif."
        );
      }
    };

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map view & radius circle when destination or scanRadius changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      map.flyTo({
        center: [dest.lng, dest.lat],
        essential: true,
        speed: 1.2,
      });

      // Update radius circle
      if (map.getSource("dest-radius-source")) {
        if (scanRadius > 0) {
          const newCircle = createGeoJSONCircle(
            [dest.lng, dest.lat],
            scanRadius
          );
          (map.getSource("dest-radius-source") as any).setData(newCircle);
        } else {
          // Clear radius
          (map.getSource("dest-radius-source") as any).setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      } else if (map.isStyleLoaded() && scanRadius > 0) {
        const circleData = createGeoJSONCircle(
          [dest.lng, dest.lat],
          scanRadius
        );

        map.addSource("dest-radius-source", {
          type: "geojson",
          data: circleData,
        });

        map.addLayer({
          id: "dest-radius-fill",
          type: "fill",
          source: "dest-radius-source",
          paint: {
            "fill-color": "#0D9488",
            "fill-opacity": 0.08,
          },
        });

        map.addLayer({
          id: "dest-radius-line",
          type: "line",
          source: "dest-radius-source",
          paint: {
            "line-color": "#0D9488",
            "line-width": 1.8,
            "line-opacity": 0.7,
          },
        });
      }
    } catch (e) {}
  }, [dest, scanRadius]);

  // Update Destination Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let maplibregl: any = (window as any).maplibregl;
    if (!maplibregl) return;

    // Remove existing dest marker
    if (destMarkerRef.current) {
      try {
        destMarkerRef.current.remove();
      } catch (e) {}
      destMarkerRef.current = null;
    }

    try {
      // Create destination element
      const el = document.createElement("div");
      el.className = "hk-dest-marker";
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.backgroundColor = "#EF4444";
      el.style.border = "2.5px solid #ffffff";
      el.style.borderRadius = "50%";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.boxShadow = "0 3px 12px rgba(239, 68, 68, 0.5)";
      el.style.cursor = "grab";
      el.style.fontSize = "16px";
      el.style.color = "#ffffff";
      el.title = `Titik Tujuan: ${dest.name} (Tahan & seret untuk memindahkan)`;
      el.innerHTML = `🎯`;

      const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
        `<div style="font-family:sans-serif;font-size:12px;padding:4px 2px;">
          <b style="font-size:13px;color:#0F172A;display:block;margin-bottom:2px;">🎯 ${dest.name}</b>
          <span style="color:#64748B;">Titik acuan pengukuran jarak kost.</span>
        </div>`
      );

      const marker = new maplibregl.Marker({
        element: el,
        draggable: true,
      })
        .setLngLat([dest.lng, dest.lat])
        .setPopup(popup)
        .addTo(map);

      // Feature 8: Seret marker untuk mengubah destinasi
      marker.on("dragend", () => {
        if (onSelectDest) {
          const lngLat = marker.getLngLat();
          onSelectDest({
            id: "map-dragged",
            name: `Titik Pilihan (${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)})`,
            short: "Pilihan Peta",
            lat: Number(lngLat.lat.toFixed(6)),
            lng: Number(lngLat.lng.toFixed(6)),
          });
        }
      });

      destMarkerRef.current = marker;
    } catch (e) {}
  }, [dest, onSelectDest]);

  // Update Kost Markers & Popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let maplibregl: any = (window as any).maplibregl;
    if (!maplibregl) return;

    // Clear old markers
    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch (e) {}
    });
    markersRef.current = [];

    // Create markers for each kost
    kosts.forEach((k) => {
      const color = TYPE_COLORS[k.kost_type] || "#38BDF8";

      // Marker DOM Element
      const el = document.createElement("div");
      el.className = "hk-kost-marker";
      el.style.width = "17px";
      el.style.height = "17px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = color;
      el.style.border = "2px solid #ffffff";
      el.style.boxShadow = "0 2px 7px rgba(0,0,0,0.28)";
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.18s ease";

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.25)";
        el.style.zIndex = "10";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        el.style.zIndex = "1";
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

      const typeLabel = TYPE_LABELS[k.kost_type] || "Kost";

      const popHtml = `
        <div style="width:215px;font-family:sans-serif;padding:2px;">
          <div style="position:relative;margin-bottom:8px;border-radius:10px;overflow:hidden;">
            <img src="${cov}" style="width:100%;height:105px;object-fit:cover;display:block;">
            <span style="position:absolute;top:6px;left:6px;background:${color};color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.2);">
              ${typeLabel}
            </span>
          </div>
          <b style="font-size:13.5px;display:block;margin-bottom:3px;color:#0F172A;line-height:1.25;">${k.name}</b>
          <div style="color:#64748B;font-size:11.5px;margin-bottom:6px;">
            ${k.district} &middot; <span style="color:#0D9488;font-weight:700;">${distStr}</span> dari tujuan
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <b style="color:#0D9488;font-size:14px;font-weight:800;">
              Rp ${Number(k.price_monthly).toLocaleString("id-ID")}<small style="font-weight:500;color:#64748B;font-size:11px;">/bln</small>
            </b>
            <span style="font-size:11px;color:${k.available_rooms > 0 ? "#16A34A" : "#DC2626"};font-weight:700;">
              ${k.available_rooms > 0 ? `Sisa ${k.available_rooms} kamar` : "Penuh"}
            </span>
          </div>
          <button id="btn-maplibre-${k.id}" style="width:100%;background:#0D9488;color:#ffffff;border:none;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;display:block;text-align:center;box-shadow:0 2px 6px rgba(13,148,136,0.3);">
            Lihat Detail Kost
          </button>
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 14,
        closeButton: true,
        maxWidth: "245px",
      }).setHTML(popHtml);

      // Attach button click event when popup opens
      popup.on("open", () => {
        setTimeout(() => {
          const btn = document.getElementById(`btn-maplibre-${k.id}`);
          if (btn) {
            btn.onclick = (ev) => {
              ev.stopPropagation();
              onOpenDetail(k.id);
            };
          }
        }, 30);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([k.lng, k.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [kosts, onOpenDetail]);

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
      {/* MAP HEADER */}
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
          <svg
            className="ic"
            style={{ width: 17, height: 17, color: "#0D9488" }}
          >
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
          <span
            style={{
              fontSize: 11,
              color: "var(--mut)",
              background: "#E2E8F0",
              padding: "2px 7px",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            OpenFreeMap (Bright)
          </span>
        </div>

        {/* COLOR CODED LEGEND */}
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
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <i
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#38BDF8",
                display: "inline-block",
                border: "1px solid #fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />{" "}
            Putra
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <i
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#F472B6",
                display: "inline-block",
                border: "1px solid #fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />{" "}
            Putri
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <i
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#A78BFA",
                display: "inline-block",
                border: "1px solid #fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />{" "}
            Campur
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <i
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#F59E0B",
                display: "inline-block",
                border: "1px solid #fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />{" "}
            Pasutri
          </span>
        </div>
      </div>

      {/* MAP VIEW CONTAINER */}
      <div style={{ position: "relative" }}>
        {mapError && (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              right: 16,
              zIndex: 10,
              background: "#FEE2E2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {mapError}
          </div>
        )}

        <div
          ref={mapContainerRef}
          id="maplibreContainer"
          style={{
            width: "100%",
            height: 560,
            background: "#F1F5F9",
          }}
        />

        {/* INTERACTION HINT OVERLAY */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 12,
            zIndex: 2,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(4px)",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--ink2)",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            pointerEvents: "none",
          }}
        >
          💡 Klik atau seret titik 🎯 untuk memindahkan lokasi tujuan
        </div>
      </div>
    </div>
  );
}
