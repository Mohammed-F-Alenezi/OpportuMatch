"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SigninForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Login failed")
      }

      const result = await res.json()
      console.log("Login successful:", result)
      localStorage.setItem("token", result.access_token) 



      router.push("/dashboard")
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className={cn("w-full flex justify-center py-10 scale-110")} >
      <Card className="w-[600px] border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>أدخل البريد الإلكتروني وكلمة المرور</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" placeholder="example@email.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            <Button
              type="submit"
              className="w-full mt-4 bg-[--brand] hover:bg-[--brand-alt]"
              disabled={loading}
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>

            <div className="text-center text-sm">
              ليس لديك حساب؟{" "}
              <a href="/signup" className="underline underline-offset-4">
                إنشاء حساب جديد
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
