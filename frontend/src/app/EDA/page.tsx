// "use client";

// import ReadinessPanel from "@/components/ReadinessPanel";

// import { useEffect, useMemo, useState } from "react";
// import Image from "next/image";
// import { motion } from "framer-motion";

// /* loaders + metrics */
// import { loadCsvFinance, loadExcelCounts } from "lib/loaders";
// import {
//   computeKPIs,
//   seriesFinance,
//   seriesSizesByYear,
//   donutLatestSize,
//   regionCountsLatest,
// } from "lib/metrics";

// /* helpers */
// import { formatNumberArabic } from "lib/format";
// import { normalizeRegionName } from "lib/regions";

// /* components */
// import ProjectsList from "@/components/ProjectsList";
// import FinanceLine from "@/components/charts/FinanceLine";
// import SizesStackedBar from "@/components/charts/SizesStackedBar";
// import SizeDonut from "@/components/charts/SizeDonut";
// import RegionChoropleth from "@/components/charts/RegionChoropleth";
// import ChartPanel from "@/components/ChartPanel";

// /* shadcn/ui */
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";
// import { Progress } from "@/components/ui/progress";
// import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// /* icons */
// import {
//   MapPin,
//   SlidersHorizontal,
//   LineChart as LineIcon,
//   Filter,
//   Info,
//   CheckCircle2,
//   TrendingUp,
//   PieChart as PieIcon,
// } from "lucide-react";

// /* motion helper */
// const fadeUp = (delay = 0) => ({
//   initial: { opacity: 0, y: 16 },
//   animate: {
//     opacity: 1,
//     y: 0,
//     transition: { duration: 0.35, ease: "easeOut", delay },
//   },
// });

// /** Uniform KPI card */
// function Kpi({
//   title,
//   value,
//   delta,
//   good,
// }: {
//   title: string;
//   value: string;
//   delta?: string;
//   good?: boolean;
// }) {
//   return (
//     <motion.div {...fadeUp()} className="h-full">
//       <Card className="h-full rounded-2xl">
//         <div className="flex h-full flex-col">
//           <CardHeader className="pb-1">
//             <CardTitle className="text-xs text-muted-foreground tracking-wide">
//               {title}
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="mt-auto">
//             <div className="flex h-[72px] items-end justify-between">
//               <div className="text-3xl font-semibold tracking-tight">
//                 {value}
//               </div>
//               {delta ? (
//                 <span
//                   className={[
//                     "rounded-full px-2 py-1 text-[11px] leading-none",
//                     good
//                       ? "bg-emerald-500/15 text-emerald-400"
//                       : "bg-rose-500/15 text-rose-400",
//                   ].join(" ")}
//                 >
//                   {delta}
//                 </span>
//               ) : null}
//             </div>
//           </CardContent>
//         </div>
//       </Card>
//     </motion.div>
//   );
// }

// export default function Page() {
//   const [csv, setCsv] = useState<any[]>([]);
//   const [xls, setXls] = useState<any[]>([]);
//   const [geo, setGeo] = useState<any>(null);

//   const [sector, setSector] = useState<string>("all");
//   const [region, setRegion] = useState<string>("all"); // NEW
//   const [size, setSize] = useState<string>("all"); // NEW
//   const [search, setSearch] = useState("");
//   const [bgOk, setBgOk] = useState(true);

//   useEffect(() => {
//     loadCsvFinance().then(setCsv);
//     loadExcelCounts().then(setXls);
//     fetch("/data/sa_regions.geojson")
//       .then((r) => r.json())
//       .then(setGeo)
//       .catch(() => setGeo(null));
//   }, []);

//   const kpis = useMemo(
//     () => (csv.length && xls.length ? computeKPIs(csv, xls) : null),
//     [csv, xls]
//   );
//   const fin = useMemo(() => (csv.length ? seriesFinance(csv) : null), [csv]);
//   const sizes = useMemo(
//     () => (xls.length ? seriesSizesByYear(xls) : null),
//     [xls]
//   );
//   const donut = useMemo(
//     () => (xls.length ? donutLatestSize(xls) : null),
//     [xls]
//   );

