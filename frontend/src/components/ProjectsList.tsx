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


"use client";

import ProjectCard from "./charts/ProjectCard";

export type Project = {
  name: string;
  readiness: number; // 0..100
  peerNote?: string;
};

type Props = {
  title?: string;
  projects?: Project[]; // if empty, show fallback
  loading?: boolean;
  cols?: string;
};

export default function ProjectsList({
  title = "نسبة جاهزية مشروعك",
  projects,
  loading = false,
  cols = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4",
}: Props) {
  // demo fallback
  const fallback: Project[] = [
    {
      name: "منصة إدارة مخزون سحابية",
      readiness: 71,
      peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
    },
    {
      name: "حل مدفوعات للمتاجر الصغيرة",
      readiness: 58,
      peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
    },
    {
      name: "تطبيق حجوزات للخدمات المنزلية",
      readiness: 12,
      peerNote: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المماثلة حوالي 65%.",
    },
  ];

  const list = projects && projects.length ? projects : fallback;

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
