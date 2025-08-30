// lib/geo.ts

/** Pick a human-readable name from typical region props */
export function getFeatureName(props: Record<string, any>): string {
  return (
    props?.name ??
    props?.Name ??
    props?.arabic ??
    props?.region ??
    "—"
  );
}

/** Compute bbox for a FeatureCollection (lon/lat) */
export function geojsonBounds(fc: GeoJSON.FeatureCollection) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    const polys: number[][][] =
      g.type === "Polygon"
        ? (g as GeoJSON.Polygon).coordinates
        : (g as GeoJSON.MultiPolygon).coordinates.flat(1);
    for (const ring of polys) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return [
    [minX, minY] as [number, number],
    [maxX, maxY] as [number, number],
  ] as const;
}

/** Clone + attach counts by normalized region name into metricKey (default 'count') */
export function attachCounts(
  fc: GeoJSON.FeatureCollection,
  counts: Map<string, number>,
  normalize: (s: string) => string,
  metricKey = "count"
): GeoJSON.FeatureCollection {
  const clone = JSON.parse(JSON.stringify(fc));
  clone.features.forEach((f: any) => {
    const name = getFeatureName(f.properties ?? {});
    const key = normalize(String(name));
    f.properties[metricKey] = counts.get(key) ?? 0;
  });
  return clone;
}
