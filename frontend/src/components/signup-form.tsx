"use client"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
export default function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)

    const user = {
      firstName: formData.get("firstName"),
      middleName: formData.get("middleName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      password: formData.get("password"),
      phoneNumber: formData.get("phoneNumber"),
      age: Number(formData.get("age")),
      gender: formData.get("gender"),
      employment: formData.get("employment"),
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(" تم التسجيل بنجاح")
        router.push("/login")
      } else {
        setMessage(` خطأ: ${data.detail || data.error}`)
      }
    } catch (err: any) {
      setMessage(" تعذر الاتصال بالخادم")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className={cn("w-full flex justify-center py-10 scale-110")} {...props}>
      <Card className="w-full max-w-2xl border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">إنشاء حساب جديد</CardTitle>
          <CardDescription>املأ جميع الحقول التالية لإنشاء حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
<div className="grid grid-cols-3 gap-4">
  <div className="grid gap-2">
    <Label htmlFor="firstName">الاسم الأول</Label>
    <Input id="firstName" name="firstName" type="text" placeholder="محمد" required />
  </div>

  <div className="grid gap-2">
    <Label htmlFor="middleName">الاسم الأوسط</Label>
    <Input id="middleName" name="middleName" type="text" placeholder="عبدالله" />
  </div>

  <div className="grid gap-2">
    <Label htmlFor="lastName">اسم العائلة</Label>
    <Input id="lastName" name="lastName" type="text" placeholder="العامري" required />
  </div>
</div>
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" placeholder="example@email.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">رقم الهاتف</Label>
              <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="05xxxxxxxx" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="age">العمر</Label>
              <Input id="age" name="age" type="number" min="10" placeholder="مثال: 22" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">الجنس</Label>
              <Select name="gender">
                <SelectTrigger>
                  <SelectValue placeholder="اختر الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employment">الوضع الوظيفي</Label>
              <Select name="employment">
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوضع الوظيفي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">طالب</SelectItem>
                  <SelectItem value="employee">موظف</SelectItem>
                  <SelectItem value="unemployed">باحث عن عمل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full mt-4 bg-[--brand] hover:bg-[--brand-alt]"
              disabled={loading}
              
            >
              {loading ? "⏳ جاري التسجيل..." : "إنشاء الحساب"}
            </Button>

            {message && <p className="text-center text-sm mt-2">{message}</p>}

            <div className="text-center text-sm">
              لديك حساب بالفعل؟{" "}
              <a href="/login" className="underline underline-offset-4">
                تسجيل الدخول
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