//   const choroplethGeo = useMemo(() => {
//     if (!geo || !xls.length) return null;
//     const counts = regionCountsLatest(xls);
//     const clone = JSON.parse(JSON.stringify(geo));
//     clone.features.forEach((f: any) => {
//       const raw =
//         f.properties?.name ||
//         f.properties?.Name ||
//         f.properties?.arabic ||
//         f.properties?.region ||
//         "";
//       const key = normalizeRegionName(String(raw));
//       f.properties.count = counts.get(key) || 0;
//     });
//     return clone;
//   }, [geo, xls]);

//   const qualityScores = [
//     { label: "اكتمال البيانات", score: 86 },
//     { label: "تحديث البيانات", score: 71 },
//     { label: "تناسق الحقول", score: 92 },
//     { label: "تفرد السجلات", score: 78 },
//   ];

//   return (
//     <div dir="rtl" className="min-h-[calc(100vh-4rem)] [--bar-green:#0f5132]">
//       {/* ================= HERO ================= */}
//       <section className="relative overflow-hidden">
//         <div className="absolute inset-0">
//           {bgOk ? (
//             <Image
//               src="/hero/riyadh.jpg"
//               alt="المملكة العربية السعودية"
//               fill
//               className="object-cover"
//               priority
//               onError={() => setBgOk(false)}
//             />
//           ) : (
//             <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,_#0b2f2b_0%,_#0b1a1f_100%)]" />
//           )}
//           <div
//             className="absolute inset-0"
//             style={{
//               background:
//                 "linear-gradient(90deg, rgba(5,40,38,.78) 0%, rgba(5,40,38,.45) 40%, rgba(0,0,0,.30) 100%)",
//             }}
//           />
//           <div className="hero-fade-bottom" />
//         </div>

//         <div className="relative z-10 mx-auto max-w-7xl px-4 py-10">
//           {/* Force LTR so map stays left; keep inner text RTL */}
//           <div className="grid gap-8 md:grid-cols-12" dir="ltr">
//             {/* MAP LEFT */}
//             <div className="hero-choropleth order-1 overflow-hidden rounded-2xl ring-1 ring-white/10 md:col-span-7">
//               {/* wrapper defines height; map consumes 100% */}
//               <div className="h-[360px] w-full lg:h-[440px]">
//                 <RegionChoropleth
//                   geojson={choroplethGeo}
//                   metricKey="count"
//                   interactive
//                   fitToBoundsPadding={40}
//                   className="h-full w-full"
//                 />
//               </div>
//             </div>

//             {/* TEXT RIGHT */}
//             <div className="order-2 md:col-span-5" dir="rtl">
//               <div className="flex h-full flex-col justify-center text-right text-white">
//                 <h1 className="mb-2 text-4xl font-bold tracking-tight md:text-5xl">
//                   المملكة العربية السعودية
//                 </h1>
//                 <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm">
//                   <MapPin className="h-4 w-4" /> نظرة عامة وطنية
//                 </div>

//                 <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-3">
//                   <div className="border-e border-white/25 pe-4">
//                     <div className="text-xl font-semibold md:text-2xl">
//                       {formatNumberArabic(kpis?.population ?? 0)}
//                     </div>
//                     <div className="text-sm text-white/85">السكان</div>
//                     <div className="text-[11px] text-white/70">
//                       {kpis?.populationYear ?? "—"}
//                     </div>
//                   </div>
//                   <div className="border-e border-white/25 pe-4">
//                     <div className="text-xl font-semibold md:text-2xl">
//                       {formatNumberArabic(kpis?.totalSMEs ?? 0)}
//                     </div>
//                     <div className="text-sm text-white/85">المنشآت الحالية</div>
//                     <div className="text-[11px] text-white/70">
//                       {kpis?.latestQuarterLabel ?? kpis?.latestYear ?? "—"}
//                     </div>
//                   </div>
//                   <div className="pe-0">
//                     <div className="text-xl font-semibold md:text-2xl">
//                       {kpis?.avgSpend ? `${kpis.avgSpend} ريال` : "—"}
//                     </div>
//                     <div className="text-sm text-white/85">متوسط الإنفاق</div>
//                     <div className="text-[11px] text-white/70">
//                       {kpis?.avgSpendYear ?? "—"}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             {/* /TEXT RIGHT */}
//           </div>
//         </div>
//       </section>

