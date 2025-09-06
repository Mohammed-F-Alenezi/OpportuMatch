// "use client";

// import ProjectCard from "./charts/ProjectCard";

// export type Project = {
//   name: string;
//   readiness: number;     // 0..100
//   peerNote?: string;
// };

// type Props = {
//   title?: string;        // عنوان القسم (اختياري)
//   projects?: Project[];  // لو ما مررتها، بنعرض داتا تجريبية
//   loading?: boolean;     // لو تبغى تعرض سكيليتون
//   cols?: string;         // للتحكم بالـgrid لو تحتاج
// };

// export default function ProjectsList({
//   title = "نسبة جاهزية مشروعك",
//   projects,
//   loading = false,
//   cols = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4",
// }: Props) {
//   // بيانات افتراضية للتجربة
//   const fallback: Project[] = [
//     {
//       name: "منصة إدارة مخزون سحابية",
//       readiness: 71,
//       peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المشابهة حوالي 65%.",
//     },
//     {
//       name: "حل مدفوعات للمتاجر الصغيرة",
//       readiness: 58,
//       peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المشابهة حوالي 65%.",
//     },
//     {
//       name: "تطبيق حجوزات للخدمات المنزلية",
//       readiness: 12,
//       peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المشابهة حوالي 65%.",
//     },
//   ];

//   const list = projects && projects.length ? projects : fallback;

//   return (
//     <section className="space-y-3">
//       {title && <h2 className="section-title">{title}</h2>}

//       {loading ? (
//         <div className={cols}>
//           {Array.from({ length: 4 }).map((_, i) => (
//             <SkeletonCard key={i} />
//           ))}
//         </div>
//       ) : list.length ? (
//         <div className={cols}>
//           {list.map((p, i) => (
//             <ProjectCard key={`${p.name}-${i}`} {...p} />
//           ))}
//         </div>
//       ) : (
//         <EmptyState />
//       )}
//     </section>
//   );
// }

// /* --------- UI helpers --------- */
// function SkeletonCard() {
//   return (
//     <div className="card p-5 flex items-center gap-4">
//       <div className="w-24 h-24 rounded-full bg-[var(--card-surface-2)] animate-pulse" />
//       <div className="flex-1 space-y-2">
//         <div className="h-4 w-2/3 bg-[var(--card-surface-2)] rounded animate-pulse" />
//         <div className="h-3 w-4/5 bg-[var(--card-surface-2)] rounded animate-pulse" />
//         <div className="h-3 w-1/2 bg-[var(--card-surface-2)] rounded animate-pulse" />
//       </div>
//     </div>
//   );
// }

// function EmptyState() {
//   return (
//     <div className="card p-6 text-sm text-[color:var(--color-subtle)]">
//       لا توجد مشاريع للعرض حاليًا.
//     </div>
//   );
// }

// app/components/ProjectsList.tsx
// "use client";

// import ProjectCard from "./charts/ProjectCard";

// /** شكل نتيجة التنبؤ القادمة من الـ API */
// export type PredictResult = {
//   probability?: number;      // 0..1
//   tier?: string;             // "Growth-ready" | "Steady" | "Early-stage support" | ...
//   message?: string;          // نص مساعد من السيرفر
//   baseline_share?: number | null; // 0..1 أو null
// };

// export type Project = {
//   name: string;
//   readiness: number; // 0..100
//   peerNote?: string;
// };

// type Props = {
//   /** عنوان القسم */
//   title?: string;

//   /** إن أردت تمرير قائمة مشاريع مخصّصة؛ لو تُركت فاضية سنعرض fallback أو بطاقة ناتج التنبؤ */
//   projects?: Project[];

//   /** لعرض Skeleton */
//   loading?: boolean;

//   /** تحكم في شبكة العرض */
//   cols?: string;

//   /** قيم الاختيار من الواجهة (اختياري) — تُستخدم لبناء الملاحظة تحت البطاقة */
//   sectorArabic?: string;
//   regionArabic?: string;
//   sizeArabic?: string;

//   /** ناتج /predict من السيرفر — إن وُجد سنبني بطاقة واحدة منه */
//   predictResult?: PredictResult | null;
// };

// export default function ProjectsList({
//   title = "نسبة جاهزية مشروعك",
//   projects,
//   loading = false,
//   cols = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4",
//   sectorArabic,
//   regionArabic,
//   sizeArabic,
//   predictResult,
// }: Props) {
//   // 1) لو عندنا نتيجة تنبؤ من السيرفر، نحوّلها لبطاقة واحدة
//   let computedFromPredict: Project[] = [];
//   if (predictResult && typeof predictResult.probability === "number") {
//     const pct = Math.max(0, Math.min(100, Math.round(predictResult.probability * 100)));

//     // نص ملاحظة الأقران (baseline إن توفّر)
//     const peerBits: string[] = [];
//     if (sectorArabic) peerBits.push(`القطاع: ${sectorArabic}`);
//     if (regionArabic) peerBits.push(`المنطقة: ${regionArabic}`);
//     if (sizeArabic)   peerBits.push(`الحجم: ${sizeArabic}`);

//     const baselineTxt =
//       typeof predictResult.baseline_share === "number"
//         ? `، خط الأساس للمجموعة المماثلة ≈ ${Math.round(predictResult.baseline_share * 100)}%`
//         : "";

