"use client";
import { useRouter } from "next/navigation";
import BizInfo from "@/components/biz-info";
export default function Page() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <BizInfo />
    </main>
  );
}