//       {/* ================= FILTERS ================= */}
//       <motion.div
//         {...fadeUp(0.05)}
//         className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-10"
//       >
//         <Card className="card-soft mb-12 rounded-2xl">
//           <CardContent className="py-5">
//             <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//               <div className="flex items-center gap-2">
//                 <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
//                 <Select value={sector} onValueChange={setSector}>
//                   <SelectTrigger className="w-full">
//                     <SelectValue placeholder="القطاع" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">كل القطاعات</SelectItem>
//                     <SelectItem value="trade">التجارة</SelectItem>
//                     <SelectItem value="health">الصحة</SelectItem>
//                     <SelectItem value="education">التعليم</SelectItem>
//                     <SelectItem value="finance">الخدمات المالية</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="flex items-center gap-2">
//                 <LineIcon className="h-4 w-4 text-muted-foreground" />
//                 <Select defaultValue="quarter">
//                   <SelectTrigger className="w-full">
//                     <SelectValue placeholder="الفترة" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="week">آخر ٧ أيام</SelectItem>
//                     <SelectItem value="month">آخر ٣٠ يوم</SelectItem>
//                     <SelectItem value="quarter">آخر ٩٠ يوم</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Filter className="h-4 w-4 text-muted-foreground" />
//                 <Input
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                   placeholder="ابحث عن مشروع/برنامج/ملاحظة…"
//                 />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </motion.div>

//       {/* ================= KPI ROW ================= */}
//       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
//         <div className="mb-10 grid auto-rows-fr grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
//           <Kpi
//             title="إجمالي المنشآت"
//             value={formatNumberArabic(kpis?.totalSMEs ?? 0)}
//             delta={
//               kpis?.yoy != null
//                 ? `${kpis.yoy >= 0 ? "+" : ""}${kpis.yoy.toFixed(1)}% سنويًا`
//                 : undefined
//             }
//             good={(kpis?.yoy ?? 0) >= 0}
//           />
//           <Kpi
//             title="معدل النمو السنوي"
//             value={kpis?.yoy != null ? `${kpis.yoy.toFixed(1)}%` : "—"}
//             delta={
//               kpis?.latestYear ? `مقارنة بـ ${kpis.latestYear - 1}` : undefined
//             }
//             good={(kpis?.yoy ?? 0) >= 0}
//           />
//           <Kpi
//             title="التغير الفصلي"
//             value={kpis?.qoq != null ? `${kpis.qoq.toFixed(1)}%` : "—"}
//             delta="مقارنة بالربع السابق"
//             good={(kpis?.qoq ?? 0) >= 0}
//           />
//           <Kpi
//             title="المنطقة الأعلى تركّزًا"
//             value={kpis?.topRegion?.name ?? "—"}
//             delta={
//               kpis?.topRegion
//                 ? `حصة ${kpis.topRegion.sharePct.toFixed(
//                     1
//                   )}% (${formatNumberArabic(kpis.topRegion.count)})`
//                 : undefined
//             }
//             good
//           />
//         </div>
//       </div>

//       {/* ================= MAIN ================= */}
//       <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 pb-10 sm:px-6 lg:px-10">
//         {/* left 8/12 */}
//         <div className="col-span-12 space-y-6 lg:col-span-8">
//           {/* === Two charts side by side (equal height) === */}
//           <motion.div {...fadeUp(0.06)}>
//             <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
//               <ChartPanel
//                 title="توزيع المنشآت حسب الحجم (آخر فترة)"
//                 height={280}
//                 icon={<PieIcon className="h-4 w-4" />}
//               >
//                 {donut ? (
//                   <SizeDonut labels={donut.labels} values={donut.values} />
//                 ) : (
//                   <Empty />
//                 )}
//               </ChartPanel>

