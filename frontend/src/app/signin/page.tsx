"use client";
import { useRouter } from "next/navigation";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

export default function Page() {
  const router = useRouter();
  return (
    <main className="mx-auto grid max-w-7xl place-items-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border p-8 shadow"
           style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="mb-6 text-center text-2xl font-semibold">تسجيل الدخول</h2>
        <div className="flex flex-col gap-4">
          <Input label="رقم الهاتف أو البريد الإلكتروني" />
          <Input label="الرقم السري" type="password" />
          <div className="text-start text-sm" style={{ color: "var(--brand)" }}>نسيت كلمة المرور؟</div>
          <Button className="mt-2 w-full" onClick={()=>router.push("/bizinfo")}>تسجيل</Button>
          <Button variant="outline" className="w-full" onClick={()=>router.push("/signup")}>إنشاء الحساب</Button>
        </div>
      </div>
    </main>
  );
}
