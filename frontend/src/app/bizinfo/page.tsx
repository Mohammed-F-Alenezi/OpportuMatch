"use client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function Page() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-3xl border p-8" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="mb-1 text-2xl font-semibold">بيانات المشروع</h2>
        <p className="mb-6" style={{ color: "var(--subtext)" }}>أدخل معلومات مشروعك لتحصل على توصيات مخصّصة.</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input label="اسم المشروع" />
          <Input label="القطاع" placeholder="تعليم، صحة، تجارة إلكترونية…" />
          <label className="flex flex-col gap-2">
            <span className="text-sm" style={{ color: "var(--subtext)" }}>المرحلة</span>
            <select className="rounded-xl border px-4 py-2"
                    style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--surface2) 60%, transparent)", color: "var(--text)" }}>
              <option>فكرة</option><option>نموذج أولي</option><option>إطلاق مبدئي</option><option>نمو وتوسّع</option>
            </select>
          </label>
          <Input label="التمويل المطلوب (ريال)" placeholder="مثال: 150000" />
        </div>
        <div className="mt-8 flex justify-end"><Button onClick={()=>router.push("/dashboard")}>حفظ والانتقال</Button></div>
      </div>
    </main>
  );
}
