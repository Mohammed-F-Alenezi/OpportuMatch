"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart as RLineChart,
  Line,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import {
  Sparkles,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Filter,
  SlidersHorizontal,
  Info,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Compass,
  RefreshCcw,
} from "lucide-react";

/* ---------------------------------------------
   بيانات عرض فقط (Mock)
----------------------------------------------*/
const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

const trendData = days.map((d, i) => ({
  day: d,
  applications: Math.round(30 + 20 * Math.sin(i * 0.7) + Math.random() * 10),
  approvals: Math.round(12 + 9 * Math.cos(i * 0.8) + Math.random() * 4),
}));

const sectorDistribution = [
  { name: "الخدمات المالية", value: 22 },
  { name: "الصحة", value: 17 },
  { name: "التعليم", value: 19 },
  { name: "التجارة الإلكترونية", value: 24 },
  { name: "السياحة", value: 11 },
  { name: "التقنية الخضراء", value: 7 },
];

const fundingHistogram = Array.from({ length: 12 }).map((_, i) => ({
  bucket: `${(i + 1) * 50}K`,
  count: Math.round(4 + Math.random() * 18),
}));

const qualityScores = [
  { label: "اكتمال البيانات", score: 86 },
  { label: "تحديث البيانات", score: 71 },
  { label: "اتساق الحقول", score: 92 },
  { label: "تفرد السجلات", score: 78 },
];

const COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#F87171", "#22D3EE"];
const BAR_GREEN = "#0f5132"; // أخضر داكن

/* ---------------------------------------------
   حركة بسيطة
----------------------------------------------*/
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut", delay } },
});

