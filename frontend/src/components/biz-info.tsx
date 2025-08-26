// // src/components/biz-info.tsx
// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue
// } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";

// import {
//   Command,
//   CommandInput,
//   CommandGroup,
//   CommandItem,
//   CommandEmpty,
// } from "@/components/ui/command";

// const SECTORS = [
//   { value: "ecommerce", label: "التجارة الإلكترونية" },
//   { value: "logistics",  label: "اللوجستيات" },
//   { value: "health",     label: "الصحة" },
//   { value: "education",  label: "التعليم" },
// ];

// export default function BizInfo({ className }: { className?: string }) {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);

//   // حقول النموذج
//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");
// const STAGES = ["فكرة", "MVP", "إطلاق", "تشغيل", "نمو مبكر", "نمو", "توسع"] as const;
// type Stage = (typeof STAGES)[number];
// const [stage, setStage] = useState<Stage | "">("");

// const SECTORS = ["التجارة الإلكترونية", "اللوجستيات", "الصحة", "التعليم", "الزراعة", "التكنولوجيا", "الخدمات المالية", "السياحة", "الطاقة", "الصناعة"] as const;
// type Sector = (typeof SECTORS)[number];

//   const [sectors, setSectors] = useState<Sector[]>([]);
//   const [goalsText, setGoalsText] = useState("");
//   const [needsFunding, setNeedsFunding] = useState(false);
//   const [funding, setFunding] = useState<string>("");

//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!stage) return;

//     setLoading(true);

//     // goals: نقسم الأسطر/الفواصل إلى مصفوفة
//     const goals = goalsText
//       .split(/\r?\n|,/)
//       .map(s => s.trim())
//       .filter(Boolean);

//     const payload = {
//       name,
//       description,
//       stage,
//       sectors,
//       goals,
//       funding_need: needsFunding ? (funding ? Number(funding) : null) : null,
//     };

//     try {
//       const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//       const res = await fetch("http://127.0.0.1:8000/projects", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           ...(token ? { Authorization: `Bearer ${token}` } : {}),
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const msg = await res.text();
//         throw new Error(msg || "Failed to create project");
//       }

//       // نجاح: روح للوحة أو حدّث القائمة
//       router.push("/dashboard");
//     } catch (err) {
//       console.error(err);
//       // TODO: toast error
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form onSubmit={onSubmit} dir="rtl" className={className ?? ""}>
//       <div className="grid gap-4">
//         <div className="grid gap-2">
//           <Label htmlFor="name">اسم المشروع</Label>
//           <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
//         </div>

//         <div className="grid gap-2">
//           <Label htmlFor="description">وصف المشروع</Label>
//           <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required />
//         </div>

// <div className="grid gap-2">
//   <Label>مرحلة المشروع</Label>
//   <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
//     <SelectTrigger>
//       <SelectValue placeholder="اختر المرحلة" />
//     </SelectTrigger>
//     <SelectContent>
//       {STAGES.map((s) => (
//         <SelectItem key={s} value={s}>
//           {s}
//         </SelectItem>
//       ))}
//     </SelectContent>
//   </Select>
// </div>

// <div className="grid gap-2">
//   <Label>القطاعات</Label>
//   <Select
//     onValueChange={(v) => setSectors([v as Sector])}
//     value={sectors[0] ?? ""}
//   >
//     <SelectTrigger>
//       <SelectValue placeholder="اختر القطاع" />
//     </SelectTrigger>
//     <SelectContent>
//       <Command>
//         <CommandInput placeholder="ابحث عن قطاع..." />
//         <CommandEmpty>لا يوجد نتائج</CommandEmpty>
//         <CommandGroup>
//           {SECTORS.map((s) => (
//             <CommandItem
//               key={s}
//               value={s}
//               onSelect={(val) => {
//                 setSectors([val as Sector]);
//               }}
//             >
//               {s}
//             </CommandItem>
//           ))}
//         </CommandGroup>
//       </Command>
//     </SelectContent>
//   </Select>
// </div>

//         <div className="grid gap-2">
//           <Label htmlFor="goals">الأهداف (سطر لكل هدف أو مفصولة بفواصل)</Label>
//           <Textarea id="goals" value={goalsText} onChange={e => setGoalsText(e.target.value)} placeholder={"مثال:\nالدخول إلى السوق المحلي\nالحصول على تمويل أولي"} />
//         </div>

