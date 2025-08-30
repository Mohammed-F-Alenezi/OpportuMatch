"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "./multi_select";

/* المراحل */
const STAGES = [
  "فكرة",
  "MVP",
  "إطلاق",
  "تشغيل",
  "نمو مبكر",
  "نمو",
  "توسع",
] as const;
type Stage = (typeof STAGES)[number];

/* القطاعات */
const SECTORS = [
  "التجارة الإلكترونية",
  "اللوجستيات",
  "الصحة",
  "التعليم",
  "الزراعة",
  "التكنولوجيا",
  "الخدمات المالية",
  "السياحة",
  "الطاقة",
  "الصناعة",
] as const;
type Sector = (typeof SECTORS)[number];

export default function BizInfo({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // حقول النموذج
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<Stage | "">("");
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [openSectors, setOpenSectors] = useState(false);
  const [goalsText, setGoalsText] = useState("");
  const [needsFunding, setNeedsFunding] = useState(false);
  const [funding, setFunding] = useState<string>("");
const sectorOptions = SECTORS.map((s: string) => ({ label: s, value: s }));

  const dropdownRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة إذا ضغط المستخدم برة
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenSectors(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSector = (s: Sector) => {
    setSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage) return;

    setLoading(true);

    const goals = goalsText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
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
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

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

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} dir="rtl" className={className ?? ""}>
      <div className="grid gap-4">
        {/* اسم المشروع */}
        <div className="grid gap-2">
          <Label htmlFor="name">اسم المشروع</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* وصف المشروع */}
        <div className="grid gap-2">
          <Label htmlFor="description">وصف المشروع</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* مرحلة المشروع */}
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

        {/*  القطاعات */}
        <div className="grid gap-2">

           <Label>القطاعات</Label>
  <MultiSelect
    options={sectorOptions}
    value={sectors}
    onChange={setSectors}
    placeholder="اختر القطاعات"
  />
        </div>

        {/* القطاعات (multi-select صغير)
        <div className="grid gap-2 relative" ref={dropdownRef}>
          <Label>القطاعات</Label>
          <div
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm cursor-pointer"
            onClick={() => setOpenSectors((o) => !o)}
          >
            <span className={sectors.length ? "" : "text-muted-foreground"}>
              {sectors.length ? sectors.join("، ") : "اختر قطاعًا أو أكثر"}
            </span>
            <span className="text-muted-foreground">▾</span>
          </div>

          {openSectors && (
            <div className="absolute z-50 mt-2 w-full rounded-md border bg-background shadow-md">
              {SECTORS.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent text-xs"
                  onClick={() => toggleSector(s)}
                >
                  <div
                    className={`flex items-center justify-center h-3.5 w-3.5 rounded border text-[10px] ${
                      sectors.includes(s)
                        ? "bg-primary text-white border-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {sectors.includes(s) ? "✓" : ""}
                  </div>
                  <span>{s}</span>
                </div>
              ))}
              <div
                className="text-xs text-muted-foreground px-2 py-1 cursor-pointer hover:underline"
                onClick={() => setSectors([])}
              >
                مسح الاختيار
              </div>
            </div>
          )}
        </div> */}

        {/* الأهداف */}
        <div className="grid gap-2">
          <Label htmlFor="goals">الأهداف (سطر لكل هدف أو مفصولة بفواصل)</Label>
          <Textarea
            id="goals"
            value={goalsText}
            onChange={(e) => setGoalsText(e.target.value)}
            placeholder={
              "مثال:\nالدخول إلى السوق المحلي\nالحصول على تمويل أولي"
            }
          />
        </div>

        {/* التمويل */}
        <div className="grid gap-2">
          <Label>هل تحتاج دعم؟</Label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={needsFunding}
              onCheckedChange={() => setNeedsFunding((v) => !v)}
            />
            نعم، أحتاج إلى دعم مالي
          </label>
          {needsFunding && (
            <div className="mt-2">
              <Label htmlFor="funding">قيمة التمويل المطلوب</Label>
              <Input
                id="funding"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={funding}
                onChange={(e) => setFunding(e.target.value)}
                placeholder="أدخل المبلغ بالريال"
              />
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="bg-[--brand]">
          {loading ? "جاري الحفظ..." : "حفظ المشروع"}
        </Button>
      </div>
    </form>
  );
}
