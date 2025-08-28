"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Atlas-style vector map using d3plus-geomap.
 * - Filters to KSA (ISO-3166 numeric id 682)
 * - Ocean transparent; polygon uses your brand color
 */
export default function AtlasMap({
  height = 440,
  countryNumericId = 682,
  color = "var(--brand)",
  ocean = "transparent",
}: {
  height?: number;
  countryNumericId?: number | string;
  color?: string;
  ocean?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const mod: any = await import("d3plus-geomap");
        const Geomap = mod.Geomap || mod.default || mod.GeoMap;
        if (!Geomap) throw new Error("d3plus-geomap: Geomap class not found");

        const world = await fetch(
          "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
        ).then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch world-atlas: ${r.status}`);
          return r.json();
        });

        if (!alive || !ref.current) return;

        const viz = new Geomap()
          .select(ref.current)
          .tiles(false)                 // ✅ FIX: plural method name
          .zoom(false)
          .ocean(ocean)
          .fit("height")
          .topojson(world)
          .topojsonKey("countries")
          .topojsonId("id")
          .topojsonFilter((d: any) => +d.id === +countryNumericId)
          .projection("mercator")
          .data([{ id: countryNumericId, value: 1 }])
          .groupBy("id")
          .shapeConfig({
            fill: color,
            stroke: color,
            strokeWidth: 1.25,
          })
          .legend(false);

        await viz.render();
        setErr(null);
      } catch (e: any) {
        console.error("Geomap init failed:", e);
        setErr(e?.message || String(e));
        if (ref.current) ref.current.innerHTML = "";
      }
    })();

    return () => {
      alive = false;
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [countryNumericId, color, ocean]);

  return (
    <section
      className="relative w-full overflow-hidden rounded-3xl shadow-lg ring-1"
      style={{ height, borderColor: "var(--border)" }}
      dir="ltr"
    >
      <div ref={ref} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[--background] via-transparent to-transparent" />
      {err && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive/90 bg-black/10">
          {err}
        </div>
      )}
    </section>
  );
}