//               <ChartPanel
//                 title="تطور المؤشرات المالية (2019–2025)"
//                 height={280}
//                 icon={<LineIcon className="h-4 w-4" />}
//               >
//                 {fin ? (
//                   <FinanceLine
//                     labels={fin.labels}
//                     revenue={fin.revenue}
//                     expenses={fin.expenses}
//                     surplus={fin.surplus}
//                   />
//                 ) : (
//                   <Empty />
//                 )}
//               </ChartPanel>
//             </div>
//           </motion.div>

//           {/* === Stacked bar full width === */}
//           <motion.div {...fadeUp(0.08)}>
//             <ChartPanel
//               title="تطور عدد المنشآت عبر السنوات (حسب الحجم)"
//               height={280}
//             >
//               {sizes ? (
//                 <SizesStackedBar
//                   labels={sizes.labels}
//                   micro={sizes.micro}
//                   small={sizes.small}
//                   medium={sizes.medium}
//                 />
//               ) : (
//                 <Empty />
//               )}
//             </ChartPanel>
//           </motion.div>

//           {/* === Projects === */}
//           <motion.div {...fadeUp(0.12)}>
//             <Card className="card-soft rounded-2xl">
//               <CardHeader className="pb-2">
//                 <CardTitle className="text-lg">مشاريعك</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <ProjectsList />
//               </CardContent>
//             </Card>
//           </motion.div>
//         </div>

//         {/* right 4/12 */}
//         <div className="col-span-12 space-y-6 lg:col-span-4">
//           <motion.div {...fadeUp(0.14)}>
//             <Card className="card-soft overflow-hidden rounded-2xl">
//               <CardHeader className="pb-2">
//                 <CardTitle className="text-lg">أبرز الملاحظات</CardTitle>
//               </CardHeader>
//               <CardContent className="pt-0">
//                 <div className="h-[260px] overflow-y-auto pr-1">
//                   <ul className="space-y-3 text-sm">
//                     <li className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
//                       <CheckCircle2 className="h-4 w-4 text-emerald-500" />
//                       <span>
//                         {kpis?.yoy != null ? (
//                           <>
//                             <b>معدل النمو السنوي</b> عند{" "}
//                             <b>{kpis.yoy.toFixed(1)}%</b> مع زخم مستمر.
//                           </>
//                         ) : (
//                           <>جاري احتساب مؤشرات النمو…</>
//                         )}
//                       </span>
//                     </li>
//                     <li className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
//                       <TrendingUp className="h-4 w-4 text-primary" />
//                       <span>
//                         أعلى تركّز في <b>{kpis?.topRegion?.name ?? "—"}</b> بحصة{" "}
//                         <b>
//                           {kpis?.topRegion
//                             ? `${kpis.topRegion.sharePct.toFixed(1)}%`
//                             : "—"}
//                         </b>
//                         .
//                       </span>
//                     </li>
//                     <li className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
//                       <PieIcon className="h-4 w-4 text-sky-400" />
//                       <span>
//                         أحجام المنشآت متوازنة نسبيًا في آخر فترة الرصد.
//                       </span>
//                     </li>
//                   </ul>
//                 </div>
//               </CardContent>
//             </Card>
//           </motion.div>

//           <motion.div {...fadeUp(0.16)}>
//             <Card className="card-soft rounded-2xl">
//               <CardHeader className="pb-2">
//                 <CardTitle className="text-lg">ملخص جودة البيانات</CardTitle>
//               </CardHeader>
//               <CardContent className="grid gap-4 sm:grid-cols-2">
//                 {qualityScores.map((q) => (
//                   <div key={q.label} className="space-y-2">
//                     <div className="text-sm text-muted-foreground">
//                       {q.label}
//                     </div>
//                     <div className="progress-eda">
//                       <Progress value={q.score} />
//                     </div>
//                     <div className="text-sm font-medium">{q.score}%</div>
//                   </div>
//                 ))}
//               </CardContent>
//             </Card>
//           </motion.div>

//           <motion.div {...fadeUp(0.18)}>
//             <Alert className="card-soft rounded-2xl">
//               <Info className="h-4 w-4" />
//               <AlertTitle>ملاحظة</AlertTitle>
//               <AlertDescription>
//                 الواجهة متوافقة مع بياناتك الحالية. عند توسيع الـ API لن نحتاج
//                 لتغيير التصميم.
//               </AlertDescription>
//             </Alert>
//           </motion.div>