//         {/* التمويل */}
//         <div className="grid gap-2">
//           <Label>هل تحتاج دعم؟</Label>
//           <label className="flex items-center gap-2">
//             <Checkbox checked={needsFunding} onCheckedChange={() => setNeedsFunding(v => !v)} />
//             نعم، أحتاج إلى دعم مالي
//           </label>
//           {needsFunding && (
//             <div className="mt-2">
//               <Label htmlFor="funding">قيمة التمويل المطلوب</Label>
//               <Input id="funding" type="number" inputMode="decimal" min="0" step="0.01"
//                      value={funding} onChange={e => setFunding(e.target.value)}
//                      placeholder="أدخل المبلغ بالريال" />
//             </div>
//           )}
//         </div>

//         <Button type="submit" disabled={loading} className="bg-[--brand]">
//           {loading ? "جاري الحفظ..." : "حفظ المشروع"}
//         </Button>
//       </div>
//     </form>
//   );
// }




// src/components/biz-info.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const SECTORS = [
  { value: "ecommerce", label: "التجارة الإلكترونية" },
  { value: "logistics",  label: "اللوجستيات" },
  { value: "health",     label: "الصحة" },
  { value: "education",  label: "التعليم" },
];

export default function BizInfo({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // حقول النموذج
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
const STAGES = ["فكرة", "MVP", "إطلاق", "تشغيل", "نمو مبكر", "نمو", "توسع"] as const;
type Stage = (typeof STAGES)[number];
const [stage, setStage] = useState<Stage | "">("");

  const [sectors, setSectors] = useState<string[]>([]);
  const [goalsText, setGoalsText] = useState("");
  const [needsFunding, setNeedsFunding] = useState(false);
  const [funding, setFunding] = useState<string>("");

  const toggleSector = (val: string) =>
    setSectors(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage) return;

    setLoading(true);

    // goals: نقسم الأسطر/الفواصل إلى مصفوفة
    const goals = goalsText
      .split(/\r?\n|,/)
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      name,
      description,
      stage,
      sectors,
      goals,
      funding_need: needsFunding ? (funding ? Number(funding) : null) : null,
    };

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch("http://127.0.0.1:8000/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create project");
      }

      // نجاح: روح للوحة أو حدّث القائمة
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      // TODO: toast error
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} dir="rtl" className={className ?? ""}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">اسم المشروع</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">وصف المشروع</Label>
          <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required />
        </div>

<div className="grid gap-2">
  <Label>مرحلة المشروع</Label>
  <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
    <SelectTrigger>
      <SelectValue placeholder="اختر المرحلة" />
    </SelectTrigger>
    <SelectContent>
      {STAGES.map((s) => (
        <SelectItem key={s} value={s}>
          {s}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

        <div className="grid gap-2">
          <Label>القطاعات</Label>
          <div className="grid grid-cols-2 gap-2">
            {SECTORS.map(s => (
              <label key={s.value} className="flex items-center gap-2">
                <Checkbox checked={sectors.includes(s.value)} onCheckedChange={() => toggleSector(s.value)} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="goals">الأهداف (سطر لكل هدف أو مفصولة بفواصل)</Label>
          <Textarea id="goals" value={goalsText} onChange={e => setGoalsText(e.target.value)} placeholder={"مثال:\nالدخول إلى السوق المحلي\nالحصول على تمويل أولي"} />
        </div>

        {/* التمويل */}
        <div className="grid gap-2">
          <Label>هل تحتاج دعم؟</Label>
          <label className="flex items-center gap-2">
            <Checkbox checked={needsFunding} onCheckedChange={() => setNeedsFunding(v => !v)} />
            نعم، أحتاج إلى دعم مالي
          </label>
          {needsFunding && (
            <div className="mt-2">
              <Label htmlFor="funding">قيمة التمويل المطلوب</Label>
              <Input id="funding" type="number" inputMode="decimal" min="0" step="0.01"
                     value={funding} onChange={e => setFunding(e.target.value)}
                     placeholder="أدخل المبلغ بالريال" />
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="bg-[--brand]">
          {loading ? "جاري الحفظ..." : "حفظ المشروع"}
        </Button>
      </div>
    </form>
  );}
