"use client";
import Donut from "./Donut";
import Button from "../ui/button";
import { Initiative } from "@/lib/initiatives";

export default function InitiativeModal({ item, onClose, startup }:{
  item: Initiative | null; onClose: ()=>void; startup?: { title?: string };
}) {
  if (!item) return null;
  const score = Math.min(0.95, 0.55 + Math.random() * 0.4);
  const benefits = ["رعاية حكومية للشركات الناشئة","إعفاءات ضريبية ورسوم","منح مالية لبعض المصاريف","دعم التصدير والتسويق"];
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4" style={{ background: "rgba(0,0,0,.5)" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-3xl rounded-3xl border p-6"
           style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{item.title}</h3>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="md:col-span-3">
            <p className="mb-4" style={{ color: "var(--subtext)" }}>
              مقارنة ملاءمة <b>{item.title}</b> مع مشروعك <b>{startup?.title || ""}</b>.
            </p>
            <ul className="mb-4 list-disc space-y-2 pr-6">{benefits.map((b,i)=><li key={i}>{b}</li>)}</ul>
            <div className="flex gap-3">
              <Button>التقديم الرسمي</Button>
              <Button variant="outline">اسأل لماذا؟ (RAG)</Button>
            </div>
          </div>
          <div className="rounded-2xl border p-4 md:col-span-2"
               style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--surface2) 40%, transparent)" }}>
            <p className="mb-2 text-sm" style={{ color: "var(--subtext)" }}>نسبة التوافق</p>
            <Donut value={score} />
            <div className="mt-2 text-center text-sm" style={{ color: "var(--subtext)" }}>
              {Math.round(score*100)}% مناسبة
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