//           <motion.div {...fadeUp(0.18)}>
//             <Card className="card-soft rounded-2xl">
//               <CardHeader className="pb-2">
//                 <CardTitle className="text-lg">
//                   اختيار القطاع والمنطقة والحجم
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="grid gap-3 sm:grid-cols-3">
//                 {/* Sector Select */}
//                 <Select value={sector} onValueChange={setSector}>
//                   <SelectTrigger className="w-full">
//                     <SelectValue placeholder="القطاع" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">القطاعات</SelectItem>
//                     <SelectItem value="trade">التجارة</SelectItem>
//                     <SelectItem value="health">الصحة</SelectItem>
//                     <SelectItem value="education">التعليم</SelectItem>
//                     <SelectItem value="finance">الخدمات المالية</SelectItem>
//                   </SelectContent>
//                 </Select>

//                 {/* Region Select */}
//                 <Select value={region} onValueChange={setRegion}>
//                   <SelectTrigger className="w-full">
//                     <SelectValue placeholder="المنطقة" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">المناطق</SelectItem>
//                     <SelectItem value="riyadh">الرياض</SelectItem>
//                     <SelectItem value="makkah">مكة المكرمة</SelectItem>
//                     <SelectItem value="sharqiah">الشرقية</SelectItem>
//                     <SelectItem value="madinah">المدينة</SelectItem>
//                   </SelectContent>
//                 </Select>

//                 {/* Size Select */}
//                 <Select value={size} onValueChange={setSize}>
//                   <SelectTrigger className="w-full">
//                     <SelectValue placeholder="الحجم" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">كل الأحجام</SelectItem>
//                     <SelectItem value="micro">متناهية الصغر</SelectItem>
//                     <SelectItem value="small">صغيرة</SelectItem>
//                     <SelectItem value="medium">متوسطة</SelectItem>
//                   </SelectContent>
//                 </Select>

//               </CardContent>
//             </Card>
//           </motion.div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function Empty() {
//   return (
//     <div className="grid h-full w-full place-items-center text-sm opacity-70">
//       جارٍ التحميل…
//     </div>
//   );
// }

"use client";

import ReadinessPanel from "@/components/ReadinessPanel";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

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
import { formatNumberArabic } from "lib/format";
import { normalizeRegionName } from "lib/regions";

/* components */
import ProjectsList from "@/components/ProjectsList";
import FinanceLine from "@/components/charts/FinanceLine";
import SizesStackedBar from "@/components/charts/SizesStackedBar";
import SizeDonut from "@/components/charts/SizeDonut";
import RegionChoropleth from "@/components/charts/RegionChoropleth";
import ChartPanel from "@/components/ChartPanel";

/* shadcn/ui */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/* icons */
import {
  MapPin,
  SlidersHorizontal,
  LineChart as LineIcon,
  Filter,
  Info,
  CheckCircle2,
  TrendingUp,
  PieChart as PieIcon,
  Loader2,
} from "lucide-react";

/* ===== API + Mapping (مضمنة هنا لسهولة التشغيل) ===== */
type PredictParams = { sector: string; region: string; size: string };

type PredictResponse = {
  ok: boolean;
  echo: {
    ["القطاع_العام"]: string;
    ["المنطقة"]: string;
    ["الحجم"]: string;
    ["السنة"]: string;
  };
  prediction: number;
  probability: number; // 0..1
  tier: "Growth-ready" | "Steady" | "Early-stage support";
  message: string;
  baseline_share: number | null;
  meta?: any;
};

