"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const Map = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

type Props = {
  title?: string;
  subtitle?: string;
  center?: [number, number];
  zoom?: number;
  geojsonUrl?: string; // e.g. "/geo/riyadh.json" in /public
};

export default function MapHero({
  title = "الرياض",
  subtitle = "ملخص المؤشرات",
  center = [24.7136, 46.6753],
  zoom = 9,
  geojsonUrl,
}: Props) {
  const [region, setRegion] = useState<any>(null);

  useEffect(() => {
    if (!geojsonUrl) return;
    fetch(geojsonUrl).then((r) => r.json()).then(setRegion).catch(() => setRegion(null));
  }, [geojsonUrl]);

  return (
    <section className="relative w-full rounded-3xl overflow-hidden shadow-lg ring-1 ring-[--border]">
      <div className="h-[420px]">
        <Map center={center} zoom={zoom} className="h-full w-full">
          {/*
            If you’ll move to MapTiler or custom Arabic vector tiles later,
            swap this tile URL (works well for now):
          */}
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {region && (
            <GeoJSON
              data={region}
              style={() => ({
                weight: 2,
                color: "var(--brand)",
                fillColor: "var(--brand)",
                fillOpacity: 0.08,
              })}
            />
          )}
        </Map>
      </div>

      {/* Gradient + text overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[--background] via-transparent to-transparent" />
      <div className="absolute bottom-6 right-6 left-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {/* KPI pills go here (caller supplies them) */}
      </div>
    </section>
  );
}
