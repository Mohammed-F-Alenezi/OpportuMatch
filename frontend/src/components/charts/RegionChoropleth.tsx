"use client";

import Map, {
  Source as MapSource,
  Layer as MapLayer,
  MapMouseEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";


import { compactEN } from "@/lib/format";

type Props = {
  geojson: any;
  metricKey?: string; // default: "count"
  max?: number;
};
import React, { useState, useMemo } from "react";



const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const RAMP = ["#0b1b13", "#0f3b2d", "#0b5a3d", "#118a57", "#31c47d", "#7bedaf"];

/** يجعل نقاط المجال متزايدة بشكل صارم */
function strictlyAscending(domain: number[]) {
  const eps = 1e-6;
  for (let i = 1; i < domain.length; i++) {
    if (domain[i] <= domain[i - 1]) domain[i] = domain[i - 1] + eps;
  }
  return domain;
}

export default function RegionChoropleth({
  geojson,
  metricKey = "count",
  max,
}: Props) {
  const [hover, setHover] = useState<{
    name?: string;
    value?: number;
    x: number;
    y: number;
  } | null>(null);

  const { rampStops, maxVal } = useMemo(() => {
    const values = (geojson?.features ?? [])
      .map((f: any) => Number(f?.properties?.[metricKey]) || 0)
      .filter((v: number) => Number.isFinite(v));

    let m = max ?? (values.length ? Math.max(...values) : 0);
    if (!(m > 0)) m = 1; // ضمان حد أدنى

    // 0%,20%,40%,60%,80%,100%
    const domain = strictlyAscending([0, m * 0.2, m * 0.4, m * 0.6, m * 0.8, m]);

    // بناء stops بالشكل: value,color,value,color,...
    const stops: (number | string)[] = [];
    for (let i = 0; i < domain.length; i++) {
      stops.push(domain[i], RAMP[i]);
    }
    return { rampStops: stops, maxVal: m };
  }, [geojson, metricKey, max]);

  const handleMove = (e: MapMouseEvent) => {
    const f = e.features?.[0] as any;
    if (!f) return setHover(null);
    const name =
      f.properties?.name ||
      f.properties?.Name ||
      f.properties?.arabic ||
      f.properties?.region ||
      "—";
    const val = Number(f.properties?.[metricKey]) || 0;
    setHover({ name, value: val, x: e.point.x, y: e.point.y });
  };

  const handleLeave = () => setHover(null);

  // حارس بسيط لو ما وصل GeoJSON
  if (!geojson) {
    return (
      <div className="relative h-64 lg:h-80 rounded-2xl bg-neutral-900/40 grid place-items-center">
        <span className="text-sm text-white/70">لا توجد بيانات خريطة</span>
      </div>
    );
  }

  return (
    <div className="relative h-64 lg:h-80 rounded-2xl overflow-hidden">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle={DARK_STYLE}
        initialViewState={{ latitude: 23.8859, longitude: 45.0792, zoom: 4.2 }}
        interactiveLayerIds={["choropleth-fill"]}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <MapSource id="regions" type="geojson" data={geojson}>
          <MapLayer
            id="choropleth-fill"
            type="fill"
            paint={{
              "fill-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["get", metricKey], 0],
                ...(rampStops as any),
              ],
              "fill-opacity": 0.78,
            }}
          />
          <MapLayer
            id="choropleth-outline"
            type="line"
            paint={{
              "line-color": "#2cd37b",
              "line-width": 1.2,
              "line-opacity": 0.65,
            }}
          />
        </MapSource>
      </Map>

      <Legend maxVal={maxVal} />

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl bg-black/75 text-white px-3 py-2 text-xs whitespace-nowrap shadow-lg"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="opacity-80 mb-0.5">{hover.name}</div>
          <div className="font-medium">{compactEN(hover.value ?? 0)} منشأة</div>
        </div>
      )}
    </div>
  );
}

function Legend({ maxVal }: { maxVal: number }) {
  return (
    <div className="absolute left-3 bottom-3 z-10 rounded-lg bg-black/55 backdrop-blur px-2.5 py-2">
      <div className="text-[10px] text-white/70 mb-1">تركيز المنشآت</div>
      <div
        className="h-2 w-40 rounded"
        style={{
          background: `linear-gradient(90deg, ${RAMP[0]} 0%, ${RAMP[1]} 20%, ${RAMP[2]} 40%, ${RAMP[3]} 60%, ${RAMP[4]} 80%, ${RAMP[5]} 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-white/60 mt-1">
        <span>منخفض</span>
        <span>{compactEN(maxVal)}</span>
      </div>
    </div>
  );
}
