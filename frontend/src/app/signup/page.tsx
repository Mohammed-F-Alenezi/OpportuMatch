"use client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function Page() {
  const router = useRouter();
  return (
    <main className="mx-auto grid max-w-7xl place-items-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border p-8 shadow"
           style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="mb-6 text-center text-2xl font-semibold">إنشاء حساب</h2>
        <div className="flex flex-col gap-4">
          <Input label="الاسم الكامل" />
          <Input label="البريد الإلكتروني" />
          <Input label="كلمة المرور" type="password" />
          <Button className="mt-2 w-full" onClick={()=>router.push("/bizinfo")}>التالي</Button>
          <Button variant="ghost" className="w-full" onClick={()=>router.push("/signin")}>لدي حساب بالفعل</Button>
        </div>
      </div>
    </main>
  );
}
