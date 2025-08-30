"use client";

import { useEffect, useMemo, useState } from "react";

/* loaders + metrics */
import { loadCsvFinance, loadExcelCounts } from "lib/loaders";
import {
  computeKPIs,
  seriesFinance,
  seriesSizesByYear,
  donutLatestSize,
  regionCountsLatest,
} from "lib/metrics";

/* helpers */
import { formatNumberArabic, pct } from "lib/format";
import { normalizeRegionName } from "lib/regions";

/* UI components */
/* UI components */
import KpiStat from "@/components/KpiStat";
import ProjectsList from "@/components/ProjectsList";
import FinanceLine from "@/components/charts/FinanceLine";
import SizesStackedBar from "@/components/charts/SizesStackedBar";
import SizeDonut from "@/components/charts/SizeDonut";
import RegionChoropleth from "@/components/charts/RegionChoropleth";

/* icons */
import {
  Building2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Trophy,
  MapPin,
} from "lucide-react";

export default function Page() {
  const [csv, setCsv] = useState<any[]>([]);
  const [xls, setXls] = useState<any[]>([]);
  const [geo, setGeo] = useState<any>(null);

  useEffect(() => {
    loadCsvFinance().then(setCsv);
    loadExcelCounts().then(setXls);
    fetch("/data/sa_regions.geojson").then((r) => r.json()).then(setGeo);
  }, []);

  const kpis = useMemo(
    () => (csv.length && xls.length ? computeKPIs(csv, xls) : null),
    [csv, xls]
  );
  const fin = useMemo(() => (csv.length ? seriesFinance(csv) : null), [csv]);
  const sizes = useMemo(
    () => (xls.length ? seriesSizesByYear(xls) : null),
    [xls]
  );
  const donut = useMemo(
    () => (xls.length ? donutLatestSize(xls) : null),
    [xls]
  );

  // دمج counts من الإكسل إلى الـ GeoJSON للخريطة
  const choroplethGeo = useMemo(() => {
    if (!geo || !xls.length) return null;

    const counts = regionCountsLatest(xls); // Map(normalizedRegion -> count)
    const clone = JSON.parse(JSON.stringify(geo));
    clone.features.forEach((f: any) => {
      const rawName =
        f.properties?.name ||
        f.properties?.Name ||
        f.properties?.arabic ||
        f.properties?.region ||
        "";
      const key = normalizeRegionName(String(rawName));
      f.properties.count = counts.get(key) || 0;
    });
    return clone;
  }, [geo, xls]);

  return (
    <div className="space-y-5">
      {/* ===== KPIs (3 فوق + 2 تحت "ثابتة" لكل الشاشات الكبيرة) ===== */}
<section className="space-y-4">
  {/* الصف الأول: 3 كروت */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <KpiStat
      title="إجمالي المنشآت"
      value={formatNumberArabic(kpis?.totalSMEs ?? 0)}
      subtitle={
        kpis?.latestQuarterLabel ??
        (kpis?.latestYear ? `آخر سنة: ${kpis.latestYear}` : "—")
      }
      icon={<Building2 size={20} />}
      tone="amber"
      delta={
        kpis?.yoy != null
          ? { kind: kpis.yoy >= 0 ? "up" : "down", value: `YoY ${kpis.yoy.toFixed(1)}%` }
          : undefined
      }
    />

    <KpiStat
      title="معدل النمو السنوي (YoY)"
      value={kpis?.yoy != null ? `${kpis.yoy.toFixed(1)}%` : "—"}
      subtitle={kpis?.latestYear ? `مقارنة بـ ${kpis.latestYear - 1}` : "—"}
      icon={(kpis?.yoy ?? 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
      tone="teal"
      delta={
        kpis?.yoy != null
          ? { kind: kpis.yoy >= 0 ? "up" : "down", value: pct(kpis.yoy, 1) }
          : undefined
      }
    />

    <KpiStat
      title="التغير الفصلي (QoQ)"
      value={kpis?.qoq != null ? `${kpis.qoq.toFixed(1)}%` : "—"}
      subtitle="مقارنة بالربع السابق"
      icon={<BarChart3 size={20} />}
      tone="blue"
      delta={
        kpis?.qoq != null
          ? { kind: kpis.qoq >= 0 ? "up" : "down", value: pct(kpis.qoq, 1) }
          : undefined
      }
    />
  </div>

  {/* الصف الثاني: 2 كرت */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <KpiStat
      title="القطاع الأسرع نموًا"
      value={kpis?.fastestSector?.name ?? "—"}
      subtitle={kpis?.fastestSector ? `+${kpis.fastestSector.yoy.toFixed(1)}% YoY` : "—"}
      icon={<Trophy size={20} />}
      tone="violet"
      delta={
        kpis?.fastestSector
          ? { kind: "up", value: `+${kpis.fastestSector.yoy.toFixed(1)}%` }
          : undefined
      }
    />

    <KpiStat
      title="المنطقة الأعلى تركّزًا"
      value={kpis?.topRegion?.name ?? "—"}
      subtitle={
        kpis?.topRegion
          ? `حصة ${kpis.topRegion.sharePct.toFixed(1)}% — ${new Intl.NumberFormat("en").format(
              kpis.topRegion.count
            )} منشأة`
          : "—"
      }
      icon={<MapPin size={20} />}
      tone="amber"
      delta={kpis?.topRegion ? { kind: "flat", value: "Top region" } : undefined}
    />
  </div>
</section>

      {/* ===== مشاريع المستخدم (شبكة مرنة) ===== */}
      <ProjectsList />

      {/* ===== الرسومات ===== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <header className="mb-3 section-title">
            توزيع المنشآت حسب الحجم (آخر فترة)
          </header>
          <div className="h-56">
            {donut ? (
              <SizeDonut labels={donut.labels} values={donut.values} />
            ) : (
              <Empty />
            )}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <header className="mb-3 section-title">
            تطور المؤشرات المالية (2019–2025)
          </header>
          <div className="h-56">
            {fin ? (
              <FinanceLine
                labels={fin.labels}
                revenue={fin.revenue}
                expenses={fin.expenses}
                surplus={fin.surplus}
              />
            ) : (
              <Empty />
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <header className="mb-3 section-title">
            تطور عدد المنشآت عبر السنوات (حسب الحجم)
          </header>
          <div className="h-64">
            {sizes ? (
              <SizesStackedBar
                labels={sizes.labels}
                micro={sizes.micro}
                small={sizes.small}
                medium={sizes.medium}
              />
            ) : (
              <Empty />
            )}
          </div>
        </div>

        <div className="card p-5">
          <header className="mb-3 section-title">
            توزيع المنشآت جغرافيًا
          </header>
          {choroplethGeo ? (
            <RegionChoropleth geojson={choroplethGeo} metricKey="count" />
          ) : (
            <div className="h-64 grid place-items-center opacity-80 text-sm">
              (مطلوب sa_regions.geojson + NEXT_PUBLIC_MAPBOX_TOKEN)
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Empty() {
  return (
    <div className="h-full w-full grid place-items-center opacity-70 text-sm">
      جارٍ التحميل…
    </div>
  );
}