/* ---------------------------------------------
   خريطة المملكة — SVG كاملة + تمييز الرياض
   المسارات تقريبية لكنها أقرب بصريًا لشكل المملكة.
----------------------------------------------*/
/** KSA map (accurate outline) */
function KsaMap({ highlight = "riyadh" }: { highlight?: "riyadh" | "none" }) {
  // theme-consistent colors
  const stroke = "rgba(255,255,255,.95)";
  const fillMain = "rgba(255,255,255,.06)";
  const grid = "rgba(255,255,255,.22)";

  return (
    <svg
      viewBox="0 0 1000 900"
      className="w-full h-auto max-w-[560px] mx-auto"
      preserveAspectRatio="xMidYMid meet"
      aria-label="خريطة المملكة العربية السعودية"
    >
      {/* soft drop shadow */}
      <g opacity=".10" transform="translate(8,10)">
        <path
          d="M120,470 L180,355 L250,300 L355,255 L455,260 L520,290 L575,345 L640,380 L760,395 L795,455 L770,575 L635,685 L455,740 L305,715 L220,630 L185,585 Z"
          fill="black"
        />
      </g>

      {/* --- Saudi Arabia outline (hand-tuned to resemble true shape) --- */}
      <path
        d="
        M120,470
        L155,405 180,355
        L225,322 250,300
        L305,270 355,255
        L405,250 455,260
        L500,275 520,290
        L560,325 575,345
        L620,370 640,380
        L700,392 760,395
        L785,420 795,455
        L790,510 770,575
        L690,640 635,685
        L545,720 455,740
        L375,730 305,715
        L255,675 220,630
        L200,600 185,585
        L150,525 135,495
        Z"
        fill={fillMain}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* subtle internal guide lines */}
      <path
        d="M250,300 L320,395 L440,380 L560,325"
        stroke={grid}
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M220,630 L320,575 L430,540 L530,585 L635,685"
        stroke={grid}
        strokeWidth="1.6"
        fill="none"
      />

      {/* --- Riyadh region (approx center polygon) --- */}
      {highlight === "riyadh" && (
        <path
          d="
          M435,455
          L490,435
          L555,485
          L540,560
          L475,575
          L425,520
          Z"
          fill="rgba(255,255,255,.92)"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/* ---------------------------------------------
   بطاقة KPI
----------------------------------------------*/
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
      <Card className="bg-gradient-to-b from-muted/40 to-background backdrop-blur-sm border border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          {delta && (
            <Badge variant="secondary" className={`rounded-full px-2 ${good ? "text-emerald-600" : "text-rose-600"}`}>
              {delta}
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ---------------------------------------------
   الصفحة
----------------------------------------------*/
export default function EDA() {
  const [sector, setSector] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [bgOk, setBgOk] = useState(true); // معالجة فشل تحميل الصورة

  const filteredTrend = useMemo(() => trendData, []);
  const totalApps = filteredTrend.reduce((a, b) => a + b.applications, 0);
  const totalApprovals = filteredTrend.reduce((a, b) => a + b.approvals, 0);
  const approvalRate = Math.round((totalApprovals / Math.max(totalApps, 1)) * 100);

  return (
    <div dir="rtl" className="min-h-[calc(100vh-4rem)]">
      {/* ----------------------------------------------------
           HERO مع بديل إذا فشلت الصورة
         ---------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {bgOk ? (
            <Image
              src="/hero/riyadh.jpg"
              alt="الرياض"
              fill
              className="object-cover"
              priority
              onError={() => setBgOk(false)}
            />
          ) : (
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_#0b2f2b_0%,_#0b1a1f_100%)]" />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(5,40,38,.78) 0%, rgba(5,40,38,.45) 40%, rgba(0,0,0,.30) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 md:py-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            {/* خريطة المملكة كاملة */}
            <div className="max-w-xl">
              <KsaMap highlight="riyadh" />
            </div>

            {/* عنوان وإحصاءات سريعة */}
            <div className="text-right text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">الرياض</h1>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm mb-4">
                <MapPin className="h-4 w-4" />
                المنطقة
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                <div className="border-e border-white/25 pe-4">
                  <div className="text-xl md:text-2xl font-semibold">8,591,748</div>
                  <div className="text-white/85 text-sm">السكان</div>
                  <div className="text-white/70 text-[11px]">2022</div>
                </div>
                <div className="border-e border-white/25 pe-4">
                  <div className="text-xl md:text-2xl font-semibold">668,045</div>
                  <div className="text-white/85 text-sm">المنشآت الحالية</div>
                  <div className="text-white/70 text-[11px]">2024</div>
                </div>
                <div className="pe-0">
                  <div className="text-xl md:text-2xl font-semibold">2.72 ألف ريال</div>
                  <div className="text-white/85 text-sm">متوسط إنفاق الفرد</div>
                  <div className="text-white/70 text-[11px]">2018</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* عنوان داخلي صغير */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>لوحة المشاريع</span>
          <span>/</span>
          <span className="text-primary font-medium">الاستكشاف (EDA)</span>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* فلاتر */}
      <motion.div {...fadeUp(0.05)} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <Card className="mb-6 border border-white/10">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="القطاع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل القطاعات</SelectItem>
                    {sectorDistribution.map((s) => (
                      <SelectItem key={s.name} value={s.name.toLowerCase()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <LineIcon className="h-4 w-4 text-muted-foreground" />
                <Select defaultValue="week">
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

      {/* KPIs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Kpi title="إجمالي التقديمات" value={totalApps.toLocaleString()} delta="+8.2%" good />
          <Kpi title="إجمالي القبولات" value={totalApprovals.toLocaleString()} delta="+3.1%" good />
          <Kpi title="معدل القبول" value={`${approvalRate}%`} delta="-0.6%" />
          <Kpi title="وسيط مبلغ التمويل" value="350K ريال" />
        </div>
      </div>

      {/* الشبكة الرئيسية */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* يسار: الرسوم */}
        <div className="lg:col-span-2 space-y-6">
          {/* الاتجاه الأسبوعي */}
          <motion.div {...fadeUp(0.08)}>
            <Card className="border border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <LineIcon className="h-4 w-4" />
                  <span>الاتجاه الأسبوعي</span>
                </div>
                <CardTitle className="text-lg">التقديمات مقابل القبولات</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#198754" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#198754" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area dataKey="applications" stroke="hsl(var(--primary))" fill="url(#g1)" type="monotone" />
                    <Area dataKey="approvals" stroke="#198754" fill="url(#g2)" type="monotone" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* هيستوجرام مبالغ التمويل */}
          <motion.div {...fadeUp(0.1)}>
            <Card className="border border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>التوزيع</span>
                </div>
                <CardTitle className="text-lg">هيستوجرام مبالغ التمويل</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fundingHistogram}>
                    <CartesianGrid strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={BAR_GREEN} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* جودة البيانات */}
          <motion.div {...fadeUp(0.12)}>
            <Card className="border border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">ملخص جودة البيانات</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {qualityScores.map((q) => (
                  <div key={q.label} className="space-y-2">
                    <div className="text-sm text-muted-foreground">{q.label}</div>
                    <Progress value={q.score} />
                    <div className="text-sm font-medium">{q.score}%</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* يمين: باي + إنسايتس */}
        <div className="space-y-6">
          <motion.div {...fadeUp(0.14)}>
            <Card className="border border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <PieIcon className="h-4 w-4" />
                  <span>التقسيم</span>
                </div>
                <CardTitle className="text-lg">توزيع القطاعات</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Pie
                      data={sectorDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {sectorDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp(0.16)} className="lg:sticky lg:top-6">
            <Card className="overflow-hidden border border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">أبرز الملاحظات</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[260px] pr-1 overflow-y-auto">
                  <ul className="space-y-3 text-sm">
                    <li className="p-3 rounded-lg bg-muted/40 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>
                        <b>معدل القبول</b> مستقر عند <b>{approvalRate}%</b> مع زخم في الخدمات المالية.
                      </span>
                    </li>
                    <li className="p-3 rounded-lg bg-muted/40 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span>
                        <b>الثلاثاء–الأربعاء</b> أعلى أيام التقديم؛ اقترح دفعات تسويقية يوم الإثنين.
                      </span>
                    </li>
                    <li className="p-3 rounded-lg bg-muted/40 flex items-center gap-2">
                      <Compass className="h-4 w-4 text-sky-400" />
                      <span>
                        مبالغ التمويل تتمركز حول <b>200K–400K</b> — مناسبة لاستهداف البرامج.
                      </span>
                    </li>
                    <li className="p-3 rounded-lg bg-muted/40 flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 text-amber-400" />
                      <span>
                        أقوى عنصر <b>اتساق الحقول</b> (92%)؛ وأضعف <b>تحديث البيانات</b> (71%).
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp(0.18)}>
            <Alert className="border border-white/10">
              <Info className="h-4 w-4" />
              <AlertTitle>وضع الواجهة فقط</AlertTitle>
              <AlertDescription>
                جميع الرسوم تعتمد بيانات تجريبية. عند الجاهزية اربطها بـ API بدون تغيير في الواجهة.
              </AlertDescription>
            </Alert>
          </motion.div>
        </div>
      </div>

      {/* تبويبات: أبقينا الاتجاهات + القيم الشاذة فقط */}
      <motion.div {...fadeUp(0.2)} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 mt-8 pb-10">
        <Tabs defaultValue="trends">
          <TabsList>
            <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
            <TabsTrigger value="outliers">القيم الشاذة</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-4">
            <Card className="border border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">التقديمات والقبولات (عرض إضافي)</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={trendData}>
                    <CartesianGrid strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="approvals" stroke="#198754" strokeWidth={2} />
                  </RLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outliers" className="mt-4">
            <Card className="border border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">حالات تستحق المراجعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {["طلب تمويل > 1.5M", "سجل دون قطاع مع درجة عالية", "تكرار أسماء برامج"].map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm">{t}</div>
                    <Badge variant="secondary">مراجعة</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
