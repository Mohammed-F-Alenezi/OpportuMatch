"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import Map, { Source as MapSource, Layer as MapLayer, MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { compactEN } from "@/lib/format";

type Props = {
  geojson: GeoJSON.FeatureCollection | null;
  metricKey?: string;            // default "count"
  max?: number;
  mapStyle?: string;             // default mapbox dark
  interactive?: boolean;         // default true
  fitToBoundsPadding?: number;   // default 24
  hideLegend?: boolean;          // default true
  hideTooltip?: boolean;         // default false
  cleanChrome?: boolean;         // default true
  className?: string;            // parent controls height/width (NO hardcoded heights here)
};

const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const RAMP = ["#0b1b13","#0f3b2d","#0b5a3d","#118a57","#31c47d","#7bedaf"];

function strictlyAscending(d: number[]) {
  const e = 1e-6;
  for (let i = 1; i < d.length; i++) if (d[i] <= d[i-1]) d[i] = d[i-1] + e;
  return d;
}
function geojsonBounds(fc: GeoJSON.FeatureCollection) {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const f of fc.features) {
    const g = f.geometry; if (!g) continue;
    const polys: number[][][] =
      g.type === "Polygon"
        ? (g as GeoJSON.Polygon).coordinates
        : (g as GeoJSON.MultiPolygon).coordinates.flat(1);
    for (const ring of polys) for (const [x,y] of ring) {
      if (x<minX) minX=x; if (y<minY) minY=y; if (x>maxX) maxX=x; if (y>maxY) maxY=y;
    }
  }
  return [[minX,minY] as [number,number],[maxX,maxY] as [number,number]] as const;
}

export default function RegionChoropleth({
  geojson,
  metricKey="count",
  max,
  mapStyle=DARK_STYLE,
  interactive=true,
  fitToBoundsPadding=24,
  hideLegend=true,
  hideTooltip=false,
  cleanChrome=true,
  className="",
}: Props) {
  if (!geojson) {
    return (
      <div className={`relative rounded-2xl bg-neutral-900/40 grid place-items-center ${className}`}>
        <span className="text-sm text-white/70">لا توجد بيانات خريطة</span>
      </div>
    );
  }

  const [hover, setHover] = useState<{name?:string; value?:number; x:number; y:number} | null>(null);

  const { rampStops, maxVal } = useMemo(() => {
    const vals = (geojson.features ?? [])
      .map((f: any) => Number(f?.properties?.[metricKey]) || 0)
      .filter((v: number) => Number.isFinite(v));
    let m = max ?? (vals.length ? Math.max(...vals) : 0);
    if (!(m > 0)) m = 1;
    const domain = strictlyAscending([0,m*0.2,m*0.4,m*0.6,m*0.8,m]);
    const stops:(number|string)[]=[]; for (let i=0;i<domain.length;i++) stops.push(domain[i],RAMP[i]);
    return { rampStops: stops, maxVal: m };
  }, [geojson, metricKey, max]);

  const mapRef = useRef<any>(null);
  const bounds = useMemo(() => geojsonBounds(geojson), [geojson]);
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (map && bounds) {
      // @ts-ignore
      map.fitBounds(bounds, { padding: fitToBoundsPadding, duration: 0 });
    }
  }, [bounds, fitToBoundsPadding]);

  const onMove = (e: MapMouseEvent) => {
    if (!interactive || hideTooltip) return;
    const f = e.features?.[0] as any;
    if (!f) return setHover(null);
    const name = f.properties?.name || f.properties?.Name || f.properties?.arabic || f.properties?.region || "—";
    const val = Number(f.properties?.[metricKey]) || 0;
    setHover({ name, value: val, x: e.point.x, y: e.point.y });
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden ${cleanChrome ? "choropleth-clean" : ""} ${className}`}>
      <div className="absolute inset-0">
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle={mapStyle}
          attributionControl={false}   // <<< remove big bar at the bottom
          initialViewState={{ latitude: 23.8859, longitude: 45.0792, zoom: 4.2 }}
          interactiveLayerIds={["choropleth-fill"]}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <MapSource id="regions" type="geojson" data={geojson}>
            <MapLayer
              id="choropleth-fill"
              type="fill"
              paint={{
                "fill-color": ["interpolate", ["linear"], ["coalesce", ["to-number", ["get", metricKey]], 0], ...(rampStops as any)],
                "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.88, 0.78],
              }}
            />
            <MapLayer
              id="choropleth-outline"
              type="line"
              paint={{ "line-color": "rgba(44, 211, 123, .75)", "line-width": 1.4, "line-opacity": 0.85 }}
            />
          </MapSource>
        </Map>
      </div>

      {!hideLegend && (
        <div className="absolute left-3 bottom-3 z-10 rounded-lg bg-black/55 backdrop-blur px-2.5 py-2">
          <div className="text-[10px] text-white/70 mb-1">تركيز المنشآت</div>
          <div className="h-2 w-40 rounded"
               style={{background:`linear-gradient(90deg, ${RAMP[0]} 0%, ${RAMP[1]} 20%, ${RAMP[2]} 40%, ${RAMP[3]} 60%, ${RAMP[4]} 80%, ${RAMP[5]} 100%)`}} />
          <div className="flex justify-between text-[10px] text-white/60 mt-1"><span>منخفض</span><span>{compactEN(maxVal)}</span></div>
        </div>
      )}

      {hover && !hideTooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl bg-black/75 text-white px-3 py-2 text-xs whitespace-nowrap shadow-lg"
          style={{ left: Math.min(hover.x + 12, (typeof window !== "undefined" ? window.innerWidth : 1200) - 180), top: hover.y + 12 }}
        >
          <div className="opacity-80 mb-0.5">{hover.name}</div>
          <div className="font-medium">{compactEN(hover.value ?? 0)} منشأة</div>
        </div>
      )}
    </div>
  );
}