//     const peerNote =
//       (peerBits.length ? `${peerBits.join(" · ")}` : "حسب مدخلاتك") + baselineTxt;

//     computedFromPredict = [
//       {
//         name: "مشروعك الحالي",
//         readiness: pct,
//         peerNote,
//       },
//     ];
//   }

//   // 2) fallback تجريبي عند غياب projects وغياب predictResult
//   const fallback: Project[] = [
//     {
//       name: "منصة إدارة مخزون سحابية",
//       readiness: 71,
//       peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
//     },
//     {
//       name: "حل مدفوعات للمتاجر الصغيرة",
//       readiness: 58,
//       peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
//     },
//     {
//       name: "تطبيق حجوزات للخدمات المنزلية",
//       readiness: 12,
//       peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
//     },
//   ];

//   // ترتيب أولوية العرض:
//   // - إن كانت هناك قائمة مشاريع قادمة من الأعلى → اعرضها
//   // - وإلا إن كان لدينا predictResult → اعرض بطاقة محسوبة منه
//   // - وإلا اعرض fallback
//   const list =
//     (projects && projects.length ? projects : null) ??
//     (computedFromPredict.length ? computedFromPredict : null) ??
//     fallback;

//   return (
//     <section className="space-y-3">
//       {title && <h2 className="section-title">{title}</h2>}

//       {loading ? (
//         <div className={cols}>
//           {Array.from({ length: 4 }).map((_, i) => (
//             <SkeletonCard key={i} />
//           ))}
//         </div>
//       ) : list.length ? (
//         <div className={cols}>
//           {list.map((p, i) => (
//             <ProjectCard key={`${p.name}-${i}`} {...p} />
//           ))}
//         </div>
//       ) : (
//         <EmptyState />
//       )}
//     </section>
//   );
// }

// /* --------- UI helpers --------- */
// function SkeletonCard() {
//   return (
//     <div className="card p-5 flex items-center gap-4">
//       <div className="w-24 h-24 rounded-full bg-[var(--card-surface-2)] animate-pulse" />
//       <div className="flex-1 space-y-2">
//         <div className="h-4 w-2/3 bg-[var(--card-surface-2)] rounded animate-pulse" />
//         <div className="h-3 w-4/5 bg-[var(--card-surface-2)] rounded animate-pulse" />
//         <div className="h-3 w-1/2 bg-[var(--card-surface-2)] rounded animate-pulse" />
//       </div>
//     </div>
//   );
// }

// function EmptyState() {
//   return (
//     <div className="card p-6 text-sm text-[color:var(--color-subtle)]">
//       لا توجد مشاريع للعرض حاليًا.
//     </div>
//   );
// }

"use client";

import ProjectCard from "./charts/ProjectCard";

export type Project = {
  name: string;
  readiness: number; // 0..100
  peerNote?: string;
};

type PredictResultLite = {
  probability: number;
  tier: string;
  message: string;
  baseline_share?: number | null;
} | null;

type Props = {
  title?: string;
  projects?: Project[]; // explicit list (optional)
  loading?: boolean;
  cols?: string;
  // NEW: if you pass predictResult + labels, we'll render a single project from the model
  predictResult?: PredictResultLite;
  sectorArabic?: string;
  regionArabic?: string;
  sizeArabic?: string;
};

export default function ProjectsList({
  title = "نسبة جاهزية مشروعك",
  projects,
  loading = false,
  cols = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4",
  predictResult = null,
  sectorArabic,
  regionArabic,
  sizeArabic,
}: Props) {
  // demo fallback
  const fallback: Project[] = [
    {
      name: "منصة إدارة مخزون سحابية",
      readiness: 71,
      peerNote:
        "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
    },
    {
      name: "حل مدفوعات للمتاجر الصغيرة",
      readiness: 58,
      peerNote:
        "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
    },
    {
      name: "تطبيق حجوزات للخدمات المنزلية",
      readiness: 12,
      peerNote:
        "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
    },
  ];

  // If a model result is present, synthesize a single project from it
  const fromModel: Project[] | null = predictResult
    ? [
        {
          name: [
            sectorArabic || "—",
            regionArabic || "—",
            sizeArabic || "—",
          ].join(" • "),
          readiness: Math.round((predictResult.probability ?? 0) * 100),
          peerNote:
            typeof predictResult.baseline_share === "number"
              ? `المجموعة المماثلة ≈ ${Math.round(
                  predictResult.baseline_share * 100
                )}%`
              : undefined,
        },
      ]
    : null;

  const list =
    (projects && projects.length ? projects : null) ?? fromModel ?? fallback;

  return (
    <section className="space-y-3">
      {title && <h2 className="section-title">{title}</h2>}

      {loading ? (
        <div className={cols}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : list.length ? (
        <div className={cols}>
          {list.map((p, i) => (
            <ProjectCard key={`${p.name}-${i}`} {...p} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

/* --------- UI helpers --------- */
function SkeletonCard() {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-24 h-24 rounded-full bg-[var(--card-surface-2)] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 bg-[var(--card-surface-2)] rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-[var(--card-surface-2)] rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-[var(--card-surface-2)] rounded animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-6 text-sm text-[color:var(--color-subtle)]">
      لا توجد مشاريع للعرض حاليًا.
    </div>
  );
}