async function callPredict(
  params: PredictParams,
  opts?: { signal?: AbortSignal }
) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  const res = await fetch(`${base}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as PredictResponse;
}

type ProjectItem = {
  id: string;
  title: string;
  score?: number; // نسبة الجاهزية %
  reason?: string; // رسالة/وصف مختصر
  badge?: string; // التير
  meta?: any;
};

function mapPredictToItems(res: PredictResponse): ProjectItem[] {
  return [
    {
      id: "readiness-0",
      title: "درجة جاهزية المشروع",
      score: Math.round(res.probability * 100),
      reason: res.message,
      badge: res.tier,
      meta: {
        baseline_share: res.baseline_share,
        echo: res.echo,
        prediction: res.prediction,
      },
    },
  ];
}

/* motion helper */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", delay },
  },
});

/** Uniform KPI card */
function Kpi({
  title,
  value,
  delta,
  good,
}: {
  title: string;
  value: string;
  delta?: string;
  good?: boolean;
}) {
  return (
    <motion.div {...fadeUp()} className="h-full">
      <Card className="h-full rounded-2xl">
        <div className="flex h-full flex-col">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground tracking-wide">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="flex h-[72px] items-end justify-between">
              <div className="text-3xl font-semibold tracking-tight">
                {value}
              </div>
              {delta ? (
                <span
                  className={[
                    "rounded-full px-2 py-1 text-[11px] leading-none",
                    good
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/15 text-rose-400",
                  ].join(" ")}
                >
                  {delta}
                </span>
              ) : null}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

export default function Page() {
  const [csv, setCsv] = useState<any[]>([]);
  const [xls, setXls] = useState<any[]>([]);
  const [geo, setGeo] = useState<any>(null);

  const [sector, setSector] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [size, setSize] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [bgOk, setBgOk] = useState(true);

  // NEW: readiness model UI state
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleRunModel() {
    // لا ترسل قيم "all" للموديل — عطّل الزر حتى يختار المستخدم قيماً محددة
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await callPredict(
        { sector, region, size },
        { signal: controller.signal }
      );
      const mapped = mapPredictToItems(res);
      setItems(mapped);
    } catch (e: any) {
      setError(e?.message || "تعذّر تشغيل النموذج");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCsvFinance().then(setCsv);
    loadExcelCounts().then(setXls);
    fetch("/data/sa_regions.geojson")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
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

  const choroplethGeo = useMemo(() => {
    if (!geo || !xls.length) return null;
    const counts = regionCountsLatest(xls);
    const clone = JSON.parse(JSON.stringify(geo));
    clone.features.forEach((f: any) => {
      const raw =
        f.properties?.name ||
        f.properties?.Name ||
        f.properties?.arabic ||
        f.properties?.region ||
        "";
      const key = normalizeRegionName(String(raw));
      f.properties.count = counts.get(key) || 0;
    });
    return clone;
  }, [geo, xls]);

  const qualityScores = [
    { label: "اكتمال البيانات", score: 86 },
    { label: "تحديث البيانات", score: 71 },
    { label: "تناسق الحقول", score: 92 },
    { label: "تفرد السجلات", score: 78 },
  ];

  return (
    <div dir="rtl" className="min-h-[calc(100vh-4rem)] [--bar-green:#0f5132]">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {bgOk ? (
            <Image
              src="/hero/riyadh.jpg"
              alt="المملكة العربية السعودية"
              fill
              className="object-cover"
              priority
              onError={() => setBgOk(false)}
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,_#0b2f2b_0%,_#0b1a1f_100%)]" />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(5,40,38,.78) 0%, rgba(5,40,38,.45) 40%, rgba(0,0,0,.30) 100%)",
            }}
          />
          <div className="hero-fade-bottom" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10">
          {/* Force LTR so map stays left; keep inner text RTL */}
          <div className="grid gap-8 md:grid-cols-12" dir="ltr">
            {/* MAP LEFT */}
            <div className="hero-choropleth order-1 overflow-hidden rounded-2xl ring-1 ring-white/10 md:col-span-7">
              {/* wrapper defines height; map consumes 100% */}
              <div className="h-[360px] w-full lg:h-[440px]">
                <RegionChoropleth
                  geojson={choroplethGeo}
                  metricKey="count"
                  interactive
                  fitToBoundsPadding={40}
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* TEXT RIGHT */}
            <div className="order-2 md:col-span-5" dir="rtl">
              <div className="flex h-full flex-col justify-center text-right text-white">
                <h1 className="mb-2 text-4xl font-bold tracking-tight md:text-5xl">
                  المملكة العربية السعودية
                </h1>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm">
                  <MapPin className="h-4 w-4" /> نظرة عامة وطنية
                </div>

                <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-3">
                  <div className="border-e border-white/25 pe-4">
                    <div className="text-xl font-semibold md:text-2xl">
                      {formatNumberArabic(kpis?.population ?? 0)}
                    </div>
                    <div className="text-sm text-white/85">السكان</div>
                    <div className="text-[11px] text-white/70">
                      {kpis?.populationYear ?? "—"}
                    </div>
                  </div>
                  <div className="border-e border-white/25 pe-4">
                    <div className="text-xl font-semibold md:text-2xl">
                      {formatNumberArabic(kpis?.totalSMEs ?? 0)}
                    </div>
                    <div className="text-sm text-white/85">المنشآت الحالية</div>
                    <div className="text-[11px] text-white/70">
                      {kpis?.latestQuarterLabel ?? kpis?.latestYear ?? "—"}
                    </div>
                  </div>
                  <div className="pe-0">
                    <div className="text-xl font-semibold md:text-2xl">
                      {kpis?.avgSpend ? `${kpis.avgSpend} ريال` : "—"}
                    </div>
                    <div className="text-sm text-white/85">متوسط الإنفاق</div>
                    <div className="text-[11px] text-white/70">
                      {kpis?.avgSpendYear ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /TEXT RIGHT */}
          </div>
        </div>
      </section>

      {/* ================= FILTERS ================= */}
      <motion.div
        {...fadeUp(0.05)}
        className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-10"
      >
        <Card className="card-soft mb-12 rounded-2xl">
          <CardContent className="py-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="القطاع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل القطاعات</SelectItem>
                    <SelectItem value="trade">التجارة</SelectItem>
                    <SelectItem value="health">الصحة</SelectItem>
                    <SelectItem value="education">التعليم</SelectItem>
                    <SelectItem value="finance">الخدمات المالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <LineIcon className="h-4 w-4 text-muted-foreground" />
                <Select defaultValue="quarter">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="الفترة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">آخر ٧ أيام</SelectItem>
                    <SelectItem value="month">آخر ٣٠ يوم</SelectItem>
                    <SelectItem value="quarter">آخر ٩٠ يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن مشروع/برنامج/ملاحظة…"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================= KPI ROW ================= */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px:10 lg:px-10">
        <div className="mb-10 grid auto-rows-fr grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Kpi
            title="إجمالي المنشآت"
            value={formatNumberArabic(kpis?.totalSMEs ?? 0)}
            delta={
              kpis?.yoy != null
                ? `${kpis.yoy >= 0 ? "+" : ""}${kpis.yoy.toFixed(1)}% سنويًا`
                : undefined
            }
            good={(kpis?.yoy ?? 0) >= 0}
          />
          <Kpi
            title="معدل النمو السنوي"
            value={kpis?.yoy != null ? `${kpis.yoy.toFixed(1)}%` : "—"}
            delta={
              kpis?.latestYear ? `مقارنة بـ ${kpis.latestYear - 1}` : undefined
            }
            good={(kpis?.yoy ?? 0) >= 0}
          />
          <Kpi
            title="التغير الفصلي"
            value={kpis?.qoq != null ? `${kpis.qoq.toFixed(1)}%` : "—"}
            delta="مقارنة بالربع السابق"
            good={(kpis?.qoq ?? 0) >= 0}
          />
          <Kpi
            title="المنطقة الأعلى تركّزًا"
            value={kpis?.topRegion?.name ?? "—"}
            delta={
              kpis?.topRegion
                ? `حصة ${kpis.topRegion.sharePct.toFixed(
                    1
                  )}% (${formatNumberArabic(kpis.topRegion.count)})`
                : undefined
            }
            good
          />
        </div>
      </div>

      {/* ================= MAIN ================= */}
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 pb-10 sm:px-6 lg:px-10">
        {/* left 8/12 */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {/* === Two charts side by side (equal height) === */}
          <motion.div {...fadeUp(0.06)}>
            <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
              <ChartPanel
                title="توزيع المنشآت حسب الحجم (آخر فترة)"
                height={280}
                icon={<PieIcon className="h-4 w-4" />}
              >
                {donut ? (
                  <SizeDonut labels={donut.labels} values={donut.values} />
                ) : (
                  <Empty />
                )}
              </ChartPanel>

              <ChartPanel
                title="تطور المؤشرات المالية (2019–2025)"
                height={280}
                icon={<LineIcon className="h-4 w-4" />}
              >
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
              </ChartPanel>
            </div>
          </motion.div>

          {/* === Stacked bar full width === */}
          <motion.div {...fadeUp(0.08)}>
            <ChartPanel
              title="تطور عدد المنشآت عبر السنوات (حسب الحجم)"
              height={280}
            >
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
            </ChartPanel>
          </motion.div>

          {/* === Projects === */}
          <motion.div {...fadeUp(0.12)}>
            <Card className="card-soft rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">مشاريعك</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectsList items={items} loading={loading} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* right 4/12 */}
        <div className="col-span-12 space-y-6 lg:col-span-4">
          <motion.div {...fadeUp(0.14)}>
            <Card className="card-soft overflow-hidden rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">أبرز الملاحظات</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[260px] overflow-y-auto pr-1">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>
                        {kpis?.yoy != null ? (
                          <>
                            <b>معدل النمو السنوي</b> عند{" "}
                            <b>{kpis.yoy.toFixed(1)}%</b> مع زخم مستمر.
                          </>
                        ) : (
                          <>جاري احتساب مؤشرات النمو…</>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span>
                        أعلى تركّز في <b>{kpis?.topRegion?.name ?? "—"}</b> بحصة{" "}
                        <b>
                          {kpis?.topRegion
                            ? `${kpis.topRegion.sharePct.toFixed(1)}%`
                            : "—"}
                        </b>
                        .
                      </span>
                    </li>
                    <li className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
                      <PieIcon className="h-4 w-4 text-sky-400" />
                      <span>
                        أحجام المنشآت متوازنة نسبيًا في آخر فترة الرصد.
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp(0.16)}>
            <Card className="card-soft rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">ملخص جودة البيانات</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {qualityScores.map((q) => (
                  <div key={q.label} className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {q.label}
                    </div>
                    <div className="progress-eda">
                      <Progress value={q.score} />
                    </div>
                    <div className="text-sm font-medium">{q.score}%</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp(0.18)}>
            <Alert className="card-soft rounded-2xl">
              <Info className="h-4 w-4" />
              <AlertTitle>ملاحظة</AlertTitle>
              <AlertDescription>
                الواجهة متوافقة مع بياناتك الحالية. عند توسيع الـ API لن نحتاج
                لتغيير التصميم.
              </AlertDescription>
            </Alert>
          </motion.div>

          <motion.div {...fadeUp(0.18)}>
            <Card className="card-soft rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  اختيار القطاع والمنطقة والحجم
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {/* Sector Select */}
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="القطاع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">القطاعات</SelectItem>
                    <SelectItem value="trade">التجارة</SelectItem>
                    <SelectItem value="health">الصحة</SelectItem>
                    <SelectItem value="education">التعليم</SelectItem>
                    <SelectItem value="finance">الخدمات المالية</SelectItem>
                  </SelectContent>
                </Select>

                {/* Region Select */}
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="المنطقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">المناطق</SelectItem>
                    <SelectItem value="riyadh">الرياض</SelectItem>
                    <SelectItem value="makkah">مكة المكرمة</SelectItem>
                    <SelectItem value="sharqiah">الشرقية</SelectItem>
                    <SelectItem value="madinah">المدينة</SelectItem>
                  </SelectContent>
                </Select>

                {/* Size Select */}
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="الحجم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأحجام</SelectItem>
                    <SelectItem value="micro">متناهية الصغر</SelectItem>
                    <SelectItem value="small">صغيرة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                  </SelectContent>
                </Select>

                {/* زر تشغيل النموذج */}
                <div className="sm:col-span-3 mt-1">
                  <Button
                    onClick={handleRunModel}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 transition-colors"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري التشغيل...
                      </span>
                    ) : (
                      "احسب الجاهزية"
                    )}
                  </Button>

                  {error && (
                    <div className="text-sm text-red-500 mt-2">{error}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-full w-full place-items-center text-sm opacity-70">
      جارٍ التحميل…
    </div>
  );
}
