"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function ProjectForm({ className }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [support, setSupport] = useState<string[]>([])

  const handleCheckboxChange = (value: string) => {
    setSupport(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      projectName: formData.get("projectName"),
      projectDescription: formData.get("projectDescription"),
      projectType: formData.get("projectType"),
      projectStatus: formData.get("projectStatus"),
      projectGoals: formData.get("projectGoals"),
      projectVision: formData.get("projectVision"),
      supportNeeded: support, 
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error("Failed to save project")

      router.push("/dashboard") // go somewhere after success
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className={cn("w-full flex justify-center py-10", className)}>
        <Card className="w-full max-w-none border-none">

        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">إضافة مشروع جديد</CardTitle>
          <CardDescription>املأ تفاصيل المشروع</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="projectName">اسم المشروع</Label>
              <Input id="projectName" name="projectName" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectDescription">وصف المشروع</Label>
              <Textarea id="projectDescription" name="projectDescription" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectType">نوع المشروع</Label>
              <Input id="projectType" name="projectType" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectStatus">حالة المشروع</Label>
              <Select name="projectStatus" required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة المشروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">فكرة</SelectItem>
                  <SelectItem value="prototype">نموذج أولي</SelectItem>
                  <SelectItem value="startup">شركة ناشئة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectGoals">أهداف المشروع</Label>
              <Textarea id="projectGoals" name="projectGoals" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectVision">رؤية المشروع</Label>
              <Textarea id="projectVision" name="projectVision" />
            </div>

            <div className="grid gap-2">
              <Label>الدعم المطلوب</Label>
              <div className="flex flex-col gap-2">
                {["loan", "sponsership", "training"].map(option => (
                  <label key={option} className="flex items-center gap-2">
                    <Checkbox
                      checked={support.includes(option)}
                      onCheckedChange={() => handleCheckboxChange(option)}
                    />
                    {option === "loan" && "قرض"}
                    {option === "sponsership" && "رعاية"}
                    {option === "training" && "تدريب"}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full mt-4 bg-[--brand]" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ المشروع"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
