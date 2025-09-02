"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SigninForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const formData = new FormData(e.currentTarget);
    const data = { email: formData.get("email"), password: formData.get("password") };

    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Login failed");
      }
      const result = await res.json();
      localStorage.setItem("token", result.access_token);
      router.push("/projects/select");
    } catch (error: any) {
      setErr(error?.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className={cn(
        "w-full flex items-center justify-center min-h-[80vh] px-6",
        className
      )}
      {...props}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        {/* Title */}
        <div className="text-center md:text-right">
          <h2 className="text-2xl font-bold leading-tight" style={{ color: "var(--foreground)" }}>
            تسجيل الدخول
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--subtext-light)" }}>
            أدخل البريد الإلكتروني وكلمة المرور
          </p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm">البريد الإلكتروني</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            className="h-11 ring-1 ring-[color:var(--input)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
          />
        </div>

        {/* Password + small link under field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm">كلمة المرور</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            className="h-11 ring-1 ring-[color:var(--input)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
          />
          <a
            href="/reset"
            className="text-xs underline underline-offset-2 self-start"
            style={{ color: "var(--brand)" }}
          >
            نسيت كلمة المرور؟
          </a>
        </div>

        {/* Error */}
        {err && (
          <div
            className="text-sm rounded-md px-3 py-2"
            style={{
              background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
              color: "var(--destructive-foreground)",
              border: "1px solid color-mix(in oklab, var(--destructive) 40%, transparent)",
            }}
          >
            {err}
          </div>
        )}

        {/* Primary action */}
        <Button
          type="submit"
          className="w-full h-11 rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--brand), var(--brand-alt))",
            color: "#fff",
          }}
          disabled={loading}
        >
          {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </Button>

        {/* Footer */}
        <p className="text-center text-sm" style={{ color: "var(--subtext-light)" }}>
          ليس لديك حساب؟{" "}
          <a href="/signup" className="underline underline-offset-2" style={{ color: "var(--brand)" }}>
            إنشاء حساب جديد
          </a>
        </p>
      </form>
    </div>
  );
}
